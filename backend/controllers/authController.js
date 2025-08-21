const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public
const registerUser = async (req, res) => {
  try {
    const { username, password, confirmPassword, name, email, role } = req.body;

    // Validate required fields
    if (!username || !password || !confirmPassword || !name || !email) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({ 
        message: userExists.email === email ? 'Email already registered' : 'Username already taken' 
      });
    }

    // Create user
    const user = await User.create({
      username,
      password, // Let model hash it
      name,
      email,
      role: role || 'student', // Default to student if role not provided
    });

    if (user) {
      // Set JWT as cookie
      const token = generateToken(user._id);
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: false, // Always false for localhost
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        token,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc   Auth user & get token
// @route  POST /api/auth/login
// @access Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({ 
      $or: [
        { username },
        { email: username } // Allow login with email too
      ]
    });

    // Check user and password
    if (user && (await user.matchPassword(password))) {
      // Set JWT as cookie
      const token = generateToken(user._id);
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: false, // Always false for localhost
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        token,
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Logout user / clear cookie
// @route  POST /api/auth/logout
// @access Private
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc   Get user profile
// @route  GET /api/auth/profile
// @access Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Update user profile
// @route  PUT /api/auth/profile
// @access Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.bio = req.body.bio || user.bio;
      user.location = req.body.location || user.location;
      user.college = req.body.college || user.college;
      user.specialization = req.body.specialization || user.specialization;
      user.graduationYear = req.body.graduationYear || user.graduationYear;
      user.company = req.body.company || user.company;
      user.position = req.body.position || user.position;
      user.isPrivate = req.body.isPrivate !== undefined ? req.body.isPrivate : user.isPrivate;
      user.skills = req.body.skills || user.skills;
      
      if (req.body.socials) {
        user.socials = {
          ...user.socials,
          ...req.body.socials,
        };
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      if (req.file) {
        user.avatarUrl = `/uploads/${req.file.filename}`;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
        location: updatedUser.location,
        college: updatedUser.college,
        specialization: updatedUser.specialization,
        graduationYear: updatedUser.graduationYear,
        company: updatedUser.company,
        position: updatedUser.position,
        isPrivate: updatedUser.isPrivate,
        skills: updatedUser.skills,
        socials: updatedUser.socials,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
};