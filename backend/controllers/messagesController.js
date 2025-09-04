const Message = require('../models/Message');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');
const User = require('../models/User');

const ensureConnected = async (userIdA, userIdB) => {
  const connection = await Connection.findOne({
    $or: [
      { requesterId: userIdA, recipientId: userIdB, status: 'accepted' },
      { requesterId: userIdB, recipientId: userIdA, status: 'accepted' }
    ]
  }).lean();
  return Boolean(connection);
};

exports.getMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const me = req.user._id.toString();

    const isConnected = await ensureConnected(me, otherUserId);
    if (!isConnected) {
      return res.status(403).json({ message: 'Not connected' });
    }

    const messages = await Message.find({
      $or: [
        { from: me, to: otherUserId },
        { from: otherUserId, to: me }
      ]
    }).sort({ createdAt: 1 }).lean();

    const safe = messages.map(m => ({
      id: m._id,
      senderId: m.from,
      recipientId: m.to,
      content: typeof m.content === 'string' ? m.content : String(m.content || ''),
      timestamp: m.createdAt
    }));

    return res.json(safe);
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const me = req.user._id.toString();
    const { content } = req.body || {};

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: 'Message content required' });
    }

    const isConnected = await ensureConnected(me, otherUserId);
    if (!isConnected) {
      return res.status(403).json({ message: 'Not connected' });
    }

    const msg = await Message.create({ from: me, to: otherUserId, content: String(content) });

    try {
      const sender = await User.findById(me).select('name');
      await Notification.create({
        recipient: otherUserId,
        sender: me,
        type: 'message',
        content: `${sender?.name || 'Someone'} sent you a message`,
        relatedId: msg._id,
        onModel: 'Message'
      });
    } catch (e) {
      // Non-fatal
    }

    return res.status(201).json({
      id: msg._id,
      senderId: msg.from,
      recipientId: msg.to,
      content: msg.content,
      timestamp: msg.createdAt
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const me = req.user._id.toString();

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    if (msg.from.toString() !== me) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await msg.deleteOne();
    return res.json({ success: true });
  } catch (error) {
    console.error('deleteMessage error:', error);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
};

