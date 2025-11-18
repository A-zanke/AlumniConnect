const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
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
  leaderboard,
  getPollOptionVoters,
  reactToComment,
  getReactionSummary
} = require('../controllers/forumController');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'alumni-connect/forum',
    resource_type: 'auto',
    public_id: `forum_${Date.now()}`,
    overwrite: false,
  }),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Posts
router.get('/posts', protect, listPosts);
router.post('/posts', protect, upload.array('media', 5), createPost); // Allow up to 5 files
router.get('/posts/:id', protect, getPost);
router.post('/posts/:id/upvote', protect, toggleUpvotePost);
router.post('/posts/:id/reactions', protect, addReaction); // New reaction endpoint
router.get('/posts/:id/reactions', protect, getReactionSummary);
router.post('/posts/:id/share', protect, sharePost);
router.delete('/posts/:id', protect, deletePost); // Delete endpoint
router.post('/posts/:id/bookmark', protect, toggleBookmark);

// Comments
router.post('/posts/:id/comments', protect, createComment);
router.post('/comments/:commentId/upvote', protect, toggleUpvoteComment);
router.post('/comments/:commentId/reactions', protect, reactToComment);

// Polls
router.post('/posts/:id/poll/vote', protect, votePoll);
router.get('/posts/:id/poll/:index/voters', protect, getPollOptionVoters);

// Connections for sharing
router.get('/connections', protect, getUserConnections);

// Report
router.post('/:id/report', protect, reportTarget);

// Leaderboard
router.get('/leaderboard', protect, leaderboard);

module.exports = router;