const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getThreads,
  getOrCreateThread,
  getMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  markAsRead,
  searchMessages,
  getThreadMedia,
  blockUser,
  unblockUser,
  deleteChat,
  clearChat,
  toggleStarChat
} = require('../controllers/messagesController');

router.use(protect);

router.get('/threads', getThreads);
router.get('/threads/:participantId', getOrCreateThread);
router.get('/threads/:threadId/messages', getMessages);
router.post('/threads/:threadId/messages', sendMessage);
router.patch('/messages/:id', updateMessage);
router.delete('/messages/:id', deleteMessage);
router.post('/threads/:threadId/read', markAsRead);
router.get('/threads/:threadId/search', searchMessages);
router.get('/threads/:threadId/media', getThreadMedia);
router.post('/blocks/:userId', blockUser);
router.delete('/blocks/:userId', unblockUser);
router.delete('/threads/:threadId', deleteChat);
router.post('/threads/:threadId/clear', clearChat);
router.post('/threads/:threadId/star', toggleStarChat);

module.exports = router;