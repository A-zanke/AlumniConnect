require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { registerUser } = require('../controllers/authController');

(async () => {
  try {
    await connectDB();

    // Cleanup any previous test data
    await User.deleteOne({ username: 'testuser' });
    await Otp.deleteMany({ email: 'testuser@mit.asia' });

    // Seed OTP as verified
    const email = 'testuser@mit.asia';
    await Otp.create({ email, code: '123456', purpose: 'registration', expiresAt: new Date(Date.now()+600000), consumed: true });

    // Mock req/res
    const req = {
      body: {
        username: 'testuser',
        password: 'abc123',
        confirmPassword: 'abc123',
        name: 'Test User',
        email,
        role: 'student',
        department: 'CSE',
        year: 2,
        graduationYear: 2027
      },
      cookies: {},
    };

    const res = {
      statusCode: 200,
      headers: {},
      cookies: {},
      status(code) { this.statusCode = code; return this; },
      cookie(name, value) { this.cookies[name] = value; },
      json(payload) {
        console.log('Response', this.statusCode, payload && Object.keys(payload));
        if (payload && payload._id) { console.log('Registered user id', payload._id); }
      }
    };

    await registerUser(req, res);

    const saved = await User.findOne({ username: 'testuser' });
    if (!saved) throw new Error('User not found after registration');
    if (!saved.password || saved.password.length < 20) throw new Error('Password not hashed');
    console.log('User saved with hashed password length', saved.password.length);
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
})();
