import nodemailer from 'nodemailer';
import { config } from '../../../config/index.js';

let transport;

function getTransport() {
  if (transport !== undefined) return transport;

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    transport = null;
    return transport;
  }

  transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  return transport;
}

export async function sendVerificationCodeEmail({ to, code, actionLabel }) {
  const mailTransport = getTransport();
  if (!mailTransport) {
    console.log(`[MAIL-FALLBACK] ${actionLabel} code for ${to}: ${code}`);
    return { sent: false };
  }

  await mailTransport.sendMail({
    from: config.smtpFrom,
    to,
    subject: `goHiking ${actionLabel} verification code`,
    text: `Your goHiking ${actionLabel} code is ${code}. It expires in ${config.authCodeExpiresMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>goHiking ${actionLabel}</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>This code expires in ${config.authCodeExpiresMinutes} minutes.</p>
      </div>
    `,
  });

  return { sent: true };
}
