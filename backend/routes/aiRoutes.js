const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { spawn } = require('child_process');
const path = require('path');
const User = require('../models/User');

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

    const scriptPath = path.resolve(__dirname, '..', '..', 'ml', 'ai_recommender.py');
    const execName = process.platform === 'win32' ? 'python' : 'python3';
    // Adjustable similarity threshold: query param or env, defaults to 0.6
    const rawThreshold = parseFloat(req.query.threshold || process.env.REC_SIMILARITY_THRESHOLD || '0.3');
    const threshold = Number.isFinite(rawThreshold) ? Math.min(Math.max(rawThreshold, 0), 1) : 0.6;

    // Pass top_k = 0 to return dynamic, unbounded (post-threshold) results
    const args = [scriptPath, mongoUri, studentId, '0'];
    let py = spawn(execName, args, { env: { ...process.env, REC_SIMILARITY_THRESHOLD: String(threshold) } });

    let out = '';
    let err = '';
    py.stdout.on('data', (d) => (out += d.toString()));
    py.stderr.on('data', (d) => (err += d.toString()));
    py.on('error', () => {
      // Retry with alternate python name if first spawn failed
      if (execName !== 'python') {
        out = '';
        err = '';
        py = spawn('python', args, { env: { ...process.env, REC_SIMILARITY_THRESHOLD: String(threshold) } });
        py.stdout.on('data', (d) => (out += d.toString()));
        py.stderr.on('data', (d) => (err += d.toString()));
        py.on('close', async (code) => {
          if (code !== 0) {
            return res.status(500).json({ message: 'AI script failed', stderr: err, stdout: out });
          }
          try {
            const parsed = JSON.parse(out || '{}');
            if (parsed.error) return res.status(500).json(parsed);
            let recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
            return res.json(recs);
          } catch (e) {
            return res.status(500).json({ message: 'Invalid AI output', out });
          }
        });
      } else {
        return res.status(500).json({ message: 'Failed to start Python process' });
      }
    });
    py.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({ message: 'AI script failed', stderr: err, stdout: out });
      }
      try {
        const parsed = JSON.parse(out || '{}');
        if (parsed.error) return res.status(500).json(parsed);
        let recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
        return res.json(recs);
      } catch (e) {
        return res.status(500).json({ message: 'Invalid AI output', out });
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
