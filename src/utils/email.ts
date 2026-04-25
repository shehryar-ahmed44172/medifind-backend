import nodemailer from 'nodemailer';
import logger from './logger';

/**
 * Interface for email options
 */
export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Re-use a single transporter — avoids creating a new TCP connection per email
const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465, // true for port 465 (SSL)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Required for Gmail in some local/dev environments
      rejectUnauthorized: false,
    },
  });

let _transporter: nodemailer.Transporter | null = null;
const getTransporter = () => {
  if (!_transporter) _transporter = createTransporter();
  return _transporter;
};

/**
 * Send an email via SMTP
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('SMTP credentials not configured — skipping email send');
    return false;
  }

  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'MediFind <noreply@medifind.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Email sent to ${options.to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    // Reset transporter on auth/connection failure so next call gets a fresh one
    _transporter = null;
    logger.error(`❌ Email failed to ${options.to}: ${error.message} (code: ${error.code || 'unknown'})`);
    return false;
  }
};
