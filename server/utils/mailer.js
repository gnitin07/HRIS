/* ─────────────────────────────────────────────
   Email Utility — Gmail App Password (Google)

   Setup:
   1. Enable 2-Step Verification on your Google account
   2. Google Account → Security → App passwords
   3. Create app password for "Mail" / "Other (HRMS)"
   4. Put your Gmail in EMAIL_USER and the 16-char app password in EMAIL_PASS
   ───────────────────────────────────────────── */

const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER / EMAIL_PASS not set — emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const transporter = createTransporter();

if (transporter) {
  transporter.verify()
    .then(() => console.log('✅ Gmail email transporter ready'))
    .catch(err => console.error('❌ Gmail email error:', err.message));
}

async function sendEmail(to, subject, html) {
  if (!transporter) {
    console.warn('Email skipped (not configured):', subject);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Devriz HRMS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
}

module.exports = { sendEmail };
