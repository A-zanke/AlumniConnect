const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  getMessages,
  sendMessage,
  deleteMessage,
  deleteChat,
  deleteAllMessages,
  getConversations
} = require('../controllers/messagesController');

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

// Get messages between current user and another user
router.get('/:userId', protect, getMessages);

// Send a message with optional image
router.post('/:userId', protect, upload.single('image'), sendMessage);

// Delete a message
router.delete('/:messageId', protect, deleteMessage);

// Delete entire chat with a user
router.delete('/chat/:userId', protect, deleteChat);

// Delete all messages for current user
router.delete('/all', protect, deleteAllMessages);

// Get conversation list for current user
router.get('/', protect, getConversations);

module.exports = router;

