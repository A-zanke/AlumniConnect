const User = require("../models/User");
const Message = require("../models/Message");
const NotificationService = require("../services/notificationService");

// Get messages between current user and another user
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Check if users are connected
    const currentUser = await User.findById(currentUserId);
    const isConnected = currentUser.connections.includes(userId);

    if (!isConnected) {
      return res
        .status(403)
        .json({ message: "You can only message connected users" });
    }

    const messages = await Message.find({
      $or: [
        { from: currentUserId, to: userId },
        { from: userId, to: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    const formattedMessages = messages.map((msg) => ({
      id: msg._id,
      senderId: msg.from,
      recipientId: msg.to,
      content: msg.content,
      attachments: msg.attachments || [],
      timestamp: msg.createdAt,
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages" });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user._id;

    // Check if users are connected
    const currentUser = await User.findById(currentUserId);
    const recipient = await User.findById(userId);

    if (!recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    const isConnected = currentUser.connections.includes(userId);

    if (!isConnected) {
      return res
        .status(403)
        .json({ message: "You can only message connected users" });
    }

    const messageData = {
      from: currentUserId,
      to: userId,
      content: content || "",
    };

    // Handle image attachment if present
    if (req.file) {
      messageData.attachments = [`/uploads/messages/${req.file.filename}`];
    }

    // Create message
    const message = await Message.create(messageData);

    // Create notification for recipient
    await NotificationService.createNotification({
      recipientId: userId,
      senderId: currentUserId,
      type: "message",
      content: `${currentUser.name} sent you a message`,
    });

    res.status(201).json({
      id: message._id,
      senderId: message.from,
      recipientId: message.to,
      content: message.content,
      attachments: message.attachments || [],
      timestamp: message.createdAt,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender can delete their message
    if (message.from.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own messages" });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Error deleting message" });
  }
};

// Get conversation list for current user
exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get all unique conversation partners
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ from: currentUserId }, { to: currentUserId }],
        },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$from", currentUserId] }, "$to", "$from"],
          },
          lastMessage: { $last: "$content" },
          lastMessageTime: { $last: "$createdAt" },
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ]);

    // Populate user details
    const conversations = await User.populate(messages, {
      path: "_id",
      select: "name username avatarUrl",
    });

    res.json({ data: conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Error fetching conversations" });
  }
};
