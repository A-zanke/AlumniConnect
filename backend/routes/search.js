const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

router.get('/', protect, async (req, res) => {
    try {
        const { q, filter } = req.query;

        let searchQuery = {};
        let roleFilter = {};

        // Support for role-based filters
        if (filter === 'alumni' || filter === 'students' || filter === 'teachers') {
            let role = filter === 'students' ? 'student' : filter.slice(0, -1);
            roleFilter = { role: new RegExp(role, 'i') };
        }

        // If q is provided, search across fields; otherwise, match all users
        if (q && q.trim() !== '') {
            switch (filter) {
                case 'name':
                    searchQuery = { name: { $regex: q, $options: 'i' } };
                    break;
                case 'company':
                    searchQuery = { company: { $regex: q, $options: 'i' } };
                    break;
                case 'university':
                    searchQuery = { university: { $regex: q, $options: 'i' } };
                    break;
                case 'major':
                    searchQuery = { major: { $regex: q, $options: 'i' } };
                    break;
                case 'skills':
                    searchQuery = { 'skills.name': { $regex: q, $options: 'i' } };
                    break;
                case 'alumni':
                case 'students':
                case 'teachers':
                case 'all':
                default:
                    searchQuery = {
                        $or: [
                            { name: { $regex: q, $options: 'i' } },
                            { company: { $regex: q, $options: 'i' } },
                            { university: { $regex: q, $options: 'i' } },
                            { major: { $regex: q, $options: 'i' } },
                            { 'skills.name': { $regex: q, $options: 'i' } }
                        ]
                    };
            }
        } // else: leave searchQuery as {} to match all users

        let excludeId = req.user._id || req.user.id;
        if (mongoose.Types.ObjectId.isValid(excludeId)) {
            excludeId = mongoose.Types.ObjectId(excludeId);
        }
        const finalQuery = {
            ...searchQuery,
            ...roleFilter
        };

        // Find users matching the query (including the logged-in user)
        let users = await User.find(finalQuery)
            .select('name email profilePicture headline currentPosition company university major skills role')
            .limit(20);

        // If the logged-in user matches the query, ensure they're included
        const self = await User.findById(excludeId).select('name email profilePicture headline currentPosition company university major skills role');
        if (self) {
            // If q is present, check if self matches the query
            let includeSelf = false;
            if (!q || q.trim() === '') {
                includeSelf = true;
            } else {
                const regex = new RegExp(q, 'i');
                includeSelf = regex.test(self.name) || regex.test(self.company) || regex.test(self.university) || regex.test(self.major) || (self.skills && self.skills.some(skill => regex.test(skill.name)));
            }
            if (includeSelf && !users.some(u => u._id.equals(self._id))) {
                users.unshift(self);
            }
        }

        res.json(users);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error performing search', error: error.message });
    }
});

module.exports = router;