const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  static async createNotification({
    recipientId,
    senderId,
    type,
    content,
    relatedId = null,
    onModel = null
  }) {
    try {
      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Only include onModel and relatedId if provided
      const notificationData = {
        recipient: recipientId,
        sender: senderId,
        type,
        content
      };
      if (relatedId && onModel) {
        notificationData.relatedId = relatedId;
        notificationData.onModel = onModel;
      }

      // Create notification
      const notification = await Notification.create(notificationData);

      // Populate sender details
      await notification.populate('sender', 'name username avatarUrl');

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({
        recipient: userId,
        read: false
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { read: true },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found');
      }

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { recipient: userId, read: false },
        { read: true }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService; 