const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  getAllPosts,
  getFeed,
  getPostById,
  createPost,
  reactToPost,
  likePost,
  sharePost,
  commentOnPost,
  updateComment,
  deleteComment,
  deletePost,
  getUserPosts,
  toggleBookmark,
  getSavedPosts,
  savePost,
  unsavePost,
  getUserSavedPosts,
  softDeletePost,
  updatePost,
} = require("../controllers/postsController");
const { protect } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Configure multer for Cloudinary uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "alumni-connect/posts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "mp4", "mov", "avi", "webp"],
    resource_type: "auto", // Automatically detect image or video
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit per file
});

// --- POST ROUTES ---

// GET /api/posts - Main feed
router.get("/", protect, getAllPosts);
// GET /api/posts/feed - Alias
router.get("/feed", protect, getFeed);
// GET /api/posts/:id - Single post
router.get("/:id", protect, getPostById);

// POST /api/posts - Create a new post
router.post(
  "/",
  protect,
  roleMiddleware(["teacher", "alumni", "admin", "student"]),
  upload.array("media", 5), // 'media' is the field name, limit to 5 files
  [
    check("content", "Content can be up to 3000 characters")
      .optional()
      .isLength({ max: 3000 }),
  ],
  createPost
);

// GET /api/posts/user/:userId - Get all posts for a specific user
router.get("/user/:userId", protect, getUserPosts);

// GET /api/posts/saved/mine - Get all posts bookmarked by the current user
router.get("/saved/mine", protect, getSavedPosts);
// GET /api/users/:userId/saved-posts - Get user's saved posts
router.get("/user/:userId/saved", protect, getUserSavedPosts);

// POST /api/posts/:id/react - Add or update a reaction on a post
router.post("/:id/react", protect, reactToPost);
// PUT /api/posts/:id/like - Simple like toggle (compat)
router.put("/:id/like", protect, likePost);
// POST /api/posts/:id/share - Share a post
router.post("/:id/share", protect, sharePost);
// POST /api/posts/:id/save - Save
router.post("/:id/save", protect, savePost);
// DELETE /api/posts/:id/save - Unsave
router.delete("/:id/save", protect, unsavePost);

// POST /api/posts/:id/comment - Add a comment to a post
router.post(
  "/:id/comment",
  protect,
  [check("content", "Comment cannot be empty").not().isEmpty().trim().escape()],
  commentOnPost
);
// PATCH /api/posts/:id/comments/:commentId - Edit comment
router.patch("/:id/comments/:commentId", protect, updateComment);
// DELETE /api/posts/:id/comments/:commentId - Delete comment
router.delete("/:id/comments/:commentId", protect, deleteComment);

// POST /api/posts/:id/bookmark - Toggle bookmark on a post
router.post("/:id/bookmark", protect, toggleBookmark);

// PUT /api/posts/:id - Update an existing post
router.put(
  "/:id",
  protect,
  [check("content", "Content cannot be empty").not().isEmpty().trim().escape()],
  updatePost
);

// DELETE /api/posts/:id - Soft delete a post
router.delete("/:id", protect, softDeletePost);

module.exports = router;
