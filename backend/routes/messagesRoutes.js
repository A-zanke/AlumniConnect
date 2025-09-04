const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMessages, sendMessage, deleteMessage } = require('../controllers/messagesController');

router.get('/:userId', protect, getMessages);
router.post('/:userId', protect, sendMessage);
router.delete('/:messageId', protect, deleteMessage);

module.exports = router;

