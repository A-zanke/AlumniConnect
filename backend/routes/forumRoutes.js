const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createPost,
  listPosts,
  getPost,
  toggleUpvotePost,
  addReaction,
  sharePost,
  deletePost,
  createComment,
  toggleUpvoteComment,
  votePoll,
  toggleBookmark,
  getUserConnections,
  reportTarget,
  leaderboard
} = require('../controllers/forumController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, path.join(__dirname, '..', 'uploads')); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `forum_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Posts
router.get('/posts', protect, listPosts);
router.post('/posts', protect, upload.array('media', 5), createPost); // Allow up to 5 files
router.get('/posts/:id', protect, getPost);
router.post('/posts/:id/upvote', protect, toggleUpvotePost);
router.post('/posts/:id/reactions', protect, addReaction); // New reaction endpoint
router.post('/posts/:id/share', protect, sharePost);
router.delete('/posts/:id', protect, deletePost); // Delete endpoint
router.post('/posts/:id/bookmark', protect, toggleBookmark);

// Comments
router.post('/posts/:id/comments', protect, createComment);
router.post('/comments/:commentId/upvote', protect, toggleUpvoteComment);

// Polls
router.post('/posts/:id/poll/vote', protect, votePoll);

// Connections for sharing
router.get('/connections', protect, getUserConnections);

// Report
router.post('/:id/report', protect, reportTarget);

// Leaderboard
router.get('/leaderboard', protect, leaderboard);

module.exports = router;