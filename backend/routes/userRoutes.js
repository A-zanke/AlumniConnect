const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getUserByUsername, 
  getFollowing, 
  getMutualConnections, 
  getMyMutualConnections,
  followUser, 
  unfollowUser,
  getSuggestedConnections,
  updatePresence,
  getPresence
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
      const studentData = await Student.findOne({ email: user.email });
      if (studentData) {
        additionalData = {
          department: studentData.department,
          year: studentData.year,
          batch: studentData.batch,
          rollNumber: studentData.rollNumber,
          major: studentData.major,
          graduationYear: studentData.graduationYear,
          specialization: studentData.specialization,
          projects: studentData.projects,
          desired_roles: studentData.desired_roles,
          preferred_industries: studentData.preferred_industries,
          higher_studies_interest: studentData.higher_studies_interest,
          entrepreneurship_interest: studentData.entrepreneurship_interest,
          internships: studentData.internships,
          hackathons: studentData.hackathons,
          research_papers: studentData.research_papers,
          mentorship_needs: studentData.mentorship_needs,
          preferred_location: studentData.preferred_location,
          preferred_mode: studentData.preferred_mode,
          certifications: studentData.certifications,
          achievements: studentData.achievements,
          detailed_projects: studentData.detailed_projects,
          detailed_internships: studentData.detailed_internships
        };
      }
    } else if (user.role === 'alumni') {
      const alumniData = await Alumni.findOne({ email: user.email });
      if (alumniData) {
        additionalData = {
          specialization: alumniData.specialization,
          higher_studies: alumniData.higher_studies,
          current_job_title: alumniData.current_job_title,
          company: alumniData.company,
          industry: alumniData.industry,
          past_experience: alumniData.past_experience,
          mentorship_interests: alumniData.mentorship_interests,
          preferred_students: alumniData.preferred_students,
          availability: alumniData.availability,
          certifications: alumniData.certifications,
          publications: alumniData.publications,
          entrepreneurship: alumniData.entrepreneurship,
          linkedin: alumniData.linkedin,
          github: alumniData.github,
          website: alumniData.website
        };
      }
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

module.exports = router; 