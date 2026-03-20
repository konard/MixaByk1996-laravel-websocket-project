const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Email job handler.
 * Payload: { to, subject, text, html }
 */
const emailHandler = async (payload) => {
  const { to, subject, text, html } = payload;

  if (!to || !subject) {
    throw new Error('Email job requires "to" and "subject" in payload');
  }

  logger.debug(`Email handler: sending to ${to}`);

  const info = await getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { messageId: info.messageId, to, subject };
};

// Allow overriding transporter for testing
emailHandler._setTransporter = (t) => { transporter = t; };

module.exports = emailHandler;
