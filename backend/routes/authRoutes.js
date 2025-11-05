const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const rateLimit = require('express-rate-limit');
const { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getUserProfile, 
  updateUserProfile,
  sendOtp,
  verifyOtp,
  checkUsername,
  sendResetOtp,
  verifyResetOtp,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Rate limiters for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many attempts, please try again after 15 minutes.",
  skipSuccessfulRequests: true,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many OTP requests, please try again after an hour.",
});

// Configure Cloudinary storage for avatar uploads
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'alumni-connect/avatars',
    resource_type: 'image',
    public_id: `avatar_${Date.now()}`,
    overwrite: false,
  }),
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Public routes with rate limiting
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/forgot/send-otp', otpLimiter, sendResetOtp);
router.post('/forgot/verify-otp', authLimiter, verifyResetOtp);
router.post('/forgot/reset', authLimiter, resetPassword);
router.get('/check-username', checkUsername);

// Protected routes
router.post('/logout', protect, logoutUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('avatar'), updateUserProfile);

// Google OAuth callback endpoint
router.post('/google/callback', authLimiter, async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ message: 'No Google credential provided' });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid Google account data' });
    }

    // Check if user exists
    let user = await User.findOne({ email: payload.email });
    
    if (!user) {
      // Create new user if doesn't exist
      const username = payload.email.split('@')[0];
      const existingUsername = await User.findOne({ username });
      
      // If username exists, append a random number
      const finalUsername = existingUsername 
        ? `${username}${Math.floor(Math.random() * 1000)}`
        : username;

      try {
        user = await User.create({
          username: finalUsername,
          email: payload.email,
          name: payload.name,
          password: Math.random().toString(36).slice(-8), // Random password
          avatarUrl: payload.picture,
          role: 'student' // Default role
        });
      } catch (createError) {
        console.error('Error creating user:', createError);
        return res.status(400).json({ 
          message: 'Could not create account. Please try again.' 
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set token in cookie with security flags
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(401).json({ 
      message: 'Google authentication failed. Please try again.' 
    });
  }
});

// Export other routes
module.exports = router;