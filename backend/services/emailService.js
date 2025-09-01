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
    }
  });
  return transporter;
}

async function sendOtpEmail({ to, code }) {
  const mailer = getTransporter();
  const appName = process.env.APP_NAME || 'MIT Alumni Connect';
  const fromEmail = process.env.MAIL_FROM || 'no-reply@mit.asia';
  await mailer.sendMail({
    from: `${appName} <${fromEmail}>`,
    to,
    subject: `Your OTP Code: ${code}`,
    text: `Your OTP code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your OTP code is <b>${code}</b>. It expires in 10 minutes.</p>`
  });
}

module.exports = { sendOtpEmail };

