const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getUserPosts, createPost, getPosts, likePost, addComment } = require('../controllers/postsController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, 'post-' + Date.now() + '-' + Math.round(Math.random()*1e9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.get('/', protect, getPosts);
router.get('/user/:userId', protect, getUserPosts);
router.post('/', protect, roleMiddleware('teacher','alumni','admin'), upload.array('media', 5), createPost);
router.post('/:postId/like', protect, likePost);
router.post('/:postId/comment', protect, addComment);

module.exports = router;