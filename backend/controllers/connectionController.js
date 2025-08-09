const Connection = require('../models/Connection');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

// Get all connections for a user
exports.getConnections = async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [
        { requesterId: req.user._id },
        { recipientId: req.user._id }
      ],
      status: 'accepted'
    })
    .populate('requesterId', 'name username avatarUrl role')
    .populate('recipientId', 'name username avatarUrl role');
    
    res.json({ data: connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Error fetching connections' });
  }
};

// Get followers
exports.getFollowers = async (req, res) => {
  try {
    const connections = await Connection.find({
      recipientId: req.user._id,
      status: 'accepted'
    })
    .populate('requesterId', 'name username avatarUrl role');
    
    res.json({ data: connections });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ message: 'Error fetching followers' });
  }
};

// Get following
exports.getFollowing = async (req, res) => {
  try {
    const connections = await Connection.find({
      requesterId: req.user._id,
      status: 'accepted'
    })
    .populate('recipientId', 'name username avatarUrl role');
    
    res.json({ data: connections });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ message: 'Error fetching following' });
  }
};

// Get pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      recipientId: req.user._id,
      status: 'pending'
    })
    .populate('requesterId', 'name username avatarUrl role');
    
    res.json({ data: requests });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Error fetching pending requests' });
  }
};

// Get suggested connections
exports.getSuggestedConnections = async (req, res) => {
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
      _id: { $nin: connectedUserIds },
      college: req.user.college // Same college
    })
    .select('name username avatarUrl role')
    .limit(10);
    
    res.json({ data: suggestedUsers });
  } catch (error) {
    console.error('Error fetching suggested connections:', error);
    res.status(500).json({ message: 'Error fetching suggested connections' });
  }
};

// Send connection request
exports.sendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requesterId: req.user._id, recipientId: userId },
        { requesterId: userId, recipientId: req.user._id }
      ]
    });
    
    if (existingConnection) {
      return res.status(400).json({ message: 'Connection already exists' });
    }
    
    // Create new connection
    const connection = new Connection({
      requesterId: req.user._id,
      recipientId: userId
    });
    
    await connection.save();
    // Create notification for the recipient
    await NotificationService.createNotification({
      recipientId: userId,
      senderId: req.user._id,
      type: 'connection_request',
      content: 'You have a new connection request',
      relatedId: connection._id,
      onModel: 'Connection'
    });
    res.json({ message: 'Connection request sent', data: connection });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({ message: 'Error sending connection request' });
  }
};

// Accept connection request
exports.acceptRequest = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      recipientId: req.user._id,
      status: 'pending'
    });
    
    if (!connection) {
      return res.status(404).json({ message: 'Connection request not found' });
    }
    
    connection.status = 'accepted';
    await connection.save();
    
    res.json({ message: 'Connection request accepted', data: connection });
  } catch (error) {
    console.error('Error accepting connection request:', error);
    res.status(500).json({ message: 'Error accepting connection request' });
  }
};

// Reject connection request
exports.rejectRequest = async (req, res) => {
  try {
    const connection = await Connection.findOneAndDelete({
      _id: req.params.connectionId,
      recipientId: req.user._id,
      status: 'pending'
    });
    
    if (!connection) {
      return res.status(404).json({ message: 'Connection request not found' });
    }
    
    res.json({ message: 'Connection request rejected' });
  } catch (error) {
    console.error('Error rejecting connection request:', error);
    res.status(500).json({ message: 'Error rejecting connection request' });
  }
};

// Remove connection
exports.removeConnection = async (req, res) => {
  try {
    const connection = await Connection.findOneAndDelete({
      $or: [
        { requesterId: req.user._id, recipientId: req.params.userId },
        { requesterId: req.params.userId, recipientId: req.user._id }
      ],
      status: 'accepted'
    });
    
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    
    res.json({ message: 'Connection removed' });
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({ message: 'Error removing connection' });
  }
};
