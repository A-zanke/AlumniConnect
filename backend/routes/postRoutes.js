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
  uploadPostImage,
} = require("../controllers/postController");
const { protect } = require("../middleware/authMiddleware");

// Post routes
router.get("/", protect, getAllPosts);
router.get("/my-posts", protect, getMyPosts);
router.post("/", protect, uploadPostImage, createPost);
router.put("/:id", protect, uploadPostImage, updatePost);
router.delete("/:id", protect, deletePost);

// Like routes
router.post("/:id/like", protect, toggleLike);

// Comment routes
router.get("/:id/comments", protect, getComments);
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

module.exports = router;
