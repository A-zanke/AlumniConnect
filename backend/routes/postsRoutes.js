const express = require('express');
const router = express.Router();
const { getUserPosts, createPost } = require('../controllers/postsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/user/:userId', protect, getUserPosts);
router.post('/', protect, createPost);

module.exports = router; 