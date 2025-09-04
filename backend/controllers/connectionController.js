const User = require('../models/User');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');

// Send a connection request
exports.sendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const me = req.user._id.toString();

    if (me === userId) {
      return res.status(400).json({ message: "You can't connect with yourself" });
    }

    const receiver = await User.findById(userId).select('_id');
    if (!receiver) return res.status(404).json({ message: 'User not found' });

    const existing = await Connection.findOne({
      $or: [
        { requesterId: me, recipientId: userId },
        { requesterId: userId, recipientId: me }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'Already connected' });
      }
      if (existing.status === 'pending' && existing.requesterId.toString() === me) {
        return res.status(400).json({ message: 'Request already sent' });
      }
    }

    const created = await Connection.create({ requesterId: me, recipientId: userId, status: 'pending' });

    try {
      const sender = await User.findById(me).select('name');
      await Notification.create({
        recipient: userId,
        sender: me,
        type: 'connection_request',
        content: `${sender?.name || 'Someone'} sent you a connection request`
      });
    } catch (e) {}

    return res.json({ message: 'Connection request sent', id: created._id });
  } catch (error) {
    console.error('sendRequest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept a connection request
exports.acceptRequest = async (req, res) => {
  try {
    const { userId } = req.params; // requester user id
    const me = req.user._id.toString();

    const pending = await Connection.findOne({ requesterId: userId, recipientId: me, status: 'pending' });
    if (!pending) return res.status(404).json({ message: 'Request not found' });

    pending.status = 'accepted';
    await pending.save();

    try {
      const meUser = await User.findById(me).select('name');
      await Notification.create({
        recipient: userId,
        sender: me,
        type: 'connection_accepted',
        content: `${meUser?.name || 'Someone'} accepted your connection request`
      });
    } catch (e) {}

    return res.json({ message: 'Connection request accepted' });
  } catch (error) {
    console.error('acceptRequest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject a connection request
exports.rejectRequest = async (req, res) => {
  try {
    const { userId } = req.params; // requester user id
    const me = req.user._id.toString();

    const pending = await Connection.findOne({ requesterId: userId, recipientId: me, status: 'pending' });
    if (!pending) return res.status(404).json({ message: 'Request not found' });
    pending.status = 'rejected';
    await pending.save();
    return res.json({ message: 'Connection request rejected' });
  } catch (error) {
    console.error('rejectRequest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a connection
exports.removeConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = req.user._id.toString();

    const conn = await Connection.findOne({
      $or: [
        { requesterId: me, recipientId: userId, status: 'accepted' },
        { requesterId: userId, recipientId: me, status: 'accepted' }
      ]
    });
    if (!conn) return res.status(404).json({ message: 'Connection not found' });
    await conn.deleteOne();
    return res.json({ message: 'Connection removed' });
  } catch (error) {
    console.error('removeConnection error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get connection status with another user
exports.getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = req.user._id.toString();
    const conn = await Connection.findOne({
      $or: [
        { requesterId: me, recipientId: userId },
        { requesterId: userId, recipientId: me }
      ]
    }).lean();
    let status = null;
    if (conn) {
      if (conn.status === 'accepted') status = 'connected';
      else if (conn.status === 'pending') status = conn.requesterId.toString() === me ? 'pending' : 'received';
    }
    return res.json({ status });
  } catch (error) {
    console.error('getConnectionStatus error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all connections (accepted)
exports.getConnections = async (req, res) => {
  try {
    const me = req.user._id.toString();
    const conns = await Connection.find({
      $or: [ { requesterId: me }, { recipientId: me } ],
      status: 'accepted'
    }).lean();
    const ids = conns.map(c => c.requesterId.toString() === me ? c.recipientId : c.requesterId);
    const users = await User.find({ _id: { $in: ids } }).select('name username avatarUrl role');
    return res.json(users);
  } catch (error) {
    console.error('getConnections error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending requests received
exports.getPendingRequests = async (req, res) => {
  try {
    const me = req.user._id.toString();
    const pendings = await Connection.find({ recipientId: me, status: 'pending' }).lean();
    const ids = pendings.map(p => p.requesterId);
    const users = await User.find({ _id: { $in: ids } }).select('name username avatarUrl role');
    return res.json(users);
  } catch (error) {
    console.error('getPendingRequests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get suggested connections
exports.getSuggestedConnections = async (req, res) => {
  try {
    const me = req.user._id.toString();
    const all = await Connection.find({ $or: [ { requesterId: me }, { recipientId: me } ] }).lean();
    const excluded = new Set([me]);
    for (const c of all) {
      excluded.add(c.requesterId.toString());
      excluded.add(c.recipientId.toString());
    }
    const users = await User.find({ _id: { $nin: Array.from(excluded) } }).select('name username avatarUrl role');
    return res.json(users);
  } catch (error) {
    console.error('getSuggestedConnections error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
