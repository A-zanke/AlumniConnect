// c:/Users/ASUS/Downloads/Telegram Desktop/AlumniConnect/AlumniConnect/backend/controllers/messagesController.js
const path = require("path");
const mongoose = require("mongoose");
// Use fs with both constants and promises APIs
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const Message = require("../models/Message");
const Thread = require("../models/Thread");
const Block = require("../models/Block");
const NotificationService = require("../services/notificationService");

// Helper functions
async function isBlocked(userAId, userBId) {
  // Ensure proper ObjectId casting where needed
  try {
    const a = String(userAId);
    const b = String(userBId);
    const [ab, ba] = await Promise.all([
      Block.findOne({ blocker: a, blocked: b }).lean(),
      Block.findOne({ blocker: b, blocked: a }).lean(),
    ]);
    return !!(ab || ba);
  } catch (e) {
    return false;
  }
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
      if (typeof att === "string") {
        // Only surface real media URLs; ignore any legacy local paths or markers
        if (/^https?:\/\//i.test(att)) return att;
        return null;
      }
      if (att && typeof att === "object" && att.url) return att.url;
      return null;
    })
    .filter(Boolean);
}

function isDeletedForViewer(doc, viewerId) {
  // Consider both legacy attachment markers and structured fields
  const atts = doc.attachments || [];
  const deletedForArray = doc.deletedFor || [];
  const viewerIdStr = String(viewerId);
  const deletedForMe = Array.isArray(deletedForArray)
    ? deletedForArray.some((id) => String(id) === viewerIdStr)
    : false;
  const deletedForEveryone = !!doc.deletedForEveryone || atts.includes("deletedForEveryone");
  const legacyDeletedForMe = atts.includes(`deletedFor:${viewerIdStr}`);
  return deletedForEveryone || deletedForMe || legacyDeletedForMe;
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
    const atts = doc.attachments || [];
    const isDeletedEveryone = !!doc.deletedForEveryone || atts.includes("deletedForEveryone") || (doc.metadata && doc.metadata.deleted);
    const deletedForArray = doc.deletedFor || [];
    const viewerIdStr = String(viewerId);
    const isDeletedForMe = atts.includes(`deletedFor:${viewerIdStr}`) || (Array.isArray(deletedForArray) && deletedForArray.some((id) => String(id) === viewerIdStr));

    const reactions = normalizeReactions(doc);

    const isStarred = Array.isArray(doc.attachments)
      ? doc.attachments.includes(`star:${viewerId}`)
      : false;

    const status = doc.isRead ? "seen" : doc.deliveredAt ? "delivered" : "sent";

    // Deleted for everyone -> show a shared placeholder
    if (isDeletedEveryone) {
      return {
        id: doc._id,
        messageId: doc.messageId,
        senderId: doc.from?._id || doc.from,
        recipientId: doc.to?._id || doc.to,
        content: "This message was deleted",
        attachments: [],
        messageType: "text",
        timestamp: doc.createdAt,
        status,
        isRead: !!doc.isRead,
        readAt: doc.readAt || null,
        deliveredAt: doc.deliveredAt || null,
        reactions,
        replyTo: null,
        isStarred,
        placeholder: true,
        deletedScope: "everyone",
      };
    }

    // Deleted for viewer only -> show personal placeholder
    if (isDeletedForMe) {
      return {
        id: doc._id,
        messageId: doc.messageId,
        senderId: doc.from?._id || doc.from,
        recipientId: doc.to?._id || doc.to,
        content: "You deleted this message (only visible to you)",
        attachments: [],
        messageType: "text",
        timestamp: doc.createdAt,
        status,
        isRead: !!doc.isRead,
        readAt: doc.readAt || null,
        deliveredAt: doc.deliveredAt || null,
        reactions,
        replyTo: null,
        isStarred,
        placeholder: true,
        deletedScope: "me",
      };
    }

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
    if (!mongoose.Types.ObjectId.isValid(other)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

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
    if (!mongoose.Types.ObjectId.isValid(to)) {
      return res.status(400).json({ message: "Invalid recipient user ID" });
    }

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
    // Always ensure a non-null clientKey for unique index (threadId + clientKey)
    const clientKey = req.body.clientKey || `ck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log("sendMessage called:", {
      recipientId: req.params.userId,
      hasContent: !!req.body.content,
      files: req.files ? Object.keys(req.files) : [],
      body: req.body,
    });

    // Process attachments via Cloudinary
    const attachments = [];
    const files = req.files || {};
    if (req.files && Object.keys(req.files).length > 0) {
      const fileFields = ["image", "media", "document", "audio", "video"];
      for (const field of fileFields) {
        const arr = files[field];
        if (!arr) continue;
        const fileArray = Array.isArray(arr) ? arr : [arr];
        for (const file of fileArray) {
          // Prefer Cloudinary secure_url; fallback to path/url
          const url = file.secure_url || file.path || file.url || null;
          if (url) attachments.push(url);
        }
      }
    }

    // If frontend sent base64/remote URLs, normalize them
    if (Array.isArray(req.body.attachments)) {
      for (const a of req.body.attachments) {
        if (typeof a === "string" && /^https?:\/\//i.test(a))
          attachments.push(a);
      }
    }

    // Handle reply (store as marker in attachments)
    let replyTo = null;
    if (req.body.replyToId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.replyToId)) {
        return res.status(400).json({ message: "Invalid reply message ID" });
      }
      const replyMessage = await Message.findById(req.body.replyToId).select(
        "_id"
      );
      if (replyMessage) {
        attachments.push(`reply:${replyMessage._id}`);
      }
    }

    // Handle forward
    let forwardedFrom = null;
    if (req.body.forwardedFromId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.forwardedFromId)) {
        return res.status(400).json({ message: "Invalid forward message ID" });
      }
      const originalMessage = await Message.findById(req.body.forwardedFromId);
      if (originalMessage) {
        forwardedFrom = {
          originalSender: originalMessage.from,
          forwardCount: (originalMessage.forwardedFrom?.forwardCount || 0) + 1,
        };
      }
    }

    // Validate at least one of content or attachments exists
    if (!content.trim() && attachments.length === 0) {
      return res.status(400).json({
        message: "Message must have content or attachments",
        success: false,
      });
    }

    // Ensure thread exists BEFORE message so we can set threadId
    const participants = [String(me), String(to)].sort();
    let thread = await Thread.findOne({
      participants: { $all: participants, $size: 2 },
    });
    if (!thread) {
      thread = await Thread.create({ participants });
    }

    // Create message
    const messageData = {
      from: me,
      to,
      content,
      attachments,
      messageType,
      clientKey,
      threadId: String(thread._id),
      messageId:
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
    const populatedMessage = await Message.findById(message._id).populate(
      "from to",
      "name username avatarUrl"
    );

    const dto = parseMessage(populatedMessage.toObject(), me);

    // Update thread
    // Now update fields separately
    thread.lastMessageAt = new Date();
    thread.lastMessage = message._id;
    thread.lastReadAt.set(String(me), new Date());
    const currentUnread = thread.unreadCount.get(String(to)) || 0;
    thread.unreadCount.set(String(to), currentUnread + 1);
    await thread.save();

    // Real-time notifications
    if (req.io) {
      // Send to recipient with normalized payload including attachments for rich preview
      req.io.to(String(to)).emit("message:new", {
        conversationId: String(thread?._id || `${me}_${to}`),
        messageId: String(dto.id),
        senderId: String(me),
        body: dto.content,
        attachments: dto.attachments || [],
        createdAt: dto.timestamp,
      });

      // Send delivery confirmation to sender
      req.io.to(String(me)).emit("message:delivered", {
        messageId: String(dto.id),
        clientKey,
        status: "delivered",
      });

      // Create a realtime notification item for the recipient
      try {
        const note = await NotificationService.createNotification({
          recipientId: to,
          senderId: me,
          type: "message",
          content: dto.attachments && dto.attachments.length > 0 ? "sent you a media" : dto.content?.slice(0, 80) || "sent you a message",
          relatedId: dto.id,
          onModel: "Message",
        });
        if (note) {
          req.io.to(String(to)).emit("notification:new", note);
        }
      } catch {}

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
    // Detailed error logging
    console.error("Error sending message:", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      stack: error.stack,
      requestBody: req.body,
      filesReceived: req.files ? Object.keys(req.files) : null,
      userIds: { from: req.user._id, to: req.params.userId || req.body.to },
    });
    // Specific error messages
    let message = "Error sending message";
    if (error.code === "LIMIT_FILE_SIZE") {
      message = "File too large";
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Invalid file type";
    } else if (error.message.includes("upload")) {
      message = "File upload failed";
    }
    return res.status(500).json({
      message,
      success: false,
    });
  }
};

// Enhanced message reactions (toggle)
exports.react = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId, emoji, to } = req.body || {};

    if (!messageId)
      return res.status(400).json({ message: "messageId required" });

    // Allow removing reaction when emoji is empty/null.
    // If provided, do a light validation only (string and reasonable length).
    const isRemoval = emoji === undefined || emoji === null || String(emoji).trim() === "";
    if (!isRemoval) {
      const emojiStr = String(emoji);
      if (typeof emojiStr !== "string" || emojiStr.trim() === "" || emojiStr.length > 16) {
        return res.status(400).json({ message: "Invalid emoji" });
      }
    }

    // Validate recipient user id (if provided)
    if (to && !mongoose.Types.ObjectId.isValid(to)) {
      return res.status(400).json({ message: "Invalid recipient ID" });
    }

    // Accept either Mongo _id or client messageId
    let message = null;
    if (mongoose.Types.ObjectId.isValid(messageId)) {
      message = await Message.findById(messageId);
    }
    if (!message) {
      message = await Message.findOne({ messageId });
    }
    if (!message) return res.status(404).json({ message: "Message not found" });

    const isParticipant =
      String(message.from) === String(me) || String(message.to) === String(me);
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

    // Toggle reaction in structured array (preferred)
    if (!Array.isArray(message.reactions)) message.reactions = [];
    const currentIndex = message.reactions.findIndex(
      (r) => String(r.userId) === String(me)
    );

    if (isRemoval) {
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
    if (!Array.isArray(message.attachments)) message.attachments = [];
    const withoutLegacy = message.attachments.filter(
      (att) => !(typeof att === "string" && att.startsWith(`react:${me}:`))
    );
    if (!isRemoval) {
      withoutLegacy.push(`react:${me}:${emoji}`);
    }
    message.attachments = withoutLegacy;

    await message.save();

    if (req.io) {
      const pFrom = String(message.from);
      const pTo = String(message.to);
      req.io.to(pFrom).emit("message:reacted", {
        messageId: String(message._id),
        reactions: normalizeReactions(message),
        reactedBy: String(me),
        emoji,
      });
      req.io.to(pTo).emit("message:reacted", {
        messageId: String(message._id),
        reactions: normalizeReactions(message),
        reactedBy: String(me),
        emoji,
      });
    }

    return res.json({
      messageId: String(message._id),
      reactions: normalizeReactions(message),
      success: true,
    });
  } catch (error) {
    // Detailed logging before error response
    console.error("Error reacting to message:", {
      messageId: req.body?.messageId,
      emoji: req.body?.emoji,
      userId: req.user._id,
      errorMessage: error.message,
      errorStack: error.stack,
      messageIdFormat: req.body?.messageId
        ? req.body.messageId.match(/^[0-9a-fA-F]{24}$/)
          ? "MongoDB ObjectId"
          : "Client messageId"
        : "None",
      findOneSucceeded: false, // Since we're in catch, assume not
    });
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

      // Replace content and strip media so both sides see a placeholder
      message.content = "This message was deleted";
      message.attachments = [];
      message.messageType = "text";
      message.metadata = { ...(message.metadata || {}), deleted: true };
      await message.save();

      if (req.io) {
        [String(message.from), String(message.to)].forEach((userId) => {
          req.io.to(userId).emit("message:deleted", {
            messageId: String(messageId),
            scope: "everyone",
            placeholder: true,
          });
        });
      }
    } else {
      // Delete for me only
      message.attachments = message.attachments || [];
      const marker = `deletedFor:${me}`;
      if (!message.attachments.includes(marker)) {
        message.attachments.push(marker);
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

// Bulk delete chats
exports.bulkDeleteChats = async (req, res) => {
  try {
    const me = req.user._id;
    const { chatIds = [] } = req.body || {};

    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({ message: "chatIds required" });
    }

    // Validation: ensure each chatId is a valid user ID
    const invalidIds = chatIds.filter((id) => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: `Invalid chatIds: ${invalidIds.join(", ")}`,
        success: false,
      });
    }

    const results = [];

    for (const userId of chatIds) {
      try {
        // Call existing deleteChat logic
        const deleteResult = await exports.deleteChat(
          {
            user: { _id: me },
            params: { userId },
            body: { for: "me" },
            io: req.io,
          },
          {
            json: (data) => data,
            status: (code) => ({ json: (data) => ({ ...data, status: code }) }),
          }
        );
        results.push({ userId, success: true });
        // Emit socket event for successful deletion
        if (req.io) {
          req.io.to(String(me)).emit("chat:deleted", {
            userId,
            scope: "me",
          });
        }
      } catch (err) {
        results.push({ userId, success: false, error: err.message });
      }
    }

    const totalSuccess = results.filter((r) => r.success).length;
    const totalFailed = results.length - totalSuccess;

    return res.json({
      results,
      totalSuccess,
      totalFailed,
      success: true,
    });
  } catch (error) {
    console.error("Error bulk deleting chats:", error);
    return res.status(500).json({
      message: "Error bulk deleting chats",
      success: false,
    });
  }
};

// Bulk block users
exports.bulkBlockUsers = async (req, res) => {
  try {
    const me = req.user._id;
    const { userIds = [] } = req.body || {};

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds required" });
    }

    // Validation: ensure each userId is valid
    const invalidIds = userIds.filter((id) => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: `Invalid userIds: ${invalidIds.join(", ")}`,
        success: false,
      });
    }

    const results = [];

    for (const userId of userIds) {
      try {
        // Call existing block logic
        const blockResult = await exports.block(
          {
            user: { _id: me },
            body: { targetUserId: userId, action: "block" },
            io: req.io,
          },
          {
            json: (data) => data,
            status: (code) => ({ json: (data) => ({ ...data, status: code }) }),
          }
        );
        results.push({ userId, success: true });
      } catch (err) {
        results.push({ userId, success: false, error: err.message });
      }
    }

    const totalSuccess = results.filter((r) => r.success).length;
    const totalFailed = results.length - totalSuccess;

    return res.json({
      results,
      totalSuccess,
      totalFailed,
      success: true,
    });
  } catch (error) {
    console.error("Error bulk blocking users:", error);
    return res.status(500).json({
      message: "Error bulk blocking users",
      success: false,
    });
  }
};

// Bulk report users
exports.bulkReportUsers = async (req, res) => {
  try {
    const me = req.user._id;
    const { userIds = [] } = req.body || {};

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds required" });
    }

    // Validation: ensure each userId is valid
    const invalidIds = userIds.filter((id) => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: `Invalid userIds: ${invalidIds.join(", ")}`,
        success: false,
      });
    }

    const results = [];

    for (const userId of userIds) {
      try {
        // Call existing report logic with reason
        const reportResult = await exports.report(
          {
            user: { _id: me },
            body: {
              targetUserId: userId,
              reason: req.body.reason || "Bulk report",
            },
            io: req.io,
          },
          {
            json: (data) => data,
            status: (code) => ({ json: (data) => ({ ...data, status: code }) }),
          }
        );
        results.push({ userId, success: true });
      } catch (err) {
        results.push({ userId, success: false, error: err.message });
      }
    }

    const totalSuccess = results.filter((r) => r.success).length;
    const totalFailed = results.length - totalSuccess;

    return res.json({
      results,
      totalSuccess,
      totalFailed,
      success: true,
    });
  } catch (error) {
    console.error("Error bulk reporting users:", error);
    return res.status(500).json({
      message: "Error bulk reporting users",
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
      (msg.attachments || []).forEach((attachment) => {
        const url = typeof attachment === "string" ? attachment : attachment?.url;
        if (!url) return;
        const lower = url.toLowerCase();
        const type =
          /\.(jpg|jpeg|png|gif|webp|bmp|tiff)(\?.*)?$/.test(lower)
            ? "image"
            : /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/.test(lower)
            ? "video"
            : /\.(mp3|wav|ogg|m4a|aac|flac|opus|wma)(\?.*)?$/.test(lower)
            ? "audio"
            : "document";

        const mediaItem = {
          id: msg._id,
          messageId: msg.messageId,
          url,
          type,
          filename: undefined,
          size: undefined,
          mimeType: undefined,
          thumbnail: undefined,
          timestamp: msg.createdAt,
          sender: msg.from,
          isStarred: Array.isArray(msg.isStarred)
            ? msg.isStarred.includes(me)
            : false,
        };

        media.push(mediaItem);
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

    console.log("Block request:", { me, targetUserId, action });

    if (!targetUserId)
      return res.status(400).json({ message: "targetUserId required" });

    // Validate targetUserId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid targetUserId format" });
    }

    // Prevent user from blocking themselves
    if (String(me) === String(targetUserId)) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    if (!action || !["block", "unblock"].includes(action)) {
      return res
        .status(400)
        .json({ message: "action must be 'block' or 'unblock'" });
    }

    // Normalize id types to strings for consistent matching
    const blockerId = String(me);
    const blockedId = String(targetUserId);

    try {
      if (action === "block") {
        await Block.updateOne(
          { blocker: blockerId, blocked: blockedId },
          { $setOnInsert: { blocker: blockerId, blocked: blockedId } },
          { upsert: true }
        );
      } else {
        await Block.deleteOne({ blocker: blockerId, blocked: blockedId });
      }
    } catch (dbError) {
      console.error("Database error in block operation:", dbError);
      return res.status(500).json({
        message: "Database error during block operation",
        success: false,
      });
    }

    // Create a system message for the blocker only (like WhatsApp banner)
    try {
      const participants = [String(me), String(targetUserId)].sort();
      let thread = await Thread.findOne({
        participants: { $all: participants, $size: 2 },
      });
      if (!thread) thread = await Thread.create({ participants });

      const text = action === "block"
        ? `You blocked this contact on ${new Date().toLocaleString()}`
        : `You unblocked this contact on ${new Date().toLocaleString()}`;

      const sys = await Message.create({
        from: me,
        to: targetUserId,
        content: text,
        messageType: "text",
        threadId: String(thread._id),
        metadata: { system: true, systemCode: action },
        // hide from the other participant
        deletedFor: [targetUserId],
      });

      // Emit to blocker timeline only
      if (req.io) {
        req.io.to(String(me)).emit("message:new", {
          conversationId: String(thread._id),
          messageId: String(sys._id),
          senderId: String(me),
          body: text,
          attachments: [],
          createdAt: sys.createdAt,
        });
      }
    } catch (e) {
      console.warn("Failed to append system block/unblock banner:", e.message);
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
    console.error("Error updating block:", error, error.stack);
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

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid targetUserId" });
    }
    if (messageId && !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid messageId" });
    }

    // Create report notification for admins
    const admins = await User.find({ role: "admin" }).select("_id");
    if (admins.length === 0) {
      console.warn("No admin users found to report to");
      return res.json({
        message: "Report submitted successfully",
        success: true,
      });
    }

    const reportContent = `User report: ${me} reported ${targetUserId}${
      reason ? ` - Reason: ${reason}` : ""
    }${messageId ? ` - Message: ${messageId}` : ""}`;

    try {
      await Promise.allSettled(
        admins.map((admin) =>
          NotificationService.createNotification({
            recipientId: admin._id,
            senderId: me,
            type: "message",
            content: reportContent,
            relatedId: messageId || targetUserId,
            onModel: messageId ? "Message" : "User",
          })
        )
      );
    } catch (notificationError) {
      console.error(
        "Error creating notifications for report:",
        notificationError
      );
      // Continue and return success anyway, as the report intent was valid
    }

    return res.json({
      message: "Report submitted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error reporting user:", error);
    return res.status(500).json({
      message: "Error reporting user",
      error: error.message,
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

    const isStarred = Array.isArray(message.attachments)
      ? message.attachments.includes(`star:${me}`)
      : false;
    const isPinned = Array.isArray(message.attachments)
      ? message.attachments.includes(`pin:${me}`)
      : false;

    // Reaction count summary
    const reactionSummary = {};
    if (Array.isArray(message.reactions)) {
      message.reactions.forEach((r) => {
        if (!r.userId || !r.userId._id) return; // Null check for userId
        if (r.emoji) {
          if (!reactionSummary[r.emoji]) {
            reactionSummary[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
          }
          reactionSummary[r.emoji].count += 1;
          reactionSummary[r.emoji].users.push({
            _id: r.userId._id,
            name: r.userId.name,
            username: r.userId.username,
            avatarUrl: r.userId.avatarUrl || "/default-avatar.png", // Fallback avatar URL
          });
        }
      });
    }
    const reactionsArray = Object.values(reactionSummary);

    // My reaction
    const myReaction = Array.isArray(message.reactions)
      ? message.reactions.find(
          (r) => r.userId && r.userId._id && String(r.userId._id) === String(me)
        )?.emoji || null
      : null;

    const messageInfo = {
      id: message._id,
      content: message.content,
      sender: message.from,
      recipient: message.to,
      timestamp: message.createdAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      reactions: reactionsArray,
      myReaction,
      isStarred,
      isPinned,
      isEdited: false,
      editHistory: [],
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
