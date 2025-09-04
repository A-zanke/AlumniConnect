const Notification = require('../models/Notification');

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const { recipient, type, content, relatedId, onModel } = req.body;

    if (!recipient || !type) {
      return res.status(400).json({ message: 'Recipient and type required' });
    }

    // ✅ Ensure content is always string
    const safeContent =
      typeof content === 'string' ? content : JSON.stringify(content);

    const notification = await Notification.create({
      recipient,
      sender: req.user._id,
      type,
      content: safeContent,
      relatedId: relatedId || null,
      onModel: onModel || null,
    });

    res.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all my notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .populate('sender', 'name username avatarUrl')
      .sort({ createdAt: -1 });

    // ✅ Convert any object content to string just in case
    const safe = notifications.map((n) => ({
      ...n.toObject(),
      content:
        typeof n.content === 'string' ? n.content : JSON.stringify(n.content),
    }));

    res.json(safe);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: error.message });
  }
};
