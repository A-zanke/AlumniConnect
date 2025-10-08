const express = require('express');
const router = express.Router();
const { protect, auth } = require('../middleware/authMiddleware');
const { 
  getUserByUsername, 
  getFollowing, 
  getMutualConnections, 
  getMyMutualConnections,
  followUser, 
  unfollowUser,
  getSuggestedConnections,
  updatePresence,
  getPresence,
  removeUserAvatar
} = require('../controllers/userController');
const chatbotController = require('../controllers/chatbotController');

// Public route to get user profile by username
router.get('/username/:username', getUserByUsername);

// Get user profile by ID
router.get('/:userId', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const Student = require('../models/Student');
    const Alumni = require('../models/Alumni');
    
    const user = await User.findById(req.params.userId)
      .select('-password -connectionRequests')
      .populate('connections', 'name username avatarUrl role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get additional profile data based on role
    let additionalData = {};
    if (user.role === 'student') {
      additionalData = {
        department: user.department,
        year: user.year,
        graduationYear: user.graduationYear,
        skills: user.skills,
        socials: user.socials,
        careerInterests: user.careerInterests,
        activities: user.activities,
        mentorshipOpen: user.mentorshipOpen
      };
    } else if (user.role === 'alumni') {
      additionalData = {
        department: user.department,
        graduationYear: user.graduationYear,
        degree: user.degree,
        company: user.company,
        position: user.position,
        industry: user.industry,
        skills: user.skills,
        socials: user.socials,
        mentorshipAvailable: user.mentorshipAvailable,
        guidanceAreas: user.guidanceAreas
      };
    }

    // Merge user data with additional profile data
    const fullProfile = { ...user.toObject(), ...additionalData };
    res.json({ data: fullProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Follow/Unfollow endpoints
router.get('/:userId/following', protect, getFollowing);
router.get('/:userId/mutual', protect, getMutualConnections);
router.post('/:userId/follow', protect, followUser);
router.post('/:userId/unfollow', protect, unfollowUser);
router.get('/suggested/connections', protect, getSuggestedConnections);
router.get('/mutual/connections', protect, getMyMutualConnections);

// Presence routes
router.put('/presence', protect, updatePresence);
router.get('/:userId/presence', protect, getPresence);

// AI Chatbot endpoint
router.post('/chatbot', chatbotController.chatbotReply);

// Remove user avatar
router.delete('/remove-avatar', protect, removeUserAvatar);


module.exports = router;