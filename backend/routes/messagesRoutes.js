const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const Message = require('../models/Message');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads/messages');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'message-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});
const User = require('../models/User');

router.get('/:userId', protect, async (req, res) => {
  const otherId = req.params.userId;
  const me = await User.findById(req.user._id).select('connections');
  if (!me) return res.status(401).json({ message: 'Unauthorized' });
  const isConnected = me.connections.some(id => id.toString() === otherId);
  if (!isConnected) return res.status(403).json({ message: 'Not connected' });
  const messages = await Message.find({
    $or: [ { from: me, to: otherId }, { from: otherId, to: me } ]
  }).sort({ createdAt: 1 });
  res.json(messages.map(m => ({
    id: m._id,
    senderId: m.from,
    recipientId: m.to,
    content: m.content,
    attachments: m.attachments || [],
    timestamp: m.createdAt
  })));
});

// Send a message with optional image
router.post('/:userId', protect, upload.single('image'), async (req, res) => {
  try {
    const otherId = req.params.userId;
    const { content } = req.body;
    const me = await User.findById(req.user._id).select('connections');
    
    if (!me) return res.status(401).json({ message: 'Unauthorized' });
    
    const isConnected = me.connections.some(id => id.toString() === otherId);
    if (!isConnected) return res.status(403).json({ message: 'Not connected' });

    const messageData = {
      from: me._id,
      to: otherId,
      content: content || ''
    };

    if (req.file) {
      messageData.attachments = [`/uploads/messages/${req.file.filename}`];
    }

    const message = await Message.create(messageData);
    
    res.json({
      id: message._id,
      senderId: message.from,
      recipientId: message.to,
      content: message.content,
      attachments: message.attachments || [],
      timestamp: message.createdAt
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

