const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Alumni = require('../models/Alumni');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');

// Search users by name, username, email, company, or position (no auth for testing)
router.get('/users', async (req, res) => {
    try {
        const { query, excludeId } = req.query;
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        const regex = { $regex: query, $options: 'i' };
        let objectId = excludeId;
        if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
            objectId = new mongoose.Types.ObjectId(excludeId);
        }
        // Common search criteria
        const baseCriteria = [
            { name: regex },
            { username: regex },
            { email: regex },
            { company: regex },
            { position: regex }
        ];
        // User collection
        const userPromise = User.find({
            $or: baseCriteria,
            ...(excludeId ? { _id: { $ne: objectId } } : {})
        }).select('name username avatarUrl skills company position role');
        // Alumni collection
        const alumniPromise = Alumni.find({
            $or: baseCriteria,
            ...(excludeId ? { _id: { $ne: objectId } } : {})
        }).select('name username profilePicture skills company position degree graduationYear').lean();
        // Student collection
        const studentPromise = Student.find({
            $or: baseCriteria,
            ...(excludeId ? { _id: { $ne: objectId } } : {})
        }).select('name username profilePicture skills company position major graduationYear').lean();
        // Teacher collection
        const teacherPromise = Teacher.find({
            $or: baseCriteria,
            ...(excludeId ? { _id: { $ne: objectId } } : {})
        }).select('name username profilePicture skills company position department').lean();
        // Await all
        const [users, alumni, students, teachers] = await Promise.all([
            userPromise,
            alumniPromise,
            studentPromise,
            teacherPromise
        ]);
        // Normalize and combine results
        const normalize = (arr, type) => arr.map(u => ({
            ...u,
            avatarUrl: u.avatarUrl || u.profilePicture || '',
            role: u.role || type,
            skills: u.skills || [],
            company: u.company || '',
            position: u.position || '',
            username: u.username,
            name: u.name,
            _id: u._id,
        }));
        const results = [
            ...normalize(users, 'user'),
            ...normalize(alumni, 'alumni'),
            ...normalize(students, 'student'),
            ...normalize(teachers, 'teacher')
        ];
        res.json(results);
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ message: 'Error searching users' });
    }
});

module.exports = router;