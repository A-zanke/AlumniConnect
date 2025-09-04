const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');

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
router.get('/departments', async (req, res) => {
  try {
    const registrationDepartments = ['CSE', 'AI-DS', 'Civil', 'Mechanical', 'Electrical', 'ETC'];
    const distinct = await User.distinct('department', { department: { $exists: true, $ne: '' } });
    const set = new Set(registrationDepartments.map(d => String(d).trim()));
    for (const d of distinct) {
      if (typeof d === 'string' && d.trim()) set.add(d.trim());
    }
    const list = Array.from(set).sort((a, b) => a.localeCompare(b));
    res.json(list);
  } catch (error) {
    console.error('Departments fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

module.exports = router;