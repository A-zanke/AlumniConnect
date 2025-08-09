const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getConnections,
  getFollowers,
  getFollowing,
  getPendingRequests,
  getSuggestedConnections,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeConnection
} = require('../controllers/connectionController');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

// All routes are protected
router.use(protect);

// Get all connections, followers, following, and suggestions
router.get('/', getConnections);
router.get('/followers', getFollowers);
router.get('/following', getFollowing);
router.get('/requests', getPendingRequests);
router.get('/suggested', getSuggestedConnections);

// Connection management
router.post('/', sendRequest);
router.put('/:connectionId/accept', acceptRequest);
router.delete('/:connectionId/reject', rejectRequest);
router.delete('/:userId', removeConnection);

// Send a connection request
router.post('/request', async (req, res) => {
    const fromUserId = req.user._id; // Get from authenticated user
    const { toUserId } = req.body;
    
    if (!toUserId) return res.status(400).json({ message: 'Missing recipient user ID' });
    if (fromUserId.toString() === toUserId) return res.status(400).json({ message: 'Cannot connect to yourself' });
    
    try {
        const fromUser = await User.findById(fromUserId);
        const toUser = await User.findById(toUserId);
        
        if (!fromUser || !toUser) return res.status(404).json({ message: 'User not found' });
        
        // Check if already connected or requested
        if (toUser.connectionRequests.includes(fromUserId)) {
            return res.status(400).json({ message: 'Connection request already sent' });
        }
        if (toUser.connections.includes(fromUserId)) {
            return res.status(400).json({ message: 'Already connected' });
        }
        
        // Add request
        toUser.connectionRequests.push(fromUserId);
        await toUser.save();

        // Create notification
        await NotificationService.createNotification({
          recipientId: toUserId,
          senderId: fromUserId,
          type: 'connection_request',
          content: `${fromUser.name} sent you a connection request`
        });
        
        res.json({ message: 'Connection request sent successfully' });
    } catch (error) {
        console.error('Error sending connection request:', error);
        res.status(500).json({ message: 'Error sending connection request' });
    }
});

// Accept a connection request
router.post('/accept', async (req, res) => {
    const { fromUserId, toUserId } = req.body;
    if (!fromUserId || !toUserId) return res.status(400).json({ message: 'Missing user IDs' });
    try {
        const fromUser = await User.findById(fromUserId);
        const toUser = await User.findById(toUserId);
        if (!fromUser || !toUser) return res.status(404).json({ message: 'User not found' });
        // Remove from requests
        toUser.connectionRequests = toUser.connectionRequests.filter(id => id.toString() !== fromUserId);
        // Add to connections
        toUser.connections.push(fromUserId);
        fromUser.connections.push(toUserId);
        await toUser.save();
        await fromUser.save();

        // Create notification for the sender
        await NotificationService.createNotification({
          recipientId: fromUserId,
          senderId: toUserId,
          type: 'connection_accepted',
          content: `${toUser.name} accepted your connection request`
        });

        res.json({ message: 'Connection accepted' });
    } catch (error) {
        res.status(500).json({ message: 'Error accepting request' });
    }
});

// Reject a connection request
router.post('/reject', async (req, res) => {
    const { fromUserId, toUserId } = req.body;
    if (!fromUserId || !toUserId) return res.status(400).json({ message: 'Missing user IDs' });
    try {
        const toUser = await User.findById(toUserId);
        if (!toUser) return res.status(404).json({ message: 'User not found' });
        toUser.connectionRequests = toUser.connectionRequests.filter(id => id.toString() !== fromUserId);
        await toUser.save();

        // Create notification for the sender
        await NotificationService.createNotification({
          recipientId: fromUserId,
          senderId: toUserId,
          type: 'connection_rejected',
          content: `${toUser.name} declined your connection request`
        });

        res.json({ message: 'Connection request rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting request' });
    }
});

// Get connection status
router.get('/status/:fromUserId/:toUserId', async (req, res) => {
    const { fromUserId, toUserId } = req.params;
    try {
        const fromUser = await User.findById(fromUserId);
        const toUser = await User.findById(toUserId);
        if (!fromUser || !toUser) return res.status(404).json({ message: 'User not found' });
        if (fromUser.connections.includes(toUserId)) return res.json({ status: 'connected' });
        if (toUser.connectionRequests.includes(fromUserId)) return res.json({ status: 'requested' });
        return res.json({ status: 'none' });
    } catch (error) {
        res.status(500).json({ message: 'Error getting status' });
    }
});

module.exports = router;
