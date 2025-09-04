const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');

// GET /api/search/users?query=...&excludeId=...
// Also accepts q=... for compatibility
router.get('/users', async (req, res) => {
  try {
    const { query: queryParam, q, excludeId } = req.query;
    const searchTerm = (queryParam || q || '').trim();

    if (!searchTerm) {
      return res.json([]); // empty list if nothing typed
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
        { skills: regex },            // array of strings
        { 'skills.name': regex }      // array of objects { name }
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

// Optional: root search proxy to users search
// GET /api/search?q=...
router.get('/', async (req, res) => {
  try {
    req.query.query = req.query.query || req.query.q || '';
    // Proxy to /users endpoint
    req.url = '/users';
    router.handle(req, res);
  } catch (error) {
    console.error('Root search error:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

module.exports = router