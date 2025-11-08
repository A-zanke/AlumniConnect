const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  
  // Use Brevo SMTP credentials 
  const smtpHost = process.env.SMTP_HOST || process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = Number(process.env.SMTP_PORT || process.env.MAILTRAP_PORT || 2525);
  const smtpUser = process.env.SMTP_USER || process.env.MAILTRAP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.MAILTRAP_PASS;
  
  if (!smtpUser || !smtpPass) {
    console.warn('⚠️ SMTP credentials not configured. Emails will not be sent.');
  }
  
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for port 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: { 
      rejectUnauthorized: false // helpful on some dev setups
    }
  });
  
  console.log(`📧 Email transporter configured: ${smtpHost}:${smtpPort}`);
  return transporter;
}

async function sendOtpEmail({ to, code }) {
  const mailer = getTransporter();
  
  console.log(`📧 Attempting to send OTP to: ${to}`);
  
  try {
    await mailer.verify();
    console.log('✅ SMTP connection verified');
  } catch (e) {
    console.error('❌ SMTP verify failed:', e?.message || e);
    console.error('Full error:', e);
    throw new Error(`SMTP verification failed: ${e?.message}`);
  }

  const appName = process.env.FROM_NAME || process.env.APP_NAME || 'MIT Alumni Connect';
  const fromEmail = process.env.FROM_EMAIL || process.env.MAIL_FROM || 'no-reply@mit.asia';

  try {
    const info = await mailer.sendMail({
      from: `${appName} <${fromEmail}>`,
      to,
      subject: `Your OTP Code: ${code}`,
      text: `Your OTP code is ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family:sans-serif;font-size:16px">
        <p>Your OTP code is <b style="font-size:20px">${code}</b>.</p>
        <p>It expires in 10 minutes.</p>
      </div>`
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    return info;
  } catch (e) {
    console.error('❌ sendMail failed:', e?.response || e?.message || e);
    console.error('Full error:', e);
    throw new Error(`Failed to send email: ${e?.message}`);
  }
}

async function sendWelcomeEmail({ to, password, loginUrl }) {
  const mailer = getTransporter();
  try {
    await mailer.verify();
  } catch (e) {
    console.error('SMTP verify failed:', e?.message || e);
    throw e;
  }

  const appName = process.env.FROM_NAME || process.env.APP_NAME || 'MIT Alumni Connect';
  const fromEmail = process.env.FROM_EMAIL || process.env.MAIL_FROM || 'no-reply@mit.asia';

  try {
    await mailer.sendMail({
      from: `${appName} <${fromEmail}>`,
      to,
      subject: `Welcome to ${appName} - Your Account Details`,
      text: `Welcome to ${appName}!\n\nYour account has been created successfully.\n\nTemporary Password: ${password}\n\nLogin URL: ${loginUrl}\n\nPlease change your password after logging in.\n\nBest regards,\n${appName} Team`,
      html: `<div style="font-family:sans-serif;font-size:16px">
        <h2>Welcome to ${appName}!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
        <p><a href="${loginUrl}">Click here to login</a></p>
        <p>Please change your password after logging in for security.</p>
        <p>Best regards,<br>${appName} Team</p>
      </div>`
    });
  } catch (e) {
    console.error('sendMail failed:', e?.response || e?.message || e);
    throw e;
  }
}

module.exports = { sendOtpEmail, sendWelcomeEmail };
