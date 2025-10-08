const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: fileFilter,
});

// Post routes
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
