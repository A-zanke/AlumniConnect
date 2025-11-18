const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Alumni = require('../models/Alumni');

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set();

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

  // Check if token is blacklisted
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: 'Token has been revoked' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ message: 'Token expired' });
    }

    // Set req.user
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Attach token to request for potential blacklisting
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
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

// Function to blacklist token (call on logout)
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  // Auto-remove after 30 days
  setTimeout(() => tokenBlacklist.delete(token), 30 * 24 * 60 * 60 * 1000);
};

module.exports = { protect, admin, adminOnly, teacherOrAlumni, auth, blacklistToken };
