const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port: Number(process.env.MAILTRAP_PORT || 2525),
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS
    },
    tls: { rejectUnauthorized: false } // helpful on some dev setups
  });
  return transporter;
}

async function sendOtpEmail({ to, code }) {
  const mailer = getTransporter();
  try {
    await mailer.verify();
  } catch (e) {
    console.error('SMTP verify failed:', e?.message || e);
    throw e;
  }

  const appName = process.env.APP_NAME || 'MIT Alumni Connect';
  const fromEmail = process.env.MAIL_FROM || 'no-reply@mit.asia';

  try {
    await mailer.sendMail({
      from: `${appName} <${fromEmail}>`,
      to,
      subject: `Your OTP Code: ${code}`,
      text: `Your OTP code is ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family:sans-serif;font-size:16px">
        <p>Your OTP code is <b style="font-size:20px">${code}</b>.</p>
        <p>It expires in 10 minutes.</p>
      </div>`
    });
  } catch (e) {
    console.error('sendMail failed:', e?.response || e?.message || e);
    throw e;
  }
}
module.exports = { sendOtpEmail };
