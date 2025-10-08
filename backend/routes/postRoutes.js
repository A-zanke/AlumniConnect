const express = require("express");
const router = express.Router();
const {
  getAllPosts,
  getMyPosts,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  addReaction,
  toggleBookmark,
  getBookmarkedPosts,
  sharePost,
  getPostById,
  getUserConnections,
  searchPosts,
  getTrendingHashtags,
  uploadPostImage,
  uploadPostMedia,
} = require("../controllers/postController");
const { protect } = require("../middleware/authMiddleware");

// Post routes
router.get("/", protect, getAllPosts);
router.get("/my-posts", protect, getMyPosts);
router.get("/bookmarked", protect, getBookmarkedPosts);
router.get("/search", protect, searchPosts);
router.get("/trending/hashtags", protect, getTrendingHashtags);
router.get("/:id", protect, getPostById);
router.post("/", protect, uploadPostMedia, createPost);
router.put("/:id", protect, uploadPostMedia, updatePost);
router.delete("/:id", protect, deletePost);

// Like routes
router.post("/:id/like", protect, toggleLike);

// Reaction routes
router.post("/:id/react", protect, addReaction);

// Bookmark routes
router.post("/:id/bookmark", protect, toggleBookmark);

// Share routes
router.post("/:id/share", protect, sharePost);
router.get("/share/connections", protect, getUserConnections);

// Comment routes
router.get("/:id/comments", protect, getComments);
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

module.exports = router;
