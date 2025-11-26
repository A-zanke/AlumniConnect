const express = require("express");
const router = express.Router();
const { protect, auth } = require("../middleware/authMiddleware");
const {
  getUserByUsername,
  getFollowing,
  getMutualConnections,
  getMyMutualConnections,
  followUser,
  unfollowUser,
  getSuggestedConnections,
  updatePresence,
  getPresence,
  removeUserAvatar,
  deleteAccount,
} = require("../controllers/userController");
const chatbotController = require("../controllers/chatbotController");

// Public route to get user profile by username
router.get("/username/:username", getUserByUsername);

// Specific routes MUST come before param routes
router.get("/suggested/connections", protect, getSuggestedConnections);
router.get("/mutual/connections", protect, getMyMutualConnections);

// E2EE - Upload/Update public key (MUST be before /:userId route)
router.put("/encryption/public-key", protect, async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey || typeof publicKey !== "string") {
      return res.status(400).json({ message: "Invalid public key" });
    }

    const User = require("../models/User");
    await User.findByIdAndUpdate(req.user._id, { publicKey });

    res.json({ message: "Public key updated successfully" });
  } catch (error) {
    console.error("Error updating public key:", error);
    res.status(500).json({ message: "Error updating public key" });
  }
});

// Get user profile by ID
router.get("/:userId", protect, async (req, res) => {
  try {
    const User = require("../models/User");
    const Student = require("../models/Student");
    const Alumni = require("../models/Alumni");

    const user = await User.findById(req.params.userId)
      .select("-password -connectionRequests")
      .populate("connections", "name username avatarUrl role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get additional profile data based on role
    let additionalData = {};
    if (user.role === "student") {
      additionalData = {
        department: user.department,
        year: user.year,
        graduationYear: user.graduationYear,
        skills: user.skills,
        socials: user.socials,
        careerInterests: user.careerInterests,
        activities: user.activities,
        mentorshipOpen: user.mentorshipOpen,
      };
    } else if (user.role === "alumni") {
      additionalData = {
        department: user.department,
        graduationYear: user.graduationYear,
        degree: user.degree,
        company: user.company,
        position: user.position,
        industry: user.industry,
        skills: user.skills,
        socials: user.socials,
        mentorshipAvailable: user.mentorshipAvailable,
        guidanceAreas: user.guidanceAreas,
      };
    }

    // Merge user data with additional profile data
    const fullProfile = { ...user.toObject(), ...additionalData };
    res.json({ data: fullProfile });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
});

// E2EE - Get user's public key (MUST be before /:userId/connections route)
router.get("/:userId/public-key", protect, async (req, res) => {
  try {
    const User = require("../models/User");
    console.log("Fetching public key for user:", req.params.userId);

    // Validate userId format
    if (!req.params.userId || !req.params.userId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log("Invalid user ID format:", req.params.userId);
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(req.params.userId).select("publicKey");

    if (!user) {
      console.log("User not found:", req.params.userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Public key found for user:", !!user.publicKey);
    res.json({ publicKey: user.publicKey || null });
  } catch (error) {
    console.error("Error fetching public key:", error);
    res.status(500).json({ message: "Error fetching public key" });
  }
});

// Get user connections
router.get("/:userId/connections", protect, async (req, res) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.params.userId)
      .select("connections")
      .populate("connections", "name username avatarUrl role department");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.connections || []);
  } catch (error) {
    console.error("Error fetching user connections:", error);
    res.status(500).json({ message: "Error fetching connections" });
  }
});

// Follow/Unfollow endpoints
router.get("/:userId/following", protect, getFollowing);
router.get("/:userId/mutual", protect, getMutualConnections);
router.post("/:userId/follow", protect, followUser);
router.post("/:userId/unfollow", protect, unfollowUser);

// Presence routes
router.put("/presence", protect, updatePresence);
router.get("/:userId/presence", protect, getPresence);

// AI Chatbot endpoint
router.post("/chatbot", chatbotController.chatbotReply);

// Remove user avatar
router.delete("/remove-avatar", protect, removeUserAvatar);

// Permanently delete user account and all related data
router.delete("/account", protect, deleteAccount);

module.exports = router;
