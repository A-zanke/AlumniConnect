const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// AI Chatbot endpoint
router.post('/', chatbotController.chatbotReply);

module.exports = router;
