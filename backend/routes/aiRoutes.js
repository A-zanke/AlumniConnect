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
    let py = spawn(execName, [scriptPath, mongoUri, studentId, '10']);

    let out = '';
    let err = '';
    py.stdout.on('data', (d) => (out += d.toString()));
    py.stderr.on('data', (d) => (err += d.toString()));
    py.on('error', () => {
      // Retry with alternate python name if first spawn failed
      if (execName !== 'python') {
        out = '';
        err = '';
        py = spawn('python', [scriptPath, mongoUri, studentId, '10']);
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
            if (recs.length === 0) {
              try {
                const fallback = await User.find({ role: 'alumni' })
                  .select('name username avatarUrl department graduationYear industry skills')
                  .limit(10)
                  .lean();
                recs = fallback.map(a => ({
                  _id: String(a._id),
                  name: a.name || '',
                  username: a.username || '',
                  avatarUrl: a.avatarUrl || '',
                  department: a.department || '',
                  graduationYear: a.graduationYear || '',
                  industry: a.industry || '',
                  skills: Array.isArray(a.skills) ? a.skills : [],
                  similarity: 0.0,
                }));
              } catch {}
            }
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
        if (recs.length === 0) {
          // Fallback: return some alumni from DB so UI is not empty
          try {
            const fallback = await User.find({ role: 'alumni' })
              .select('name username avatarUrl department graduationYear industry skills')
              .limit(10)
              .lean();
            recs = fallback.map(a => ({
              _id: String(a._id),
              name: a.name || '',
              username: a.username || '',
              avatarUrl: a.avatarUrl || '',
              department: a.department || '',
              graduationYear: a.graduationYear || '',
              industry: a.industry || '',
              skills: Array.isArray(a.skills) ? a.skills : [],
              similarity: 0.0,
            }));
          } catch (fallbackErr) {
            // ignore
          }
        }
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
