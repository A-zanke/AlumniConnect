const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const { sendOtpEmail, sendWelcomeEmail } = require("../services/emailService");
const { generateRSAKeyPair, pemToCompact } = require("../services/encryptionService");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Ensure user has encryption keys
async function ensureEncryptionKeys(userId, options = {}) {
  const forceRegenerate = options.forceRegenerate === true;
  try {
    const user = await User.findById(userId).select('publicKey publicKeyVersion publicKeyGeneratedAt');

    if (!user) {
      console.warn(`⚠️ Cannot generate encryption keys - user ${userId} not found`);
      return null;
    }

    // If user already has a public key and regeneration not requested, skip
    if (!forceRegenerate && user.publicKey) {
      return null;
    }

    // Calculate new version number
    let newVersion;
    if (user.publicKeyVersion) {
      newVersion = user.publicKeyVersion + 1;
    } else {
      newVersion = 1;
    }

    console.log(`${forceRegenerate ? '♻️ Regenerating' : '🔐 Generating'} encryption keys v${newVersion} for user: ${userId}`);

    // Generate new RSA key pair using node-forge
    const { publicKey, privateKey } = generateRSAKeyPair();
    
    // Store only public key in database (compact format to save space)
    const compactPublicKey = pemToCompact(publicKey);
    await User.findByIdAndUpdate(userId, { publicKey: compactPublicKey, publicKeyVersion: newVersion, publicKeyGeneratedAt: new Date() });
    
    console.log(`✅ Encryption keys ${forceRegenerate ? 'regenerated' : 'generated'} v${newVersion} for user: ${userId}`);
    
    // Return private key to be sent to client (only once, never stored on server)
    return { publicKey: compactPublicKey, privateKey, publicKeyVersion: newVersion };
  } catch (error) {
    console.error(`❌ Error generating encryption keys for user ${userId}:`, error.message);
    // Don't fail the registration/login if key generation fails
    return null;
  }
}

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public
const registerUser = async (req, res) => {
  try {
    const {
      username,
      password,
      confirmPassword,
      name,
      email,
      role,
      department,
      year,
      graduationYear,
    } = req.body;

    const roleLower = (role || "student").toLowerCase();

    // For alumni, generate password and username if not provided
    let finalPassword = password;
    let finalUsername = username;
    if (roleLower === "alumni") {
      if (!finalPassword) {
        finalPassword = crypto.randomBytes(4).toString('hex');
      }
      if (!finalUsername) {
        finalUsername = email.split('@')[0];
      }
    }

    // Validate required fields
    if (!finalUsername || !finalPassword || !name || !email) {
      return res
        .status(400)
        .json({ message: "Please fill in all required fields" });
    }

    // Check if passwords match (only if confirmPassword provided)
    if (confirmPassword && finalPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if username exists (email can repeat)
    const userExists = await User.findOne({ username: finalUsername });

    if (userExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Relaxed password validation: accept common passwords but require minimum length
    const acceptablePassword = /^.{6,}$/;
    if (!acceptablePassword.test(finalPassword)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Check email verification via OTP if available; proceed even if not verified
    const verifiedOtp = await Otp.findOne({ email, consumed: true }).sort({
      createdAt: -1,
    });
    const isEmailVerified = Boolean(verifiedOtp);

    // For alumni, set emailVerified based on graduationYear
    let finalEmailVerified = isEmailVerified;
    if (roleLower === "alumni") {
      finalEmailVerified = graduationYear < 2025;
    }

    // Create user in User collection only (single collection architecture)
    const user = await User.create({
      username: finalUsername,
      password: finalPassword,
      name,
      email,
      role: roleLower,
      department,
      year,
      graduationYear,
      emailVerified: finalEmailVerified,
    });

    console.log(`✅ User created in main collection with role: ${roleLower}`);

    // For alumni, send welcome email
    if (roleLower === "alumni") {
      try {
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/login';
        await sendWelcomeEmail({ to: email, password: finalPassword, loginUrl });
      } catch (emailError) {
        console.error("Welcome email send failed:", emailError?.message || emailError);
        // Do not fail registration on email error
      }
    }

    if (user) {
      // Generate encryption keys for the new user
      const keys = await ensureEncryptionKeys(user._id);
      
      // Set JWT as cookie
      const token = generateToken(user._id);
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: false, // Always false for localhost
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      const response = {
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
      };
      
      // Include private key in response (only sent once during registration)
      if (keys && keys.privateKey) {
        response.encryptionKeys = {
          publicKey: keys.publicKey,
          privateKey: keys.privateKey
        };
      }
      
      res.status(201).json(response);
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
    if (username && !username.includes("@")) {
      // Try username as-is first, then fallback to domain email
    }

    // Find user by username or email
    let user = await User.findOne({ username });
    if (!user) {
      const maybeEmail = username.includes("@")
        ? username
        : `${username}@mit.asia`;
      user = await User.findOne({ email: maybeEmail });
    }

    // Check user and password
    if (user && (await user.matchPassword(password))) {
      // Ensure user has encryption keys and get them if newly generated
      const keys = await ensureEncryptionKeys(user._id);
      
      // Set JWT as cookie
      const token = generateToken(user._id);
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: false, // Always false for localhost
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      const response = {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        department: user.department,
        year: user.year,
        graduationYear: user.graduationYear,
        token,
      };
      
      // Include private key in response if newly generated
      if (keys && keys.privateKey) {
        response.encryptionKeys = {
          publicKey: keys.publicKey,
          privateKey: keys.privateKey
        };
      }

      res.json(response);
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send OTP for registration
const sendOtp = async (req, res) => {
  try {
    const { emailPrefix } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix)) {
      return res.status(400).json({ message: "Provide email prefix only" });
    }
    const email = `${emailPrefix}@mit.asia`;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({ email, code, purpose: "registration", expiresAt });
    try {
      await sendOtpEmail({ to: email, code });
    } catch (mailError) {
      console.error("Mail send failed:", mailError?.message || mailError);
    }
    const payload = { success: true };
    if (process.env.NODE_ENV !== "production") {
      payload.devOtp = code;
      console.log(`DEV ONLY: OTP for ${email} is ${code}`);
    }
    return res.json(payload);
  } catch (error) {
    console.error("sendOtp error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { emailPrefix, code } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix) || !code) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const email = `${emailPrefix}@mit.asia`;
    const otp = await Otp.findOne({
      email,
      purpose: "registration",
      consumed: false,
    }).sort({ createdAt: -1 });

    if (!otp) return res.status(400).json({ message: "OTP not found" });
    if (otp.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });
    if (otp.code !== code) {
      otp.attempts += 1;
      await otp.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }
    otp.consumed = true;
    await otp.save();
    res.json({ success: true, email });
  } catch (error) {
    console.error("verifyOtp error:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};

// Forgot password: send OTP
const sendResetOtp = async (req, res) => {
  try {
    const { emailPrefix } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix)) {
      return res.status(400).json({ message: "Provide email prefix only" });
    }
    const email = `${emailPrefix}@mit.asia`;

    const existing = await User.findOne({ email });
    if (!existing)
      return res.status(404).json({ message: "No account with this email" });

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({ email, code, purpose: "reset", expiresAt });
    try {
      await sendOtpEmail({ to: email, code });
    } catch (mailError) {
      console.error("Mail send failed:", mailError?.message || mailError);
    }
    const payload = { success: true };
    if (process.env.NODE_ENV !== "production") {
      payload.devOtp = code;
      console.log(`DEV ONLY: RESET OTP for ${email} is ${code}`);
    }
    return res.json(payload);
  } catch (error) {
    console.error("sendResetOtp error:", error);
    res.status(500).json({ message: "Failed to send reset OTP" });
  }
};

// Forgot password: verify OTP
const verifyResetOtp = async (req, res) => {
  try {
    const { emailPrefix, code } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix) || !code) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const email = `${emailPrefix}@mit.asia`;
    const otp = await Otp.findOne({
      email,
      purpose: "reset",
      consumed: false,
    }).sort({ createdAt: -1 });

    if (!otp) return res.status(400).json({ message: "OTP not found" });
    if (otp.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });
    if (otp.code !== code) {
      otp.attempts += 1;
      await otp.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }
    otp.consumed = true;
    await otp.save();
    res.json({ success: true, email });
  } catch (error) {
    console.error("verifyResetOtp error:", error);
    res.status(500).json({ message: "Failed to verify reset OTP" });
  }
};

// Forgot password: reset
const resetPassword = async (req, res) => {
  try {
    const { emailPrefix, newPassword, email: directEmail, usePersonalEmail } = req.body;
    
    let email;
    if (usePersonalEmail || directEmail) {
      // Personal email case
      email = directEmail || emailPrefix;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email required" });
      }
    } else {
      // College email case
      if (!emailPrefix || /@/.test(emailPrefix)) {
        return res.status(400).json({ message: "Invalid email prefix" });
      }
      email = `${emailPrefix}@mit.asia`;
    }

    if (!newPassword) {
      return res.status(400).json({ message: "Password required" });
    }

    // Ensure the last OTP is consumed (either reset or registration purpose)
    const lastOtp = await Otp.findOne({ 
      email: email.toLowerCase(), 
      purpose: usePersonalEmail ? 'registration' : 'reset' 
    }).sort({ createdAt: -1 });
    
    if (!lastOtp || !lastOtp.consumed) {
      return res.status(400).json({ message: "OTP verification required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Relaxed password validation for reset as well
    const acceptablePassword = /^.{6,}$/;
    if (!acceptablePassword.test(newPassword)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("resetPassword error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

// Check username availability
const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username)
      return res.status(400).json({ message: "Username required" });
    const exists = await User.findOne({ username });
    if (!exists) return res.json({ available: true, suggestions: [] });
    const suggestions = [
      `${username}${Math.floor(Math.random() * 90 + 10)}`,
      `${username}_${Math.floor(Math.random() * 900 + 100)}`,
      `${username}${new Date().getFullYear()}`,
    ];
    res.json({ available: false, suggestions });
  } catch (error) {
    console.error("checkUsername error:", error);
    res.status(500).json({ message: "Failed to check username" });
  }
};

// @desc   Logout user / clear cookie
// @route  POST /api/auth/logout
// @access Private
const logoutUser = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// @desc   Get user profile
// @route  GET /api/auth/profile
// @access Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (user) {
      const response = user.toObject();
      
      const forceRegenerate = String(req.query?.regenerateKeys || '').toLowerCase() === 'true';
      // Ensure user has encryption keys and include private key if newly generated/regenerated
      const keys = await ensureEncryptionKeys(user._id, { forceRegenerate });
      if (keys && keys.privateKey) {
        response.encryptionKeys = {
          publicKey: keys.publicKey,
          privateKey: keys.privateKey
        };
      }
      
      res.json(response);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Update user profile
// @route  PUT /api/auth/profile
// @access Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Update all user fields in the single User collection
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.bio = req.body.bio ?? user.bio;
      user.avatarUrl = req.body.avatarUrl ?? user.avatarUrl;
      user.location = req.body.location ?? user.location;
      user.college = req.body.college ?? user.college;
      user.specialization = req.body.specialization ?? user.specialization;

      // For alumni, department and graduationYear are set during registration and cannot be edited
      if (user.role !== "alumni") {
        user.graduationYear = req.body.graduationYear ?? user.graduationYear;
        user.department = req.body.department ?? user.department;
      }

      user.year = req.body.year ?? user.year;
      user.skills = req.body.skills ?? user.skills;
      user.degree = req.body.degree ?? user.degree; // alumni degree
      user.company = req.body.company ?? user.company;
      user.position = req.body.position ?? user.position;
      user.industry = req.body.industry ?? user.industry;

      // Student- and Alumni-normalized fields stored on User
      user.careerInterests = req.body.careerInterests ?? user.careerInterests;
      user.activities = req.body.activities ?? user.activities;
      user.mentorshipOpen = req.body.mentorshipOpen ?? user.mentorshipOpen;
      user.mentorshipAvailable =
        req.body.mentorshipAvailable ?? user.mentorshipAvailable; // alumni boolean
      user.guidanceAreas = req.body.guidanceAreas ?? user.guidanceAreas; // alumni guidance topics
      user.phoneNumber = req.body.phoneNumber ?? user.phoneNumber;
      // Keep phoneVerified if someone tries to send false; only backend should set true upon OTP verify
      if (req.body.profileVisibility)
        user.profileVisibility = req.body.profileVisibility;
      if (req.body.personalVisibility)
        user.personalVisibility = req.body.personalVisibility;

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
        // When using Cloudinary storage, req.file.path is the secure URL
        user.avatarUrl = req.file.path || req.file.secure_url || user.avatarUrl;
      }

      const updatedUser = await user.save();

      console.log(`✅ User profile updated in main collection for role: ${user.role}`);

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
        department: updatedUser.department,
        year: updatedUser.year,
        graduationYear: updatedUser.graduationYear,
        degree: updatedUser.degree,
        company: updatedUser.company,
        position: updatedUser.position,
        industry: updatedUser.industry,
        skills: updatedUser.skills,
        socials: updatedUser.socials,
        careerInterests: updatedUser.careerInterests,
        activities: updatedUser.activities,
        mentorshipOpen: updatedUser.mentorshipOpen,
        mentorshipAvailable: updatedUser.mentorshipAvailable,
        guidanceAreas: updatedUser.guidanceAreas,
        phoneNumber: updatedUser.phoneNumber,
        phoneVerified: updatedUser.phoneVerified,
        profileVisibility: updatedUser.profileVisibility,
        personalVisibility: updatedUser.personalVisibility,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send OTP to personal email (for alumni)
const sendPersonalEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP using email field (matching Otp model schema)
    await Otp.findOneAndUpdate(
      { email: email.toLowerCase(), purpose: 'registration' },
      { code, expiresAt, consumed: false },
      { upsert: true, new: true }
    );

    // Send OTP email to the user's personal email
    try {
      await sendOtpEmail({ to: email, code });
      console.log(`✅ OTP sent to personal email: ${email}`);
    } catch (mailError) {
      console.error('Mail send failed:', mailError?.message || mailError);
    }

    const payload = { success: true, message: 'OTP sent to your email' };
    if (process.env.NODE_ENV !== 'production') {
      payload.devOtp = code;
      console.log(`DEV ONLY: OTP for ${email} is ${code}`);
    }
    res.json(payload);
  } catch (error) {
    console.error('Send personal email OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// Verify personal email OTP (for alumni)
const verifyPersonalEmailOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and OTP required' });
    }

    const otpRecord = await Otp.findOne({ 
      email: email.toLowerCase(), 
      purpose: 'registration' 
    }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    if (otpRecord.code !== code.trim()) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Mark as consumed
    otpRecord.consumed = true;
    await otpRecord.save();

    res.json({ message: 'Email verified successfully', email });
  } catch (error) {
    console.error('Verify personal email OTP error:', error);
    res.status(500).json({ message: 'OTP verification failed' });
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
  sendPersonalEmailOtp,
  verifyPersonalEmailOtp,
};