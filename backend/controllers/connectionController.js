const User = require('../models/User');
const Notification = require('../models/Notification');
const Connection = require('../models/Connection');

// Send a connection request
exports.sendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('Send request - userId:', userId, 'sender:', req.user._id);

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You can't connect with yourself" });
    }

    const sender = await User.findById(req.user._id);
    const receiver = await User.findById(userId);

    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize arrays if they don't exist
    if (!receiver.connectionRequests) {
      receiver.connectionRequests = [];
    }
    if (!receiver.connections) {
      receiver.connections = [];
    }

    if (receiver.connectionRequests.includes(sender._id)) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    if (receiver.connections.includes(sender._id)) {
      return res.status(400).json({ message: 'Already connected' });
    }

    receiver.connectionRequests.push(sender._id);
    await receiver.save();

    // Record request in Connection history (pending)
    await Connection.create({ requesterId: sender._id, recipientId: receiver._id, status: 'pending' });

    // Create notification for the receiver
    await Notification.create({
      recipient: receiver._id,
      sender: sender._id,
      type: 'connection_request',
      content: `${sender.name} sent you a connection request`
    });

    res.json({ message: 'Connection request sent' });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Accept a connection request
exports.acceptRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Accept request - userId:', userId, 'accepter:', req.user._id);

    const me = await User.findById(req.user._id);
    const sender = await User.findById(userId);

    if (!me) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize arrays if they don't exist
    if (!me.connectionRequests) {
      me.connectionRequests = [];
    }
    if (!me.connections) {
      me.connections = [];
    }
    if (!sender.connections) {
      sender.connections = [];
    }

    // Ensure request exists
    if (!me.connectionRequests.includes(sender._id)) {
      return res.status(400).json({ message: 'No request from this user' });
    }

    // Add connections
    me.connections.push(sender._id);
    sender.connections.push(me._id);

    // Remove from pending
    me.connectionRequests = me.connectionRequests.filter(
      (id) => id.toString() !== sender._id.toString()
    );

    await me.save();
    await sender.save();

    // Update history status to accepted
    await Connection.findOneAndUpdate(
      { requesterId: sender._id, recipientId: me._id, status: 'pending' },
      { status: 'accepted' }
    );

    // Don't mark the original connection request notification as read
    // Let the frontend handle this when the user clicks on it

    // Create notification for the sender
    await Notification.create({
      recipient: sender._id,
      sender: me._id,
      type: 'connection_accepted',
      content: `${me.name} accepted your connection request`
    });

    res.json({ message: 'Connection request accepted' });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reject a connection request
exports.rejectRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Reject request - userId:', userId, 'rejecter:', req.user._id);

    const me = await User.findById(req.user._id);

    if (!me) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Initialize arrays if they don't exist
    if (!me.connectionRequests) {
      me.connectionRequests = [];
    }

    me.connectionRequests = me.connectionRequests.filter(
      (id) => id.toString() !== userId
    );

    await me.save();

    // Update history status to rejected
    await Connection.findOneAndUpdate(
      { requesterId: userId, recipientId: me._id, status: 'pending' },
      { status: 'rejected' }
    );

    // Don't mark the original connection request notification as read
    // Let the frontend handle this when the user clicks on it

    // Create notification for the sender about rejection
    const sender = await User.findById(userId);
    if (sender) {
      await Notification.create({
        recipient: sender._id,
        sender: me._id,
        type: 'connection_rejected',
        content: `${me.name} declined your connection request`
      });
    }

    res.json({ message: 'Connection request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove a connection
exports.removeConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Remove connection - userId:', userId, 'remover:', req.user._id);

    const me = await User.findById(req.user._id);
    const other = await User.findById(userId);

    if (!me) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!other) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize arrays if they don't exist
    if (!me.connections) {
      me.connections = [];
    }
    if (!other.connections) {
      other.connections = [];
    }

    me.connections = me.connections.filter((id) => id.toString() !== userId);
    other.connections = other.connections.filter(
      (id) => id.toString() !== me._id.toString()
    );

    await me.save();
    await other.save();

    res.json({ message: 'Connection removed' });
  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get connection status with another user
exports.getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Get connection status - userId:', userId, 'requester:', req.user._id);

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const me = await User.findById(req.user._id);
    const other = await User.findById(userId);

    if (!me) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!other) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize arrays if they don't exist and save if needed
    if (!me.connections) {
      me.connections = [];
      await me.save();
    }
    if (!me.connectionRequests) {
      me.connectionRequests = [];
      await me.save();
    }
    if (!other.connections) {
      other.connections = [];
      await other.save();
    }
    if (!other.connectionRequests) {
      other.connectionRequests = [];
      await other.save();
    }

    const meConnections = me.connections || [];
    const meRequests = me.connectionRequests || [];
    const otherConnections = other.connections || [];
    const otherRequests = other.connectionRequests || [];

    const isConnected = meConnections.some(id => id.toString() === userId) &&
                        otherConnections.some(id => id.toString() === me._id.toString());

    if (isConnected) {
      return res.json({ status: 'connected' });
    }

    const iRequestedOther = otherRequests.some(id => id.toString() === me._id.toString());
    if (iRequestedOther) {
      return res.json({ status: 'requested' });
    }

    const otherRequestedMe = meRequests.some(id => id.toString() === userId);
    if (otherRequestedMe) {
      return res.json({ status: 'incoming' });
    }

    return res.json({ status: 'none' });
  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all connections
exports.getConnections = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    
    if (!me) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize arrays if they don't exist
    if (!me.connections) {
      me.connections = [];
      await me.save();
    }

    const populatedConnections = await User.populate(me, { path: 'connections', select: 'name username avatarUrl email department year industry current_job_title' });
    res.json(populatedConnections.connections || []);
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    
    if (!me) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize arrays if they don't exist
    if (!me.connectionRequests) {
      me.connectionRequests = [];
      await me.save();
    }

    const populatedRequests = await User.populate(me, { path: 'connectionRequests', select: 'name username avatarUrl role' });
    // Return normalized objects with requester info and ids for UI
    const response = (populatedRequests.connectionRequests || []).map((u) => ({
      _id: u._id,
      requester: u,
      status: 'pending'
    }));
    res.json(response);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get suggested connections
exports.getSuggestedConnections = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    
    if (!me) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize arrays if they don't exist
    if (!me.connections) {
      me.connections = [];
    }
    if (!me.connectionRequests) {
      me.connectionRequests = [];
    }

    const excludeIds = [me._id, ...(me.connections || []), ...(me.connectionRequests || [])];
    const users = await User.find({
      _id: { $nin: excludeIds }
    }).select('name username avatarUrl role');

    res.json(users);
  } catch (error) {
    console.error('Get suggested connections error:', error);
    res.status(500).json({ message: error.message });
  }
};