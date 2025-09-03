const express = require('express');
const router = express.Router();
const {
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeConnection,
  getConnectionStatus,
  getConnections,
  getPendingRequests,
  getSuggestedConnections
} = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');

// Send connection request
router.post('/', protect, sendRequest);

// Accept request
router.put('/:userId/accept', protect, acceptRequest);

// Reject request
router.delete('/:userId/reject', protect, rejectRequest);

// Remove connection
router.delete('/:userId', protect, removeConnection);

// Get connection status with another user
router.get('/status/:userId', protect, getConnectionStatus);

// Get all user’s connections
router.get('/followers', protect, getConnections);

// Get pending requests
router.get('/requests', protect, getPendingRequests);

// Get suggested connections
router.get('/suggested', protect, getSuggestedConnections);

module.exports = router;
