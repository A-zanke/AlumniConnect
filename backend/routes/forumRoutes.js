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
  createComment,
  toggleUpvoteComment,
  votePoll,
  toggleBookmark,
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
const upload = multer({ storage });

router.get('/posts', protect, listPosts);
router.post('/posts', protect, upload.single('media'), createPost);
router.get('/posts/:id', protect, getPost);
router.post('/posts/:id/upvote', protect, toggleUpvotePost);
router.post('/posts/:id/bookmark', protect, toggleBookmark);

// comments
router.post('/posts/:id/comments', protect, createComment);
router.post('/comments/:commentId/upvote', protect, toggleUpvoteComment);

// polls
router.post('/posts/:id/poll/vote', protect, votePoll);

// report
router.post('/:id/report', protect, reportTarget);

// leaderboard
router.get('/leaderboard', protect, leaderboard);

module.exports = router;