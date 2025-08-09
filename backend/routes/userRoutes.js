const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getUserByUsername } = require('../controllers/userController');

// Public route to get user profile by username
router.get('/profile/:username', getUserByUsername);

// ... existing code ...

module.exports = router; 