import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import logger from './logger';
import { htmlToText } from './emailTemplate';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/* ── Read active SMTP config: saved settings take priority over .env ──────── */
const SETTINGS_FILE = path.join(process.cwd(), 'platform-settings.json');

function getSmtpConfig() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      // Only use saved config if a gateway was explicitly chosen (not 'env')
      if (saved.emailGateway && saved.emailGateway !== 'env' && saved.smtpHost && saved.smtpUser && saved.smtpPass) {
        return {
          host:      saved.smtpHost,
          port:      Number(saved.smtpPort) || 587,
          secure:    saved.smtpEncryption === 'ssl',
          user:      saved.smtpUser,
          pass:      saved.smtpPass,
          fromName:  saved.smtpFromName || 'MediFind',
        };
      }
    }
  } catch {}
  // Fallback to .env
  return {
    host:     process.env.SMTP_HOST || 'smtp.gmail.com',
    port:     Number(process.env.SMTP_PORT) || 465,
    secure:   Number(process.env.SMTP_PORT) === 465,
    user:     process.env.SMTP_USER || '',
    pass:     process.env.SMTP_PASS || '',
    fromName: 'MediFind',
  };
}

/* ── Build a transporter from any config object ───────────────────────────── */
export function buildTransporter(cfg: { host: string; port: number; secure: boolean; user: string; pass: string }) {
  return nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port,
    secure: cfg.secure,
    auth:   { user: cfg.user, pass: cfg.pass },
    tls:    { rejectUnauthorized: false },
    // Fail fast instead of nodemailer's 2-minute default: callers such as responder
    // approval await the email, and a host that cannot reach the SMTP port left the
    // admin portal on "Processing..." for minutes.
    connectionTimeout: 10_000,
    greetingTimeout:   10_000,
    socketTimeout:     20_000,
  });
}

/* ── Singleton transporter (invalidated when settings change) ─────────────── */
let _transporter: nodemailer.Transporter | null = null;

export function invalidateTransporter() {
  _transporter = null;
}

function getTransporter() {
  if (!_transporter) {
    const cfg = getSmtpConfig();
    _transporter = buildTransporter(cfg);
  }
  return _transporter;
}

/* ── Brevo transactional email over HTTPS ─────────────────────────────────── */
async function sendViaBrevo(options: EmailOptions, fromName: string, senderEmail: string): Promise<boolean> {
  if (!senderEmail) {
    logger.error('❌ Brevo: no sender address (set BREVO_SENDER_EMAIL or SMTP_USER)');
    return false;
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY as string, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: fromName, email: senderEmail },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text || (options.html ? htmlToText(options.html) : undefined),
        headers: { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All' },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    if (!res.ok) {
      logger.error(`❌ Email failed to ${options.to} (Brevo ${res.status}): ${body.slice(0, 200)}`);
      return false;
    }
    logger.info(`✅ Email sent to ${options.to} via Brevo: ${body.slice(0, 80)}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ Email failed to ${options.to} (Brevo): ${error.message}`);
    return false;
  }
}

/* ── Resend over HTTPS ────────────────────────────────────────────────────── */
// Without a verified domain Resend only delivers to the account owner's own address,
// so RESEND_FROM must use a domain verified in Resend to reach other users.
async function sendViaResend(options: EmailOptions, fromName: string): Promise<boolean> {
  const from = process.env.RESEND_FROM || `${fromName} <onboarding@resend.dev>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || (options.html ? htmlToText(options.html) : undefined),
        headers: { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All' },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    if (!res.ok) {
      logger.error(`❌ Email failed to ${options.to} (Resend ${res.status}): ${body.slice(0, 200)}`);
      return false;
    }
    logger.info(`✅ Email sent to ${options.to} via Resend: ${body.slice(0, 80)}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ Email failed to ${options.to} (Resend): ${error.message}`);
    return false;
  }
}

/* ── Send an email ────────────────────────────────────────────────────────── */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const cfg = getSmtpConfig();
  if (!cfg.user || !cfg.pass) {
    logger.warn('SMTP credentials not configured — skipping email send');
    return false;
  }

  // Reserved test domains (RFC 2606, e.g. the demo @medifind.test accounts) cannot receive mail;
  // sending would only bounce back to the sender mailbox.
  if (/@[^@]+\.(test|example|invalid|localhost)$/i.test(options.to.trim())) {
    logger.info(`Email skipped for test address ${options.to}: ${options.subject}`);
    return true;
  }

  // Hosts that block outbound SMTP (Render's free tier blocks ports 465 and 587) send
  // through Brevo's HTTPS API instead. Without BREVO_API_KEY nothing changes: SMTP as before.
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(options, cfg.fromName, process.env.BREVO_SENDER_EMAIL || cfg.user);
  }
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(options, cfg.fromName);
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from:    `"${cfg.fromName}" <${cfg.user}>`,
      to:      options.to,
      subject: options.subject,
      // Spam filters distrust HTML-only mail: always include a plain-text part
      text:    options.text || (options.html ? htmlToText(options.html) : undefined),
      html:    options.html,
      headers: {
        // Automated, transactional mail: no auto-replies (out-of-office) back to the sender
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      },
    });
    logger.info(`✅ Email sent to ${options.to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    _transporter = null; // reset so next call gets a fresh one
    logger.error(`❌ Email failed to ${options.to}: ${error.message}`);
    return false;
  }
};
