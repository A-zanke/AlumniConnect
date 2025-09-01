const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Connection = require('../models/Connection');
const Message = require('../models/Message');

router.get('/:userId', protect, async (req, res) => {
  const otherId = req.params.userId;
  const me = req.user._id;
  const allowed = await Connection.findOne({
    $or: [
      { requesterId: me, recipientId: otherId, status: 'accepted' },
      { requesterId: otherId, recipientId: me, status: 'accepted' }
    ]
  });
  if (!allowed) return res.status(403).json({ message: 'Not connected' });
  const messages = await Message.find({
    $or: [ { from: me, to: otherId }, { from: otherId, to: me } ]
  }).sort({ createdAt: 1 });
  res.json(messages.map(m => ({
    id: m._id,
    senderId: m.from,
    recipientId: m.to,
    content: m.content,
    timestamp: m.createdAt
  })));
});

module.exports = router;

