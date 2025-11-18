const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');

// Optional authentication middleware - sets user if logged in, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

// AI Chatbot endpoint - supports both authenticated and guest users
router.post('/', optionalAuth, chatbotController.chatbotReply);

module.exports = router;
