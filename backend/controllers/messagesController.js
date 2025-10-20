const path = require("path");
const fs = require("fs").promises;
const User = require("../models/User");
const Message = require("../models/Message");
const Thread = require("../models/Thread");
const Block = require("../models/Block");
const NotificationService = require("../services/notificationService");

// Helper functions
async function isBlocked(userAId, userBId) {
  const [ab, ba] = await Promise.all([
    Block.findOne({ blocker: userAId, blocked: userBId }).lean(),
    Block.findOne({ blocker: userBId, blocked: userAId }).lean(),
  ]);
  return !!(ab || ba);
}

async function areConnected(userAId, userBId) {
  const user = await User.findById(userAId).select("connections");
  if (!user) return false;
  return user.connections.some((id) => id.toString() === String(userBId));
}

// Helpers for current schema (attachments used for flags/markers)
function parseReactionsFromAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((att) => typeof att === "string" && att.startsWith("react:"))
    .map((att) => {
      const parts = att.split(":");
      return {
        userId: parts[1],
        emoji: parts.slice(2).join(":"),
      };
    });
}

function normalizeReactions(doc) {
  if (Array.isArray(doc.reactions) && doc.reactions.length > 0) {
    return doc.reactions.map((r) => ({ userId: r.userId, emoji: r.emoji }));
  }
  return parseReactionsFromAttachments(doc.attachments);
}

function getAttachmentUrls(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((att) => {
      if (typeof att === "string" && att.startsWith("/uploads/")) return att;
      if (att && typeof att === "object" && att.url) return att.url;
      return null;
    })
    .filter(Boolean);
}

function isDeletedForViewer(doc, viewerId) {
  const atts = doc.attachments;
  if (!Array.isArray(atts)) return false;
  return (
    atts.includes(`deletedFor:${viewerId}`) || atts.includes("deletedForEveryone")
  );
}

function getReplyFromAttachments(attachments) {
  if (!Array.isArray(attachments)) return null;
  const marker = attachments.find(
    (att) => typeof att === "string" && att.startsWith("reply:")
  );
  if (!marker) return null;
  const id = marker.split(":")[1];
  return id ? { id } : null;
}

// Robust message parser that works with lean docs
function parseMessage(doc, viewerId) {
  try {
    if (isDeletedForViewer(doc, viewerId)) return null;

    const reactions = normalizeReactions(doc);

    const isStarred = Array.isArray(doc.attachments)
      ? doc.attachments.includes(`star:${viewerId}`)
      : false;

    const status = doc.isRead
      ? "seen"
      : doc.deliveredAt
      ? "delivered"
      : "sent";

    return {
      id: doc._id,
      messageId: doc.messageId,
      senderId: doc.from?._id || doc.from,
      recipientId: doc.to?._id || doc.to,
      content: doc.content || "",
      attachments: getAttachmentUrls(doc.attachments),
      messageType: doc.messageType,
      timestamp: doc.createdAt,
      status,
      isRead: !!doc.isRead,
      readAt: doc.readAt || null,
      deliveredAt: doc.deliveredAt || null,
      reactions,
      replyTo: getReplyFromAttachments(doc.attachments),
      isStarred,
    };
  } catch (e) {
    return null;
  }
}

// Get conversations with enhanced data
exports.getConversations = async (req, res) => {
  try {
    const me = req.user._id;

    // Get all messages involving the user
    const messages = await Message.find({
      $or: [{ from: me }, { to: me }],
    })
      .populate("from to", "name username avatarUrl isOnline lastSeen")
      .sort({ createdAt: -1 })
      .lean();

    const convMap = new Map();

    for (const msg of messages) {
      const otherId =
        String(msg.from._id) === String(me)
          ? String(msg.to._id)
          : String(msg.from._id);
      const otherUser = String(msg.from._id) === String(me) ? msg.to : msg.from;

      if (!convMap.has(otherId)) {
        // Get unread count for this conversation
        const unreadCount = await Message.countDocuments({
          from: otherId,
          to: me,
          isRead: false,
        });

    const snippet = msg.content?.trim()
      ? msg.content.trim().slice(0, 80)
      : Array.isArray(msg.attachments) && msg.attachments.length > 0
      ? getAttachmentSnippet(msg.attachments[0])
      : "No messages yet";

        // Try to get a thread id for this pair (optional)
        let threadId = null;
        try {
          const participants = [String(me), String(otherId)].sort();
          const thread = await Thread.findOne({
            participants: { $all: participants, $size: 2 },
          })
            .select("_id")
            .lean();
          if (thread) threadId = String(thread._id);
        } catch {}

        convMap.set(otherId, {
          _id: otherId,
          user: otherUser,
          lastMessage: snippet,
          lastMessageTime: msg.createdAt,
          unreadCount,
          threadId,
          isPinned: false, // You can implement conversation pinning
          isMuted: false, // You can implement conversation muting
          isArchived: false, // You can implement conversation archiving
        });
      }
    }

    const conversations = Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    // Get total unread count
    const totalUnread = await Message.countDocuments({
      to: me,
      isRead: false,
    });

    return res.json({
      data: conversations,
      totalUnread,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({
      message: "Error fetching conversations",
      success: false,
    });
  }
};

// Get messages with enhanced features
exports.getMessages = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;

    if (!other) return res.status(400).json({ message: "Missing userId" });

    const [connected, blocked] = await Promise.all([
      areConnected(me, other),
      isBlocked(me, other),
    ]);

    if (!connected)
      return res
        .status(403)
        .json({ message: "You can only message connected users" });
    if (blocked)
      return res
        .status(403)
        .json({ message: "Messaging is blocked between these users" });

    // Get messages with populated reply references
    const messages = await Message.find({
      $or: [
        { from: me, to: other },
        { from: other, to: me },
      ],
    })
      .populate("from to", "name username avatarUrl")
      .sort({ createdAt: 1 })
      .lean();

    const parsedMessages = messages
      .map((msg) => parseMessage(msg, me))
      .filter(Boolean);

    // Mark messages as read and delivered
    const readResult = await Message.updateMany(
      { from: other, to: me, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          deliveredAt: new Date(),
        },
      }
    );

    // Also clear unread count on Thread map for this user if the thread exists
    try {
      const participants = [String(me), String(other)].sort();
      await Thread.findOneAndUpdate(
        { participants: { $all: participants, $size: 2 } },
        {
          $set: { [`unreadCount.${me}`]: 0, [`lastReadAt.${me}`]: new Date() },
        }
      );
    } catch {}

    // Emit read receipts via socket
    if (req.io) {
      req.io.to(String(other)).emit("messages:readReceipt", {
        conversationId: `${me}_${other}`,
        readerId: String(me),
        readAt: new Date(),
      });

      // Emit conversation cleared count and updated total for the viewer
      const [participantsA, totalUnread] = await Promise.all([
        (async () => {
          const participants = [String(me), String(other)].sort();
          const thread = await Thread.findOne({
            participants: { $all: participants, $size: 2 },
          }).select("_id");
          if (thread) {
            req.io.to(String(me)).emit("unread:update", {
              conversationId: String(thread._id),
              newCount: 0,
            });
          }
        })(),
        Message.countDocuments({ to: me, isRead: false }),
      ]);

      req.io.to(String(me)).emit("unread:total", { total: totalUnread });
    }

    return res.json({
      messages: parsedMessages,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({
      message: "Error fetching messages",
      success: false,
    });
  }
};

// Enhanced send message with media support
exports.sendMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const to = req.params.userId || req.body.to;

    if (!to) return res.status(400).json({ message: "Missing recipient" });

    const [connected, blocked] = await Promise.all([
      areConnected(me, to),
      isBlocked(me, to),
    ]);

    if (!connected)
      return res
        .status(403)
        .json({ message: "You can only message connected users" });
    if (blocked)
      return res
        .status(403)
        .json({ message: "Messaging is blocked between these users" });

    const content = (req.body.content || "").toString();
    const messageType = req.body.messageType || "text";
    const clientKey = req.body.clientKey || null;

    // Process attachments
    const attachments = [];
    const files = req.files || {};

    // Handle different file types
    const fileFields = ["image", "media", "document", "audio", "video"];
    for (const field of fileFields) {
      if (files[field]) {
        const fileArray = Array.isArray(files[field])
          ? files[field]
          : [files[field]];
        for (const file of fileArray) {
          // Build correct public URL from stored path
          const uploadsRoot = path.join(__dirname, "../uploads");
          const rel = path.relative(uploadsRoot, file.path).replace(/\\/g, "/");
          const publicUrl = `/uploads/${rel}`; // e.g., /uploads/messages/images/<file>
          attachments.push(publicUrl);
        }
      }
    }

    // Handle reply (store as marker in attachments)
    let replyTo = null;
    if (req.body.replyToId) {
      const replyMessage = await Message.findById(req.body.replyToId).select("_id");
      if (replyMessage) {
        attachments.push(`reply:${replyMessage._id}`);
      }
    }

    // Handle forward
    let forwardedFrom = null;
    if (req.body.forwardedFromId) {
      const originalMessage = await Message.findById(req.body.forwardedFromId);
      if (originalMessage) {
        forwardedFrom = {
          originalSender: originalMessage.from,
          forwardCount: (originalMessage.forwardedFrom?.forwardCount || 0) + 1,
        };
      }
    }

    // Create message
    const messageData = {
      from: me,
      to,
      content,
      attachments,
      messageType,
      messageId:
        clientKey ||
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deliveredAt: new Date(),
    };

    // Handle location messages
    if (messageType === "location" && req.body.location) {
      messageData.location = req.body.location;
    }

    // Handle contact messages
    if (messageType === "contact" && req.body.contact) {
      messageData.contact = req.body.contact;
    }

    const message = await Message.create(messageData);
    const populatedMessage = await Message.findById(message._id)
      .populate("from to", "name username avatarUrl");

    const dto = parseMessage(populatedMessage.toObject(), me);

    // Update thread
    const participants = [String(me), String(to)].sort();
    const thread = await Thread.findOneAndUpdate(
      { participants: { $all: participants, $size: 2 } },
      {
        $setOnInsert: { participants },
        $set: {
          lastMessageAt: new Date(),
          lastMessage: message._id,
          [`lastReadAt.${me}`]: new Date(),
        },
        $inc: { [`unreadCount.${to}`]: 1 },
      },
      { upsert: true, new: true }
    );

    // Real-time notifications
    if (req.io) {
      // Send to recipient with normalized payload
      req.io.to(String(to)).emit("message:new", {
        conversationId: String(thread?._id || `${me}_${to}`),
        messageId: String(dto.id),
        senderId: String(me),
        body: dto.content,
        createdAt: dto.timestamp,
      });

      // Send delivery confirmation to sender
      req.io.to(String(me)).emit("message:delivered", {
        messageId: String(dto.id),
        clientKey,
        status: "delivered",
      });

      // Update unread counts for the conversation and total for recipient
      const [threadDoc, totalUnread] = await Promise.all([
        Thread.findById(thread?._id).select("unreadCount"),
        Message.countDocuments({ to, isRead: false }),
      ]);
      const convCount = threadDoc?.unreadCount?.get(String(to)) || 0;
      req.io.to(String(to)).emit("unread:update", {
        conversationId: String(thread?._id || `${me}_${to}`),
        newCount: convCount,
      });
      req.io.to(String(to)).emit("unread:total", { total: totalUnread });
    }

    return res.status(201).json({
      message: dto,
      success: true,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({
      message: "Error sending message",
      success: false,
    });
  }
};

// Enhanced message reactions (toggle)
exports.react = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId, emoji } = req.body || {};

    if (!messageId)
      return res.status(400).json({ message: "messageId required" });

    // Accept either Mongo _id or client messageId
    let message = null;
    if (messageId.match && messageId.match(/^[0-9a-fA-F]{24}$/)) {
      message = await Message.findById(messageId);
    }
    if (!message) {
      message = await Message.findOne({ messageId });
    }
    if (!message) return res.status(404).json({ message: "Message not found" });

    const isParticipant = [String(message.from), String(message.to)].includes(
      String(me)
    );
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

    // Toggle reaction in structured array (preferred)
    const currentIndex = (message.reactions || []).findIndex(
      (r) => String(r.userId) === String(me)
    );

    if (!emoji || String(emoji).trim() === "") {
      // remove any existing reaction for user
      if (currentIndex !== -1) {
        message.reactions.splice(currentIndex, 1);
      }
    } else if (currentIndex !== -1) {
      // same emoji => toggle off, different => update
      if (message.reactions[currentIndex].emoji === emoji) {
        message.reactions.splice(currentIndex, 1);
      } else {
        message.reactions[currentIndex].emoji = emoji;
        message.reactions[currentIndex].reactedAt = new Date();
      }
    } else {
      message.reactions = message.reactions || [];
      message.reactions.push({ userId: me, emoji, reactedAt: new Date() });
    }

    // Maintain legacy markers for backward compatibility (optional, can be removed later)
    const withoutLegacy = (message.attachments || []).filter(
      (att) => !(typeof att === "string" && att.startsWith(`react:${me}:`))
    );
    if (emoji && String(emoji).trim() !== "") {
      withoutLegacy.push(`react:${me}:${emoji}`);
    }
    message.attachments = withoutLegacy;

    await message.save();

    if (req.io) {
      const participants = [String(message.from), String(message.to)];
      participants.forEach((userId) => {
        req.io.to(userId).emit("message:reacted", {
          messageId: String(messageId),
          reactions: normalizeReactions(message),
          reactedBy: String(me),
          emoji,
        });
      });
    }

    return res.json({
      messageId: String(messageId),
      reactions: normalizeReactions(message),
      success: true,
    });
  } catch (error) {
    console.error("Error reacting to message:", error);
    return res.status(500).json({
      message: "Error reacting to message",
      success: false,
    });
  }
};

// Star/unstar message
exports.starMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId } = req.body || {};

    if (!messageId)
      return res.status(400).json({ message: "messageId required" });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const isParticipant = [String(message.from), String(message.to)].includes(
      String(me)
    );
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

    const marker = `star:${me}`;
    message.attachments = message.attachments || [];
    const has = message.attachments.includes(marker);
    if (has) {
      message.attachments = message.attachments.filter((a) => a !== marker);
    } else {
      message.attachments.push(marker);
    }
    await message.save();
    const isStarred = message.attachments.includes(marker);

    if (req.io) {
      req.io.to(String(me)).emit("message:starred", {
        messageId: String(messageId),
        isStarred,
      });
    }

    return res.json({
      messageId: String(messageId),
      isStarred,
      success: true,
    });
  } catch (error) {
    console.error("Error starring message:", error);
    return res.status(500).json({
      message: "Error starring message",
      success: false,
    });
  }
};

// Pin/unpin message
exports.pinMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId, pin = true } = req.body || {};

    if (!messageId)
      return res.status(400).json({ message: "messageId required" });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const isParticipant = [String(message.from), String(message.to)].includes(
      String(me)
    );
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

    // Track pin as per-user marker
    const pinMarker = `pin:${me}`;
    message.attachments = message.attachments || [];
    const hasPin = message.attachments.includes(pinMarker);
    if (pin && !hasPin) message.attachments.push(pinMarker);
    if (!pin && hasPin)
      message.attachments = message.attachments.filter((a) => a !== pinMarker);
    await message.save();

    if (req.io) {
      const participants = [String(message.from), String(message.to)];
      participants.forEach((userId) => {
        req.io.to(userId).emit("message:pinned", {
          messageId: String(messageId),
          isPinned: pin,
          pinnedBy: String(me),
        });
      });
    }

    return res.json({
      messageId: String(messageId),
      isPinned: pin,
      success: true,
    });
  } catch (error) {
    console.error("Error pinning message:", error);
    return res.status(500).json({
      message: "Error pinning message",
      success: false,
    });
  }
};

// Enhanced delete message
exports.deleteMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId } = req.params;
    const scope = (req.body?.for || req.query?.for || "me").toLowerCase();

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const isParticipant = [String(message.from), String(message.to)].includes(
      String(me)
    );
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

    if (scope === "everyone") {
      if (String(message.from) !== String(me)) {
        return res
          .status(403)
          .json({ message: "Only sender can delete for everyone" });
      }

      // Check if message is within delete time limit (e.g., 1 hour)
      const deleteTimeLimit = 60 * 60 * 1000; // 1 hour
      const messageAge = Date.now() - new Date(message.createdAt).getTime();

      if (messageAge > deleteTimeLimit) {
        return res
          .status(403)
          .json({ message: "Delete for everyone time limit exceeded" });
      }

      message.deletedForEveryone = true;
      message.deletedAt = new Date();
      await message.save();

      if (req.io) {
        [String(message.from), String(message.to)].forEach((userId) => {
          req.io.to(userId).emit("message:deleted", {
            messageId: String(messageId),
            scope: "everyone",
          });
        });
      }
    } else {
      // Delete for me only
      if (!message.deletedFor.includes(me)) {
        message.deletedFor.push(me);
        await message.save();
      }

      if (req.io) {
        req.io.to(String(me)).emit("message:deleted", {
          messageId: String(messageId),
          scope: "me",
        });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({
      message: "Error deleting message",
      success: false,
    });
  }
};

// Bulk delete messages
exports.bulkDelete = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageIds = [], for: scope = "me" } = req.body || {};

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: "messageIds required" });
    }

    const messages = await Message.find({ _id: { $in: messageIds } });
    const result = { updated: 0, deleted: 0, errors: [] };

    for (const message of messages) {
      const isParticipant = [String(message.from), String(message.to)].includes(
        String(me)
      );
      if (!isParticipant) {
        result.errors.push(`No permission for message ${message._id}`);
        continue;
      }

      if (scope === "everyone") {
        if (String(message.from) !== String(me)) {
          result.errors.push(
            `Cannot delete message ${message._id} for everyone`
          );
          continue;
        }

        message.deletedForEveryone = true;
        message.deletedAt = new Date();
        await message.save();
        result.deleted += 1;
      } else {
        if (!message.deletedFor.includes(me)) {
          message.deletedFor.push(me);
          await message.save();
        }
        result.updated += 1;
      }
    }

    if (req.io) {
      req.io.to(String(me)).emit("messages:bulkDeleted", {
        messageIds,
        scope,
        result,
      });
    }

    return res.json({ ...result, success: true });
  } catch (error) {
    console.error("Error bulk deleting messages:", error);
    return res.status(500).json({
      message: "Error bulk deleting messages",
      success: false,
    });
  }
};

// Get shared media
exports.getMedia = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    const { type = "all", page = 1, limit = 50 } = req.query;

    if (!other) return res.status(400).json({ message: "Missing userId" });

    const query = {
      $or: [
        { from: me, to: other },
        { from: other, to: me },
      ],
      deletedForEveryone: false,
      deletedFor: { $ne: me },
      "attachments.0": { $exists: true },
    };

    // Filter by media type
    if (type !== "all") {
      query["attachments.type"] = type;
    }

    const messages = await Message.find(query)
      .populate("from", "name username avatarUrl")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const media = [];
    const links = [];

    messages.forEach((msg) => {
      msg.attachments.forEach((attachment) => {
        const mediaItem = {
          id: msg._id,
          messageId: msg.messageId,
          url: attachment.url,
          type: attachment.type,
          filename: attachment.filename,
          size: attachment.size,
          mimeType: attachment.mimeType,
          thumbnail: attachment.thumbnail,
          timestamp: msg.createdAt,
          sender: msg.from,
          isStarred: msg.isStarred.includes(me),
        };

        if (attachment.type === "link") {
          links.push(mediaItem);
        } else {
          media.push(mediaItem);
        }
      });
    });

    // Extract links from message content
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    messages.forEach((msg) => {
      if (msg.content) {
        const foundLinks = msg.content.match(linkRegex);
        if (foundLinks) {
          foundLinks.forEach((link) => {
            links.push({
              id: msg._id,
              messageId: msg.messageId,
              url: link,
              type: "link",
              title: extractLinkTitle(link),
              timestamp: msg.createdAt,
              sender: msg.from,
              isStarred: msg.isStarred.includes(me),
            });
          });
        }
      }
    });

    const totalCount = await Message.countDocuments(query);

    return res.json({
      media: type === "link" ? links : media,
      links: type === "all" ? links : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching media:", error);
    return res.status(500).json({
      message: "Error fetching media",
      success: false,
    });
  }
};

// Get starred messages
exports.getStarredMessages = async (req, res) => {
  try {
    const me = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({
      $or: [{ from: me }, { to: me }],
      isStarred: me,
      deletedForEveryone: false,
      deletedFor: { $ne: me },
    })
      .populate("from to", "name username avatarUrl")
      .populate("replyTo.messageId", "content from")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const parsedMessages = messages
      .map((msg) => parseMessage(msg, me))
      .filter(Boolean);
    const totalCount = await Message.countDocuments({
      $or: [{ from: me }, { to: me }],
      isStarred: me,
      deletedForEveryone: false,
      deletedFor: { $ne: me },
    });

    return res.json({
      messages: parsedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching starred messages:", error);
    return res.status(500).json({
      message: "Error fetching starred messages",
      success: false,
    });
  }
};

// Search messages
exports.searchMessages = async (req, res) => {
  try {
    const me = req.user._id;
    const { query, userId, page = 1, limit = 20 } = req.query;

    if (!query)
      return res.status(400).json({ message: "Search query required" });

    const searchQuery = {
      $or: [{ from: me }, { to: me }],
      deletedForEveryone: false,
      deletedFor: { $ne: me },
      $text: { $search: query },
    };

    // Filter by specific user if provided
    if (userId) {
      searchQuery.$or = [
        { from: me, to: userId },
        { from: userId, to: me },
      ];
    }

    const messages = await Message.find(searchQuery)
      .populate("from to", "name username avatarUrl")
      .sort({ score: { $meta: "textScore" }, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const parsedMessages = messages
      .map((msg) => parseMessage(msg, me))
      .filter(Boolean);
    const totalCount = await Message.countDocuments(searchQuery);

    return res.json({
      messages: parsedMessages,
      query,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      success: true,
    });
  } catch (error) {
    console.error("Error searching messages:", error);
    return res.status(500).json({
      message: "Error searching messages",
      success: false,
    });
  }
};

// Block/unblock user
exports.block = async (req, res) => {
  try {
    const me = req.user._id;
    const { targetUserId, action } = req.body || {};

    if (!targetUserId)
      return res.status(400).json({ message: "targetUserId required" });
    if (!action || !["block", "unblock"].includes(action)) {
      return res
        .status(400)
        .json({ message: "action must be 'block' or 'unblock'" });
    }

    if (action === "block") {
      await Block.updateOne(
        { blocker: me, blocked: targetUserId },
        { $setOnInsert: { blocker: me, blocked: targetUserId } },
        { upsert: true }
      );
    } else {
      await Block.deleteOne({ blocker: me, blocked: targetUserId });
    }

    // Emit real-time update
    if (req.io) {
      req.io.to(String(me)).emit("user:blocked", {
        userId: targetUserId,
        action,
        timestamp: new Date(),
      });
    }

    return res.json({
      action,
      targetUserId,
      success: true,
    });
  } catch (error) {
    console.error("Error updating block:", error);
    return res.status(500).json({
      message: "Error updating block",
      success: false,
    });
  }
};

// Report user
exports.report = async (req, res) => {
  try {
    const me = req.user._id;
    const { targetUserId, reason, messageId } = req.body || {};

    if (!targetUserId)
      return res.status(400).json({ message: "targetUserId required" });

    // Create report notification for admins
    const admins = await User.find({ role: "admin" }).select("_id");
    const reportContent = `User report: ${me} reported ${targetUserId}${
      reason ? ` - Reason: ${reason}` : ""
    }${messageId ? ` - Message: ${messageId}` : ""}`;

    await Promise.all(
      admins.map((admin) =>
        NotificationService.createNotification({
          recipientId: admin._id,
          senderId: me,
          type: "message",
          content: reportContent,
          relatedId: messageId || targetUserId,
          onModel: messageId ? "Message" : undefined,
        })
      )
    );

    return res.status(201).json({
      message: "Report submitted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error reporting user:", error);
    return res.status(500).json({
      message: "Error reporting user",
      success: false,
    });
  }
};

// Get message info
exports.getMessageInfo = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate("from to", "name username avatarUrl")
      .populate("reactions.userId", "name username avatarUrl");

    if (!message) return res.status(404).json({ message: "Message not found" });

    const isParticipant = [
      String(message.from._id),
      String(message.to._id),
    ].includes(String(me));
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

    const messageInfo = {
      id: message._id,
      content: message.content,
      sender: message.from,
      recipient: message.to,
      timestamp: message.createdAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      reactions: message.reactions,
      isStarred: message.isStarred.includes(me),
      isPinned: message.isPinned,
      isEdited: message.isEdited,
      editHistory: message.editHistory,
      attachments: message.attachments,
      messageType: message.messageType,
    };

    return res.json({
      messageInfo,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching message info:", error);
    return res.status(500).json({
      message: "Error fetching message info",
      success: false,
    });
  }
};

// Delete entire chat
exports.deleteChat = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    const scope = (req.body?.for || req.query?.for || "me").toLowerCase();

    if (!other) return res.status(400).json({ message: "Missing userId" });

    if (scope === "everyone") {
      // Delete all messages between users
      await Message.updateMany(
        {
          $or: [
            { from: me, to: other },
            { from: other, to: me },
          ],
        },
        {
          $set: {
            deletedForEveryone: true,
            deletedAt: new Date(),
          },
        }
      );

      if (req.io) {
        req.io.to(String(me)).emit("chat:deleted", {
          userId: other,
          scope: "everyone",
        });
        req.io.to(String(other)).emit("chat:deleted", {
          userId: String(me),
          scope: "everyone",
        });
      }
    } else {
      // Mark as deleted for current user only
      await Message.updateMany(
        {
          $or: [
            { from: me, to: other },
            { from: other, to: me },
          ],
        },
        {
          $addToSet: { deletedFor: me },
        }
      );

      if (req.io) {
        req.io.to(String(me)).emit("chat:deleted", {
          userId: other,
          scope: "me",
        });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return res.status(500).json({
      message: "Error deleting chat",
      success: false,
    });
  }
};

// Helper functions
function getFileType(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

function getAttachmentSnippet(attachment) {
  switch (attachment.type) {
    case "image":
      return "📷 Photo";
    case "video":
      return "🎥 Video";
    case "audio":
      return "🎵 Audio";
    case "document":
      return "📄 Document";
    default:
      return "📎 Attachment";
  }
}

function extractLinkTitle(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    return "Link";
  }
}

async function generateVideoThumbnail(videoPath) {
  // Implement video thumbnail generation logic here
  // You can use ffmpeg or similar library
  return null;
}

// Get blocked users
exports.getBlocks = async (req, res) => {
  try {
    const me = req.user._id;
    const [blocked, blockedBy] = await Promise.all([
      Block.find({ blocker: me })
        .populate("blocked", "name username avatarUrl")
        .lean(),
      Block.find({ blocked: me })
        .populate("blocker", "name username avatarUrl")
        .lean(),
    ]);

    return res.json({
      blocked: blocked.map((b) => b.blocked),
      blockedBy: blockedBy.map((b) => b.blocker),
      success: true,
    });
  } catch (error) {
    console.error("Error fetching block list:", error);
    return res.status(500).json({
      message: "Error fetching block list",
      success: false,
    });
  }
};
