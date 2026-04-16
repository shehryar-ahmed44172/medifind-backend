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

/**
 * Send an email via SMTP
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // 1. Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 2. Define email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'MediFind <noreply@medifind.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    // 3. Send email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`Error sending email: ${error.message}`);
    // console.error(error);
    return false;
  }
};
