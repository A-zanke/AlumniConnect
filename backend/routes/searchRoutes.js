const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Department = require('../models/Department');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const { getAlumniRecommendations } = require('../controllers/recommendationsController');
const { DEFAULT_DEPARTMENTS } = require('../config/departments');

// GET /api/search/users?query=...&excludeId=...
router.get('/users', async (req, res) => {
  try {
    const { query: queryParam, q, excludeId } = req.query;
    const searchTerm = (queryParam || q || '').trim();

    if (!searchTerm) {
      return res.json([]);
    }

    const regex = { $regex: searchTerm, $options: 'i' };

    let objectId = excludeId;
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      objectId = new mongoose.Types.ObjectId(excludeId);
    }

    const criteria = {
      $or: [
        { name: regex },
        { username: regex },
        { email: regex },
        { company: regex },
        { position: regex },
        { department: regex },
        { major: regex },
        { skills: regex },
        { 'skills.name': regex }
      ],
      ...(excludeId ? { _id: { $ne: objectId } } : {})
    };

    const users = await User.find(criteria)
      .select('name username email avatarUrl skills company position role department major')
      .limit(50)
      .lean();

    const normalized = users.map(u => ({
      _id: u._id,
      name: u.name || '',
      username: u.username || '',
      email: u.email || '',
      avatarUrl: u.avatarUrl || '',
      skills: Array.isArray(u.skills)
        ? u.skills.map(s => (typeof s === 'string' ? s : s?.name)).filter(Boolean)
        : [],
      company: u.company || '',
      position: u.position || '',
      role: (u.role || '').toLowerCase(),
      department: u.department || '',
      major: u.major || ''
    }));

    return res.json(normalized);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

// GET /api/search/departments
// Fetch departments from actual user registrations (as per requirement)
// Always returns: Default departments + User-registered departments (merged and sorted)
router.get('/departments', async (req, res) => {
  try {
    // Step 1: Ensure default departments exist in the collection
    for (const deptName of DEFAULT_DEPARTMENTS) {
      try {
        await Department.findOrCreate(deptName);
      } catch (err) {
        // Ignore duplicate errors, continue with next
        if (err.code !== 11000) {
          console.error(`Error creating default department ${deptName}:`, err.message);
        }
      }
    }
    
    // Step 2: Get unique departments from registered users
    const userDepartments = await User.distinct('department', { 
      department: { $exists: true, $ne: null, $ne: '' } 
    });
    
    // Step 3: Add any new user departments to the collection
    for (const deptName of userDepartments) {
      if (deptName && deptName.trim()) {
        try {
          await Department.findOrCreate(deptName.trim());
        } catch (err) {
          if (err.code !== 11000) {
            console.error(`Error creating user department ${deptName}:`, err.message);
          }
        }
      }
    }
    
    // Step 4: Get all departments from collection (now includes defaults + user departments)
    const allDepartments = await Department.find().sort({ name: 1 }).lean();
    const departmentNames = allDepartments.map(d => d.name);
    
    // Step 5: Ensure we always have at least the default departments
    const finalDepartments = departmentNames.length > 0 
      ? departmentNames 
      : DEFAULT_DEPARTMENTS;
    
    res.json(finalDepartments);
  } catch (error) {
    console.error('Departments fetch error:', error);
    // Always return at least default departments on error
    res.json(DEFAULT_DEPARTMENTS);
  }
});

module.exports = router;
// Alumni recommendations (student only visibility handled in controller)
router.get('/recommendations/alumni', protect, getAlumniRecommendations);