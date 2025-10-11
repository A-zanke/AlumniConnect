const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const {
  getAllPosts,
  getUserPosts,
  createPost,
  deletePost,
  likePost,
  commentOnPost,
  sharePost,
  reactToPost,
  replyToComment,
  updatePost,
  toggleBookmark,
  getSavedPosts,
} = require("../controllers/postsController");
const { protect } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");

// Configure multer for Cloudinary uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "alumni-connect/posts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "mp4", "mov", "avi"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Post routes
// Make posts feed visible to all authenticated users including admin
router.get("/", protect, getAllPosts);
router.get("/user/:userId", protect, getUserPosts);
router.post(
  "/",
  protect,
  roleMiddleware(["teacher", "alumni", "admin"]),
  upload.array("media", 5),
  createPost
);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);

// Reaction routes (LinkedIn-style)
router.post("/:id/react", protect, reactToPost);

// Like routes (backward compatibility)
router.post("/:id/like", protect, likePost);

// Comment routes
router.post("/:id/comment", protect, commentOnPost);
router.post("/:id/comment/:commentId/reply", protect, replyToComment);

// Share routes
router.post("/:id/share", protect, sharePost);

// Bookmark routes
router.post("/:id/bookmark", protect, toggleBookmark);
router.get("/saved/mine", protect, getSavedPosts);

module.exports = router;
