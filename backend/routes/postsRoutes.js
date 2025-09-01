const express = require('express');
const router = express.Router();
const { getUserPosts, createPost } = require('../controllers/postsController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

router.get('/user/:userId', protect, getUserPosts);
// Only Teacher, Alumni, Admin can create posts
router.post('/', protect, roleMiddleware('teacher', 'alumni', 'admin'), createPost);

module.exports = router; 