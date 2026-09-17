import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import logger from './logger';

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
          fromName:  saved.smtpFromName || 'MediFind Emergency Network',
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
    fromName: 'MediFind Emergency Network',
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

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from:    `"${cfg.fromName}" <${cfg.user}>`,
      to:      options.to,
      subject: options.subject,
      text:    options.text,
      html:    options.html,
    });
    logger.info(`✅ Email sent to ${options.to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    _transporter = null; // reset so next call gets a fresh one
    logger.error(`❌ Email failed to ${options.to}: ${error.message}`);
    return false;
  }
};
