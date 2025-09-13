const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  addReaction,
  createComment,
  addCommentReaction,
  votePoll,
  deletePost,
  deleteComment
} = require('../controllers/unifiedForumController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `unified_forum_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});

// File filter for media uploads
const fileFilter = (req, file, cb) => {
  // Allow images, videos, and documents
  if (file.mimetype.startsWith('image/') || 
      file.mimetype.startsWith('video/') || 
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// Post routes
router.get('/posts', protect, getPosts);
router.post('/posts', protect, upload.array('mediaAttachments', 5), createPost);
router.get('/posts/:id', protect, getPost);
router.put('/posts/:id', protect, updatePost);
router.delete('/posts/:id', protect, deletePost);

// Post interactions
router.post('/posts/:id/reactions', protect, addReaction);
router.post('/posts/:id/poll/vote', protect, votePoll);

// Comment routes
router.post('/posts/:id/comments', protect, upload.array('mediaAttachments', 3), createComment);
router.post('/comments/:commentId/reactions', protect, addCommentReaction);
router.delete('/comments/:commentId', protect, deleteComment);

module.exports = router;
