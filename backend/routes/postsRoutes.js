const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { 
  getUserPosts, 
  createPost, 
  getAllPosts, 
  likePost, 
  commentOnPost, 
  sharePost, 
  deletePost 
} = require('../controllers/postsController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|ogg|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Routes
router.get('/', protect, getAllPosts);
router.get('/user/:userId', protect, getUserPosts);

// Only Teacher, Alumni, Admin can create posts
router.post('/', protect, roleMiddleware('teacher', 'alumni', 'admin'), upload.array('media', 5), createPost);

// Post interactions
router.post('/:id/like', protect, likePost);
router.post('/:id/comment', protect, commentOnPost);
router.post('/:id/share', protect, sharePost);

// Delete post (owner or admin only)
router.delete('/:id', protect, deletePost);

module.exports = router;