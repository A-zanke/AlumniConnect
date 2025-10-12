const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const { sendOtpEmail, sendWelcomeEmail } = require("../services/emailService");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

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

    // Create user in User collection
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

    // Also create in respective role collection (best-effort; do not fail registration on error)
    try {
      if (roleLower === "student") {
        const Student = require("../models/Student");
        const Department = require("../models/Department");
        let departmentId;
        if (department) {
          let dep =
            (await Department.findOne({ code: department })) ||
            (await Department.findOne({ name: department }));
          if (!dep) {
            // Create department if missing; store provided string as both code and name for simplicity
            dep = await Department.create({
              code: String(department),
              name: String(department),
            });
          }
          departmentId = dep._id;
        }
        await Student.create({
          _id: user._id,
          name,
          username: finalUsername,
          email,
          password: user.password,
          department: departmentId,
          year,
          graduationYear,
          emailVerified: finalEmailVerified,
        });
      } else if (roleLower === "alumni") {
        const Alumni = require("../models/Alumni");
        await Alumni.create({
          _id: user._id,
          name,
          username: finalUsername,
          email,
          password: user.password,
          graduationYear,
          emailVerified: finalEmailVerified,
        });
      } else if (roleLower === "teacher") {
        const Teacher = require("../models/Teacher");
        const Department = require("../models/Department");
        let departmentId;
        if (department) {
          let dep =
            (await Department.findOne({ code: department })) ||
            (await Department.findOne({ name: department }));
          if (!dep) {
            dep = await Department.create({
              code: String(department),
              name: String(department),
            });
          }
          departmentId = dep._id;
        }
        await Teacher.create({
          _id: user._id,
          name,
          username: finalUsername,
          email,
          password: user.password,
          department: departmentId,
          emailVerified: finalEmailVerified,
        });
      } else if (roleLower === "admin") {
        const Admin = require("../models/Admin");
        await Admin.create({
          _id: user._id,
          name,
          username: finalUsername,
          email,
          password: user.password,
          emailVerified: finalEmailVerified,
        });
      }
    } catch (e) {
      console.error("Role profile creation failed:", e?.message || e);
    }

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
      // Set JWT as cookie
      const token = generateToken(user._id);
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: false, // Always false for localhost
        sameSite: "lax",
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
      // Set JWT as cookie
      const token = generateToken(user._id);
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: false, // Always false for localhost
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({
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
      });
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
    const { emailPrefix, newPassword } = req.body;
    if (!emailPrefix || /@/.test(emailPrefix) || !newPassword) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const email = `${emailPrefix}@mit.asia`;

    // Ensure the last reset OTP is consumed
    const lastOtp = await Otp.findOne({ email, purpose: "reset" }).sort({
      createdAt: -1,
    });
    if (!lastOtp || !lastOtp.consumed) {
      return res.status(400).json({ message: "OTP verification required" });
    }

    const user = await User.findOne({ email });
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
      res.json(user);
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
    const User = require("../models/User");
    const Student = require("../models/Student");
    const Alumni = require("../models/Alumni");

    const user = await User.findById(req.user._id);

    if (user) {
      // Update basic user fields
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.bio = req.body.bio ?? user.bio;

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
        user.avatarUrl = `/uploads/${req.file.filename}`;
      }

      const updatedUser = await user.save();

      // Update role-specific fields
      if (user.role === "student") {
        const studentData = await Student.findOne({ email: user.email });
        if (studentData) {
          if (req.body.department) {
            const Department = require("../models/Department");
            let dep =
              (await Department.findOne({ code: req.body.department })) ||
              (await Department.findOne({ name: req.body.department }));
            if (!dep) {
              dep = await Department.create({
                code: String(req.body.department),
                name: String(req.body.department),
              });
            }
            studentData.department = dep._id;
          }
          if (req.body.year) studentData.year = req.body.year;
          if (req.body.graduationYear)
            studentData.graduationYear = req.body.graduationYear;
          if (req.body.skills) studentData.skills = req.body.skills;
          if (req.body.bio) studentData.bio = req.body.bio;
          if (req.body.careerInterests)
            studentData.careerInterests = req.body.careerInterests;
          if (req.body.activities) studentData.activities = req.body.activities;
          if (req.body.socials)
            studentData.socials = {
              ...studentData.socials,
              ...req.body.socials,
            };
          if (req.body.mentorshipOpen !== undefined)
            studentData.mentorshipOpen = req.body.mentorshipOpen;
          await studentData.save();
        }
      } else if (user.role === "alumni") {
        const alumniData = await Alumni.findOne({ email: user.email });
        if (alumniData) {
          // Keep Alumni collection in sync for legacy consumers; core fields already on User
          if (req.body.bio) alumniData.bio = req.body.bio;
          if (req.body.company) alumniData.company = req.body.company;
          if (req.body.position) alumniData.position = req.body.position;
          if (req.body.industry) alumniData.industry = req.body.industry;
          if (req.body.graduationYear)
            alumniData.graduationYear = req.body.graduationYear;
          if (req.body.degree) alumniData.degree = req.body.degree;
          if (req.body.skills) alumniData.skills = req.body.skills;
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
