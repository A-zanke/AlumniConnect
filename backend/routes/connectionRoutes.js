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

// Get all user's connections (must be first to avoid conflicts)
router.get('/', protect, getConnections);

// Get pending requests
router.get('/requests', protect, getPendingRequests);

// Request history (accepted/rejected + pending)
router.get('/requests/history', protect, async (req, res) => {
  try {
    const Connection = require('../models/Connection');
    const myId = req.user._id.toString();
    const history = await Connection.find({
      $or: [
        { requesterId: myId },
        { recipientId: myId }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('requesterId', 'name username avatarUrl role')
      .populate('recipientId', 'name username avatarUrl role');

    const normalized = history.map(h => ({
      _id: h._id,
      requester: h.requesterId,
      recipient: h.recipientId,
      status: h.status,
      createdAt: h.createdAt
    }));
    res.json({ data: normalized });
  } catch (error) {
    console.error('Get request history error:', error);
    res.status(500).json({ message: 'Error fetching request history' });
  }
});

// Get suggested connections
router.get('/suggested', protect, getSuggestedConnections);

// Get connection status with another user
router.get('/status/:userId', protect, getConnectionStatus);

// Send connection request
router.post('/', protect, sendRequest);

// Accept request
router.put('/:userId/accept', protect, acceptRequest);

// Reject request
router.delete('/:userId/reject', protect, rejectRequest);

// Remove connection
router.delete('/:userId', protect, removeConnection);

module.exports = router;
