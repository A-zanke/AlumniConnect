const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Alumni = require('../models/Alumni');

// Protect routes - verify token and set req.user
const protect = async (req, res, next) => {
  let token;

  // Check for token in cookies or authorization header
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (
    req.headers.authorization && 
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Set req.user
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Safe logging for debugging
    console.log('Incoming Request:', req.originalUrl);
    console.log('Route Object:', req.route ? req.route.path : 'Route info not available');

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Admin only middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

// Admin only middleware (alias for consistency)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

// Teacher or alumni only middleware
const teacherOrAlumni = (req, res, next) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'alumni' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized, only teachers and alumni can perform this action' });
  }
};

const auth = (req, res, next) => {
    try {
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            Alumni.findById(decoded.id)
                .select('-password')
                .then(alumni => {
                    if (!alumni) {
                        return res.status(401).json({ message: 'User not found' });
                    }
                    req.alumni = alumni;
                    next();
                })
                .catch(error => {
                    console.error('Auth middleware error:', error);
                    res.status(401).json({ message: 'Authentication failed' });
                });
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
};

module.exports = { protect, admin, adminOnly, teacherOrAlumni, auth };
