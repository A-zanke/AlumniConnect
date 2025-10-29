const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Import controllers
const {
  getAllPosts,
  getSavedPosts,
  searchPosts,
  createPost,
  getSinglePost,
  reactToPost,
  getReactions,
  commentOnPost,
  reactToComment,
  sharePost,
  toggleBookmark,
  reportPost,
  getMyAnalytics,
  getMyPosts,
  getPostAnalytics,
  deletePost,
  deleteComment,
  getPopularTags,
  searchTags,
  searchUsers
} = require('../controllers/postsController');

// Import middleware
const { protect } = require('../middleware/authMiddleware');
const { hasRole } = require('../middleware/roleMiddleware');

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'alumni-connect/posts',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'pdf', 'doc', 'docx'],
    transformation: [{ quality: 'auto' }]
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file size limit
  }
});

// Rate limiters
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many reports from this IP, please try again later.'
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many search requests from this IP, please try again later.'
});

// Routes

// GET routes
router.get('/', protect, getAllPosts);
router.get('/saved', protect, getSavedPosts);
router.get('/my', protect, getMyPosts);
router.get('/search', protect, searchLimiter, searchPosts);
router.get('/my-analytics', protect, getMyAnalytics);
router.get('/tags/popular', getPopularTags);
router.get('/tags/search', protect, searchLimiter, searchTags);
router.get('/users/search', protect, searchUsers);
router.get('/:id', protect, getSinglePost);
router.get('/:id/reactions', protect, getReactions);
router.get('/:id/analytics', protect, getPostAnalytics);

// POST routes
router.post(
  '/',
  protect,
  hasRole(['alumni', 'teacher', 'admin']),
  upload.array('media', 5),
  [check('content').optional().isLength({ max: 5000 }).withMessage('Content must not exceed 5000 characters')],
  createPost
);

router.post('/:id/react', protect, reactToPost);

router.post(
  '/:id/comment',
  protect,
  [check('content').notEmpty().withMessage('Comment content is required')],
  commentOnPost
);

router.post('/comments/:commentId/react', protect, reactToComment);
router.post('/:id/share', protect, sharePost);
router.post('/:id/bookmark', protect, toggleBookmark);
router.post('/:id/report', protect, reportLimiter, reportPost);

// DELETE routes
router.delete('/:id', protect, deletePost);
router.delete('/:postId/comments/:commentId', protect, deleteComment);

module.exports = router;
