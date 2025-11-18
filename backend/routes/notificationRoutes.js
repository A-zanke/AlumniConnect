const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createNotification,
  getNotifications,
  respondToRequest,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

// All routes are protected
router.use(protect);

// Create a notification
router.post('/', createNotification);

// Get all notifications for the current user
router.get('/', getNotifications);

// Respond to a connection request
router.post('/:id/respond', respondToRequest);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

module.exports = router; 