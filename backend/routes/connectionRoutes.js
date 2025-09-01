const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

// Send connection request
router.post('/', protect, async (req, res) => {
    const { userId } = req.body;
    const fromUserId = req.user._id;
    
    try {
        if (!userId) return res.status(400).json({ message: 'Missing recipient user ID' });
        if (fromUserId.toString() === userId) return res.status(400).json({ message: 'Cannot connect to yourself' });

        const fromUser = await User.findById(fromUserId);
        const toUser = await User.findById(userId);

        if (!fromUser || !toUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already connected or request already sent
        if (fromUser.connections.includes(userId)) {
            return res.status(400).json({ message: 'Already connected' });
        }
        if (toUser.connectionRequests.includes(fromUserId)) {
            return res.status(400).json({ message: 'Connection request already sent' });
        }

        // Add to connection requests
        toUser.connectionRequests.push(fromUserId);
        await toUser.save();

        // Create notification for the recipient
        await NotificationService.createNotification({
            recipientId: userId,
            senderId: fromUserId,
            type: 'connection_request',
            content: `${fromUser.name} sent you a connection request`
        });

        res.status(200).json({ message: 'Connection request sent successfully' });
    } catch (error) {
        console.error('Error sending connection request:', error);
        res.status(500).json({ message: 'Error sending connection request' });
    }
});

// Accept connection request
router.put('/:requestId/accept', protect, async (req, res) => {
    const { requestId } = req.params;
    const currentUserId = req.user._id;
    
    try {
        const currentUser = await User.findById(currentUserId);
        const requesterUser = await User.findById(requestId);

        if (!currentUser || !requesterUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove from connection requests
        currentUser.connectionRequests = currentUser.connectionRequests.filter(
            id => id.toString() !== requestId
        );

        // Add to connections (both ways)
        if (!currentUser.connections.includes(requestId)) {
            currentUser.connections.push(requestId);
        }
        if (!requesterUser.connections.includes(currentUserId)) {
            requesterUser.connections.push(currentUserId);
        }

        await currentUser.save();
        await requesterUser.save();

        // Create notification for the requester
        await NotificationService.createNotification({
            recipientId: requestId,
            senderId: currentUserId,
            type: 'connection_accepted',
            content: `${currentUser.name} accepted your connection request`
        });

        res.status(200).json({ message: 'Connection request accepted' });
    } catch (error) {
        console.error('Error accepting connection request:', error);
        res.status(500).json({ message: 'Error accepting connection request' });
    }
});

// Reject connection request
router.delete('/:requestId/reject', protect, async (req, res) => {
    const { requestId } = req.params;
    const currentUserId = req.user._id;
    
    try {
        const currentUser = await User.findById(currentUserId);

        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove from connection requests
        currentUser.connectionRequests = currentUser.connectionRequests.filter(
            id => id.toString() !== requestId
        );

        await currentUser.save();

        res.status(200).json({ message: 'Connection request rejected' });
    } catch (error) {
        console.error('Error rejecting connection request:', error);
        res.status(500).json({ message: 'Error rejecting connection request' });
    }
});

// Get connection status between current user and another user
router.get('/status/:userId', protect, async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    try {
        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(userId);
        
        if (!currentUser || !targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if already connected
        if (currentUser.connections.includes(userId)) {
            return res.json({ status: 'connected' });
        }
        
        // Check if current user has sent a request to target user
        if (targetUser.connectionRequests.includes(currentUserId)) {
            return res.json({ status: 'requested' });
        }
        
        // Check if target user has sent a request to current user
        if (currentUser.connectionRequests.includes(userId)) {
            return res.json({ status: 'pending' });
        }
        
        return res.json({ status: 'none' });
    } catch (error) {
        console.error('Error getting connection status:', error);
        res.status(500).json({ message: 'Error getting status' });
    }
});

// Get pending requests
router.get('/requests', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('connectionRequests', 'name username avatarUrl role');
        
        res.json({ data: user.connectionRequests || [] });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ message: 'Error fetching pending requests' });
    }
});

// Get followers
router.get('/followers', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('connections', 'name username avatarUrl role');
        
        res.json({ data: user.connections || [] });
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ message: 'Error fetching followers' });
    }
});

// Get following
router.get('/following', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('connections', 'name username avatarUrl role');
        
        res.json({ data: user.connections || [] });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ message: 'Error fetching following' });
    }
});

// Get suggested connections
router.get('/suggested', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        const allUsers = await User.find({
            _id: { 
                $nin: [
                    req.user._id,
                    ...currentUser.connections,
                    ...currentUser.connectionRequests
                ]
            }
        }).select('name username avatarUrl role department year').limit(10);
        
        res.json({ data: allUsers });
    } catch (error) {
        console.error('Error fetching suggested connections:', error);
        res.status(500).json({ message: 'Error fetching suggested connections' });
    }
});

module.exports = router;