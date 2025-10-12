const Message = require("../models/Message");
const Thread = require("../models/Thread");
const Block = require("../models/Block");
const Connection = require("../models/Connection");
const User = require("../models/User");

// Get all threads for current user
exports.getThreads = async (req, res) => {
  try {
    const userId = req.user._id;

    const threads = await Thread.find({ participants: userId })
      .populate("participants", "name username avatarUrl isOnline lastSeen")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 })
      .lean();

    res.json(threads);
  } catch (err) {
    console.error("Get threads error:", err);
    res.status(500).json({ message: "Failed to fetch threads" });
  }
};

// Get or create thread
exports.getOrCreateThread = async (req, res) => {
  try {
    const userId = req.user._id;
    const { participantId } = req.params;

    // Check if users are connected
    const connection = await Connection.findOne({
      $or: [
        { requester: userId, recipient: participantId, status: "accepted" },
        { requester: participantId, recipient: userId, status: "accepted" },
      ],
    });

    if (!connection) {
      return res.status(403).json({ message: "You must be connected to chat" });
    }

    // Check if either user has blocked the other
    const block = await Block.findOne({
      $or: [
        { blocker: userId, blocked: participantId },
        { blocker: participantId, blocked: userId },
      ],
    });

    if (block) {
      return res.status(403).json({ message: "Cannot chat with this user" });
    }

    let thread = await Thread.findOne({
      participants: { $all: [userId, participantId], $size: 2 },
    }).populate("participants", "name username avatarUrl isOnline lastSeen");

    if (!thread) {
      thread = await Thread.create({
        participants: [userId, participantId],
        unreadCount: new Map([
          [userId.toString(), 0],
          [participantId.toString(), 0],
        ]),
      });
      thread = await Thread.findById(thread._id).populate(
        "participants",
        "name username avatarUrl isOnline lastSeen"
      );
    }

    res.json(thread);
  } catch (err) {
    console.error("Get/create thread error:", err);
    res.status(500).json({ message: "Failed to get thread" });
  }
};

// Get messages in thread
exports.getMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { before, limit = 30 } = req.query;
    const userId = req.user._id;

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = {
      threadId,
      deletedFor: { $ne: userId },
    };

    if (before) {
      const beforeMsg = await Message.findById(before);
      if (beforeMsg) query.createdAt = { $lt: beforeMsg.createdAt };
    }

    const messages = await Message.find(query)
      .populate("senderId", "name username avatarUrl")
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: "name username avatarUrl" },
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(messages.reverse());
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { text, files, replyToId, clientKey } = req.body;
    const userId = req.user._id;

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check for duplicate using clientKey
    if (clientKey) {
      const existing = await Message.findOne({ threadId, clientKey });
      if (existing) {
        return res.json(existing);
      }
    }

    const messageData = {
      threadId,
      senderId: userId,
      body: text,
      clientKey,
      replyTo: replyToId || null,
    };

    if (files && files.length > 0) {
      messageData.media = files;
      messageData.kind = files[0].type;
    }

    const message = await Message.create(messageData);
    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "name username avatarUrl")
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: "name username avatarUrl" },
      });

    // Update thread
    await Thread.findByIdAndUpdate(threadId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      $inc: thread.participants.reduce((acc, p) => {
        if (!p.equals(userId)) {
          acc[`unreadCount.${p.toString()}`] = 1;
        }
        return acc;
      }, {}),
    });

    // Emit socket event
    req.io.to(threadId).emit("message:new", populatedMessage);

    // Send delivery status
    const otherParticipants = thread.participants.filter(
      (p) => !p.equals(userId)
    );
    otherParticipants.forEach((p) => {
      req.io.to(p.toString()).emit("message:sent", { messageId: message._id });
    });

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// Update message (reactions, edit)
exports.updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { addReaction, removeReaction, text } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (addReaction) {
      message.reactions = message.reactions.filter(
        (r) => !r.userId.equals(userId) || r.emoji !== addReaction
      );
      message.reactions.push({ userId, emoji: addReaction });
    }

    if (removeReaction) {
      message.reactions = message.reactions.filter(
        (r) => !r.userId.equals(userId) || r.emoji !== removeReaction
      );
    }

    if (text && message.senderId.equals(userId)) {
      message.body = text;
      message.editedAt = new Date();
    }

    await message.save();

    const updated = await Message.findById(id)
      .populate("senderId", "name username avatarUrl")
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: "name username avatarUrl" },
      });

    req.io.to(message.threadId.toString()).emit("message:updated", updated);

    res.json(updated);
  } catch (err) {
    console.error("Update message error:", err);
    res.status(500).json({ message: "Failed to update message" });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { scope = "me" } = req.query;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (scope === "everyone" && message.senderId.equals(userId)) {
      await Message.findByIdAndDelete(id);
      req.io
        .to(message.threadId.toString())
        .emit("message:deleted", { messageId: id, scope: "everyone" });
    } else {
      await Message.findByIdAndUpdate(id, {
        $addToSet: { deletedFor: userId },
      });
      req.io
        .to(userId.toString())
        .emit("message:deleted", { messageId: id, scope: "me" });
    }

    res.json({ message: "Message deleted" });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

// Mark thread as read
exports.markAsRead = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { upToMessageId } = req.body;
    const userId = req.user._id;

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Mark messages as read
    await Message.updateMany(
      {
        threadId,
        _id: { $lte: upToMessageId },
        senderId: { $ne: userId },
        "status.readBy.userId": { $ne: userId },
      },
      {
        $push: {
          "status.readBy": { userId, at: new Date() },
        },
      }
    );

    // Reset unread count
    thread.unreadCount.set(userId.toString(), 0);
    await thread.save();

    req.io.to(threadId).emit("messages:read", { userId, upToMessageId });

    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("Mark as read error:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
};

// Search messages
exports.searchMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { q, cursor, limit = 20 } = req.query;
    const userId = req.user._id;

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = {
      threadId,
      body: { $regex: q, $options: "i" },
      deletedFor: { $ne: userId },
    };

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const messages = await Message.find(query)
      .populate("senderId", "name username avatarUrl")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(messages);
  } catch (err) {
    console.error("Search messages error:", err);
    res.status(500).json({ message: "Failed to search" });
  }
};

// Get media/files/links
exports.getThreadMedia = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { type, cursor, limit = 20 } = req.query;
    const userId = req.user._id;

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { threadId, deletedFor: { $ne: userId } };

    if (type === "image" || type === "video" || type === "file") {
      query.kind = type;
    } else if (type === "link") {
      query.body = { $regex: /(https?:\/\/[^\s]+)/g };
    }

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const items = await Message.find(query)
      .populate("senderId", "name username avatarUrl")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(items);
  } catch (err) {
    console.error("Get thread media error:", err);
    res.status(500).json({ message: "Failed to fetch media" });
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user._id;

    await Block.create({ blocker: blockerId, blocked: userId });

    res.json({ message: "User blocked" });
  } catch (err) {
    console.error("Block user error:", err);
    res.status(500).json({ message: "Failed to block user" });
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user._id;

    await Block.findOneAndDelete({ blocker: blockerId, blocked: userId });

    res.json({ message: "User unblocked" });
  } catch (err) {
    console.error("Unblock user error:", err);
    res.status(500).json({ message: "Failed to unblock user" });
  }
};

// Delete chat
exports.deleteChat = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user._id;

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Mark all messages as deleted for this user
    await Message.updateMany(
      { threadId },
      { $addToSet: { deletedFor: userId } }
    );

    res.json({ message: "Chat deleted" });
  } catch (err) {
    console.error("Delete chat error:", err);
    res.status(500).json({ message: "Failed to delete chat" });
  }
};

// Clear chat
exports.clearChat = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user._id;

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Message.deleteMany({ threadId });
    await Thread.findByIdAndUpdate(threadId, {
      lastMessage: null,
      lastMessageAt: new Date(),
      unreadCount: new Map(thread.participants.map((p) => [p.toString(), 0])),
    });

    req.io.to(threadId).emit("chat:cleared", { threadId });

    res.json({ message: "Chat cleared" });
  } catch (err) {
    console.error("Clear chat error:", err);
    res.status(500).json({ message: "Failed to clear chat" });
  }
};

// Toggle star chat
exports.toggleStarChat = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user._id;

    const thread = await Thread.findById(threadId);
    if (!thread || !thread.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isStarred = thread.isStarred.includes(userId);

    if (isStarred) {
      thread.isStarred = thread.isStarred.filter((id) => !id.equals(userId));
    } else {
      thread.isStarred.push(userId);
    }

    await thread.save();

    res.json({
      message: isStarred ? "Chat unstarred" : "Chat starred",
      isStarred: !isStarred,
    });
  } catch (err) {
    console.error("Toggle star error:", err);
    res.status(500).json({ message: "Failed to toggle star" });
  }
};
