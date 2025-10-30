const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAlumniRecommendations } = require('../controllers/recommendationsController');

// @route   GET /api/recommendations/alumni
// @desc    Get AI-powered alumni recommendations for students
// @access  Private (Students only)
router.get('/alumni', protect, getAlumniRecommendations);

module.exports = router;
