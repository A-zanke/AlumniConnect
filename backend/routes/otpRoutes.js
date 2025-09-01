// backend/routes/otpRoutes.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Alumni = require('../models/Alumni');

const otpStore = {}; // { email: { otp, expires } }
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Configure your SMTP (Gmail or Mailtrap)
const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: '2c8292ed51cd84',
    pass: 'e741771120ccc0'
  }
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


router.post('/send-otp', async (req, res) => {
  const { identifier } = req.body; // Changed from email to identifier
  if (!identifier) {
    return res.status(400).json({ error: 'Identifier (email or username) is required.' });
  }

  let user;
  // Check if the identifier is an email address
  if (identifier.includes('@')) {
    // Search for the user by email in Student, Teacher, and Alumni models
    user = await Student.findOne({ email: identifier });
    if (!user) {
      user = await Teacher.findOne({ email: identifier });
    }
    if (!user) {
      user = await Alumni.findOne({ email: identifier });
    }
  } else {
    // Search for the user by username in Student, Teacher, and Alumni models
    user = await Student.findOne({ username: identifier });
    if (!user) {
      user = await Teacher.findOne({ username: identifier });
    }
    if (!user) {
      user = await Alumni.findOne({ username: identifier });
    }
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const otp = generateOtp();
  otpStore[identifier] = { otp, expires: Date.now() + OTP_EXPIRY_MS }; // Store OTP with identifier

  try {
    await transporter.sendMail({
      from: 'no-reply@mit.asia',
      to: user.email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`
    });
    res.json({ success: true });
  } catch (err) {
    console.error('OTP send error:', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

router.post('/verify-otp', (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) {
    return res.status(400).json({ error: 'Identifier and OTP are required.' });
  }
  const record = otpStore[identifier];
  if (!record || Date.now() > record.expires) {
    return res.status(400).json({ error: 'OTP expired or not found.' });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP.' });
  }
  delete otpStore[identifier];
  res.json({ success: true });
});

module.exports = router;