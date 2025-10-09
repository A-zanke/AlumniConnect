const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { spawn } = require('child_process');

// GET /api/ai/recommendations/:studentId
router.get('/recommendations/:studentId', protect, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const role = String(req.user?.role || '').toLowerCase();
    // Allow student to fetch their own recommendations; allow admin to fetch any
    if (role !== 'admin' && String(req.user?._id) !== String(studentId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
    if (!mongoUri) {
      return res.status(500).json({ message: 'MONGO_URI not configured' });
    }

    const py = spawn('python3', [
      `${process.cwd()}/ml/ai_recommender.py`,
      mongoUri,
      studentId,
      '10',
    ]);

    let out = '';
    let err = '';
    py.stdout.on('data', (d) => (out += d.toString()));
    py.stderr.on('data', (d) => (err += d.toString()));
    py.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ message: 'AI script failed', stderr: err, stdout: out });
      }
      try {
        const parsed = JSON.parse(out || '{}');
        if (parsed.error) return res.status(500).json(parsed);
        return res.json(parsed.recommendations || []);
      } catch (e) {
        return res.status(500).json({ message: 'Invalid AI output', out });
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
