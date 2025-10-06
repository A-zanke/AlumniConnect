const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../services/emailService');

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
    const { username, password, confirmPassword, name, email, role, department, year, graduationYear } = req.body;

    // Validate required fields
    if (!username || !password || !confirmPassword || !name || !email) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if username exists (email can repeat)
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Relaxed password policy: at least 6 chars and one number
    const relaxedPasswordPolicy = /^(?=.*\d).{6,}$/;
    if (!relaxedPasswordPolicy.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters and include a number' });
    }

    // Require email verified (registration flow should verify before saving)
    const verifiedOtp = await Otp.findOne({ email, consumed: true }).sort({ createdAt: -1 });
    const isEmailVerified = Boolean(verifiedOtp);
    if (!isEmailVerified) {
      return res.status(400).json({ message: 'Please verify your email via OTP before registration' });
    }

    // Create user
    const user = await User.create({
      username,
      password,
      name,
      email,
      role: (role || 'student').toLowerCase(),
      department,
      year,
      graduationYear,
      emailVerified: isEmailVerified
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
        emailVerified: user.emailVerified,
        department: user.department,
        year: user.year,
        graduationYear: user.graduationYear,
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
    let { username, password } = req.body;

    // If email prefix provided without domain, append @mit.asia
    if (username && !username.includes('@')) {
      // Try username as-is first, then fallback to domain email
    }

    // Find user by username or email
    let user = await User.findOne({ username });
    if (!user) {
      const maybeEmail = username.includes('@') ? username : `${username}@mit.asia`;
      user = await User.findOne({ email: maybeEmail });
    }

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

// Send OTP for registration
const sendOtp = async (req, res) => {
  try {
    const { emailPrefix } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix)) {
      return res.status(400).json({ message: 'Provide email prefix only' });
    }
    const email = `${emailPrefix}@mit.asia`;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({ email, code, purpose: 'registration', expiresAt });
    try {
      await sendOtpEmail({ to: email, code });
    } catch (mailError) {
      console.error('Mail send failed:', mailError?.message || mailError);
    }
    const payload = { success: true };
    if (process.env.NODE_ENV !== 'production') {
      payload.devOtp = code;
      console.log(`DEV ONLY: OTP for ${email} is ${code}`);
    }
    return res.json(payload);
  } catch (error) {
    console.error('sendOtp error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { emailPrefix, code } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix) || !code) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    const email = `${emailPrefix}@mit.asia`;
    const otp = await Otp.findOne({ email, purpose: 'registration', consumed: false }).sort({ createdAt: -1 });

    if (!otp) return res.status(400).json({ message: 'OTP not found' });
    if (otp.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (otp.code !== code) {
      otp.attempts += 1;
      await otp.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    otp.consumed = true;
    await otp.save();
    res.json({ success: true, email });
  } catch (error) {
    console.error('verifyOtp error:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

// Forgot password: send OTP
const sendResetOtp = async (req, res) => {
  try {
    const { emailPrefix } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix)) {
      return res.status(400).json({ message: 'Provide email prefix only' });
    }
    const email = `${emailPrefix}@mit.asia`;

    const existing = await User.findOne({ email });
    if (!existing) return res.status(404).json({ message: 'No account with this email' });

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({ email, code, purpose: 'reset', expiresAt });
    try {
      await sendOtpEmail({ to: email, code });
    } catch (mailError) {
      console.error('Mail send failed:', mailError?.message || mailError);
    }
    const payload = { success: true };
    if (process.env.NODE_ENV !== 'production') {
      payload.devOtp = code;
      console.log(`DEV ONLY: RESET OTP for ${email} is ${code}`);
    }
    return res.json(payload);
  } catch (error) {
    console.error('sendResetOtp error:', error);
    res.status(500).json({ message: 'Failed to send reset OTP' });
  }
};

// Forgot password: verify OTP
const verifyResetOtp = async (req, res) => {
  try {
    const { emailPrefix, code } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix) || !code) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    const email = `${emailPrefix}@mit.asia`;
    const otp = await Otp.findOne({ email, purpose: 'reset', consumed: false }).sort({ createdAt: -1 });

    if (!otp) return res.status(400).json({ message: 'OTP not found' });
    if (otp.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (otp.code !== code) {
      otp.attempts += 1;
      await otp.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    otp.consumed = true;
    await otp.save();
    res.json({ success: true, email });
  } catch (error) {
    console.error('verifyResetOtp error:', error);
    res.status(500).json({ message: 'Failed to verify reset OTP' });
  }
};

// Forgot password: reset
const resetPassword = async (req, res) => {
  try {
    const { emailPrefix, newPassword } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix) || !newPassword) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    const email = `${emailPrefix}@mit.asia`;

    // Ensure the last reset OTP is consumed
    const lastOtp = await Otp.findOne({ email, purpose: 'reset' }).sort({ createdAt: -1 });
    if (!lastOtp || !lastOtp.consumed) {
      return res.status(400).json({ message: 'OTP verification required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Relaxed password policy aligned with registration
    const relaxedPasswordPolicy = /^(?=.*\d).{6,}$/;
    if (!relaxedPasswordPolicy.test(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters and include a number' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// Check username availability
const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ message: 'Username required' });
    const exists = await User.findOne({ username });
    if (!exists) return res.json({ available: true, suggestions: [] });
    const suggestions = [
      `${username}${Math.floor(Math.random() * 90 + 10)}`,
      `${username}_${Math.floor(Math.random() * 900 + 100)}`,
      `${username}${new Date().getFullYear()}`
    ];
    res.json({ available: false, suggestions });
  } catch (error) {
    console.error('checkUsername error:', error);
    res.status(500).json({ message: 'Failed to check username' });
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
    const User = require('../models/User');
    const Student = require('../models/Student');
    const Alumni = require('../models/Alumni');
    
    const user = await User.findById(req.user._id);

    if (user) {
      // Update basic user fields
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

      // Update role-specific fields
      if (user.role === 'student') {
        const studentData = await Student.findOne({ email: user.email });
        if (studentData) {
          // Update student-specific fields
          if (req.body.department) studentData.department = req.body.department;
          if (req.body.year) studentData.year = req.body.year;
          if (req.body.division) studentData.division = req.body.division;
          if (req.body.batch) studentData.batch = req.body.batch;
          if (req.body.rollNumber) studentData.rollNumber = req.body.rollNumber;
          if (req.body.major) studentData.major = req.body.major;
          if (req.body.specialization) studentData.specialization = req.body.specialization;
          if (req.body.projects) studentData.projects = req.body.projects;
          if (req.body.desired_roles) studentData.desired_roles = req.body.desired_roles;
          if (req.body.preferred_industries) studentData.preferred_industries = req.body.preferred_industries;
          if (req.body.higher_studies_interest) studentData.higher_studies_interest = req.body.higher_studies_interest;
          if (req.body.entrepreneurship_interest) studentData.entrepreneurship_interest = req.body.entrepreneurship_interest;
          if (req.body.internships) studentData.internships = req.body.internships;
          if (req.body.hackathons) studentData.hackathons = req.body.hackathons;
          if (req.body.research_papers) studentData.research_papers = req.body.research_papers;
          if (req.body.mentorship_needs) studentData.mentorship_needs = req.body.mentorship_needs;
          if (req.body.preferred_location) studentData.preferred_location = req.body.preferred_location;
          if (req.body.preferred_mode) studentData.preferred_mode = req.body.preferred_mode;
          if (req.body.certifications) studentData.certifications = req.body.certifications;
          if (req.body.achievements) studentData.achievements = req.body.achievements;
          if (req.body.detailed_projects) studentData.detailed_projects = req.body.detailed_projects;
          if (req.body.detailed_internships) studentData.detailed_internships = req.body.detailed_internships;
          
          await studentData.save();
        }
      } else if (user.role === 'alumni') {
        const alumniData = await Alumni.findOne({ email: user.email });
        if (alumniData) {
          // Update alumni-specific fields
          if (req.body.specialization) alumniData.specialization = req.body.specialization;
          if (req.body.higher_studies) alumniData.higher_studies = req.body.higher_studies;
          if (req.body.current_job_title) alumniData.current_job_title = req.body.current_job_title;
          if (req.body.company) alumniData.company = req.body.company;
          if (req.body.industry) alumniData.industry = req.body.industry;
          if (req.body.past_experience) alumniData.past_experience = req.body.past_experience;
          if (req.body.mentorship_interests) alumniData.mentorship_interests = req.body.mentorship_interests;
          if (req.body.preferred_students) alumniData.preferred_students = req.body.preferred_students;
          if (req.body.availability) alumniData.availability = req.body.availability;
          if (req.body.certifications) alumniData.certifications = req.body.certifications;
          if (req.body.publications) alumniData.publications = req.body.publications;
          if (req.body.entrepreneurship) alumniData.entrepreneurship = req.body.entrepreneurship;
          if (req.body.linkedin) alumniData.linkedin = req.body.linkedin;
          if (req.body.github) alumniData.github = req.body.github;
          if (req.body.website) alumniData.website = req.body.website;
          
          await alumniData.save();
        }
      }

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
  sendOtp,
  verifyOtp,
  checkUsername,
  sendResetOtp,
  verifyResetOtp,
  resetPassword,
};