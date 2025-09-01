const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Connection = require('../models/Connection');
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

        // Check if connection already exists
        const existingConnection = await Connection.findOne({
            $or: [
                { requesterId: fromUserId, recipientId: userId },
                { requesterId: userId, recipientId: fromUserId }
            ]
        });

        if (existingConnection) {
            return res.status(400).json({ message: 'Connection already exists' });
        }

        // Create new connection request
        const connection = new Connection({
            requesterId: fromUserId,
            recipientId: userId,
            status: 'pending'
        });

        await connection.save();

        // Create notification for the recipient
        await NotificationService.createNotification({
            recipientId: userId,
            senderId: fromUserId,
            type: 'connection_request',
            content: 'sent you a connection request',
            relatedId: connection._id,
            onModel: 'Connection'
        });

        res.status(200).json({ message: 'Connection request sent successfully', data: connection });
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
        const connection = await Connection.findOne({
            _id: requestId,
            recipientId: currentUserId,
            status: 'pending'
        });

        if (!connection) {
            return res.status(404).json({ message: 'Connection request not found' });
        }

        connection.status = 'accepted';
        await connection.save();

        res.status(200).json({ message: 'Connection request accepted', data: connection });
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
        const connection = await Connection.findOneAndDelete({
            _id: requestId,
            recipientId: currentUserId,
            status: 'pending'
        });

        if (!connection) {
            return res.status(404).json({ message: 'Connection request not found' });
        }

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
        const connection = await Connection.findOne({
            $or: [
                { requesterId: currentUserId, recipientId: userId },
                { requesterId: userId, recipientId: currentUserId }
            ]
        });
        
        if (!connection) {
            return res.json({ status: 'none' });
        }
        
        if (connection.status === 'accepted') {
            return res.json({ status: 'connected' });
        }
        
        if (connection.status === 'pending') {
            if (connection.requesterId.toString() === currentUserId) {
                return res.json({ status: 'requested' });
            } else {
                return res.json({ status: 'pending' });
            }
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
        const connections = await Connection.find({
            recipientId: req.user._id,
            status: 'pending'
        }).populate('requesterId', 'name username avatarUrl role');
        
        res.json({ data: connections || [] });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ message: 'Error fetching pending requests' });
    }
});

// Get followers
router.get('/followers', protect, async (req, res) => {
    try {
        const connections = await Connection.find({
            recipientId: req.user._id,
            status: 'accepted'
        }).populate('requesterId', 'name username avatarUrl role');
        
        res.json({ data: connections || [] });
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ message: 'Error fetching followers' });
    }
});

// Get following
router.get('/following', protect, async (req, res) => {
    try {
        const connections = await Connection.find({
            requesterId: req.user._id,
            status: 'accepted'
        }).populate('recipientId', 'name username avatarUrl role');
        
        res.json({ data: connections || [] });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ message: 'Error fetching following' });
    }
});

// Get suggested connections
router.get('/suggested', protect, async (req, res) => {
    try {
        // Get current user's connections
        const currentConnections = await Connection.find({
            $or: [
                { requesterId: req.user._id },
                { recipientId: req.user._id }
            ]
        });
        
        // Get IDs of users already connected with
        const connectedUserIds = currentConnections.map(conn => 
            conn.requesterId.equals(req.user._id) ? conn.recipientId : conn.requesterId
        );
        
        // Add current user's ID to exclude from suggestions
        connectedUserIds.push(req.user._id);
        
        // Find users not connected with
        const suggestedUsers = await User.find({
            _id: { $nin: connectedUserIds }
        }).select('name username avatarUrl role department year').limit(10);
        
        res.json({ data: suggestedUsers });
    } catch (error) {
        console.error('Error fetching suggested connections:', error);
        res.status(500).json({ message: 'Error fetching suggested connections' });
    }
});

module.exports = router;