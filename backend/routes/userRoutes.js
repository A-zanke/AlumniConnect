const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getUserByUsername, 
  getFollowers, 
  getFollowing, 
  getMutualConnections, 
  followUser, 
  getSuggestedConnections 
} = require('../controllers/userController');

// Public route to get user profile by username
router.get('/username/:username', getUserByUsername);

// Get user profile by ID
router.get('/:userId', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.userId)
      .select('-password -connectionRequests')
      .populate('connections', 'name username avatarUrl role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Follow/Unfollow endpoints
router.get('/:userId/followers', protect, getFollowers);
router.get('/:userId/following', protect, getFollowing);
router.get('/:userId/mutual', protect, getMutualConnections);
router.post('/:userId/follow', protect, followUser);
router.get('/suggested/connections', protect, getSuggestedConnections);

module.exports = router; 