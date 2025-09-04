const User = require('../models/User');

// Send a connection request
exports.sendRequest = async (req, res) => {
  try {
    const { userId } = req.body;

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You can't connect with yourself" });
    }

    const sender = await User.findById(req.user._id);
    const receiver = await User.findById(userId);

    if (!receiver) return res.status(404).json({ message: 'User not found' });

    if (receiver.connectionRequests.includes(sender._id)) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    if (receiver.connections.includes(sender._id)) {
      return res.status(400).json({ message: 'Already connected' });
    }

    receiver.connectionRequests.push(sender._id);
    await receiver.save();

    res.json({ message: 'Connection request sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Accept a connection request
exports.acceptRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id);
    const sender = await User.findById(userId);

    if (!sender) return res.status(404).json({ message: 'User not found' });

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

    res.json({ message: 'Connection request accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject a connection request
exports.rejectRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id);

    me.connectionRequests = me.connectionRequests.filter(
      (id) => id.toString() !== userId
    );

    await me.save();

    res.json({ message: 'Connection request rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove a connection
exports.removeConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id);
    const other = await User.findById(userId);

    if (!other) return res.status(404).json({ message: 'User not found' });

    me.connections = me.connections.filter((id) => id.toString() !== userId);
    other.connections = other.connections.filter(
      (id) => id.toString() !== me._id.toString()
    );

    await me.save();
    await other.save();

    res.json({ message: 'Connection removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get connection status with another user
exports.getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id).select('connections connectionRequests');
    const other = await User.findById(userId).select('connections connectionRequests');

    if (!me || !other) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isConnected = me.connections.some(id => id.toString() === userId) &&
                        other.connections.some(id => id.toString() === me._id.toString());

    if (isConnected) {
      return res.json({ status: 'connected' });
    }

    const iRequestedOther = other.connectionRequests.some(id => id.toString() === me._id.toString());
    if (iRequestedOther) {
      return res.json({ status: 'requested' });
    }

    const otherRequestedMe = me.connectionRequests.some(id => id.toString() === userId);
    if (otherRequestedMe) {
      return res.json({ status: 'incoming' });
    }

    return res.json({ status: 'none' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all connections
exports.getConnections = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).populate('connections', 'name username avatarUrl');
    res.json(me.connections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).populate('connectionRequests', 'name username avatarUrl');
    res.json(me.connectionRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get suggested connections
exports.getSuggestedConnections = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const users = await User.find({
      _id: { $nin: [me._id, ...me.connections, ...me.connectionRequests] }
    }).select('name username avatarUrl role');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};