const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

// GET /api/departments - Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments.map(d => d.name));
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

// POST /api/departments - Add new department (if not exists)
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const trimmedName = name.trim();
    const existing = await Department.findOne({ name: trimmedName });
    if (existing) {
      return res.status(409).json({ message: 'Department already exists' });
    }

    const department = new Department({ name: trimmedName });
    await department.save();
    res.status(201).json({ message: 'Department added successfully', department });
  } catch (error) {
    console.error('Error adding department:', error);
    if (error.code === 11000) {
      res.status(409).json({ message: 'Department already exists' });
    } else {
      res.status(500).json({ message: 'Failed to add department' });
    }
  }
});

module.exports = router;
