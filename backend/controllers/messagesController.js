const path = require("path");
const User = require("../models/User");
const Message = require("../models/Message");
const Thread = require("../models/Thread");
const Block = require("../models/Block");
const NotificationService = require("../services/notificationService");

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

function parseMessage(doc, viewerId) {
  // hide if deleted for viewer
  if ((doc.attachments || []).includes(`deletedFor:${viewerId}`)) return null;

  const reactions = [];
  const media = [];
  let replyTo = null;
  (doc.attachments || []).forEach((att) => {
    if (typeof att !== "string") return;
    if (att.startsWith("react:")) {
      const parts = att.split(":");
      const userId = parts[1];
      const emoji = parts.slice(2).join(":");
      if (userId && emoji) reactions.push({ userId, emoji });
    } else if (att.startsWith("reply:")) {
      const refId = att.split(":")[1];
      if (refId) replyTo = { id: refId };
    } else if (att.startsWith("/uploads/")) {
      media.push(att);
    }
  });

  return {
    id: doc._id,
    senderId: doc.from,
    recipientId: doc.to,
    content: doc.content || "",
    attachments: media,
    reactions,
    replyTo,
    timestamp: doc.createdAt,
  };
}

exports.getConversations = async (req, res) => {
  try {
    const me = req.user._id;
    // Build conversations from latest messages and include unread from Thread
    const msgs = await Message.find({ $or: [{ from: me }, { to: me }] })
      .sort({ createdAt: -1 })
      .lean();
    const convMap = new Map();
    for (const m of msgs) {
      if ((m.attachments || []).includes(`deletedFor:${me}`)) continue;
      const other = String(m.from) === String(me) ? String(m.to) : String(m.from);
      if (!convMap.has(other)) {
        const snippet = m.content?.trim()
          ? m.content.trim().slice(0, 80)
          : (m.attachments || []).some((a) => typeof a === "string" && a.startsWith("/uploads/messages/"))
          ? "Photo"
          : "";
        convMap.set(other, { lastMessage: snippet, lastMessageTime: m.createdAt });
      }
    }
    const ids = Array.from(convMap.keys());
    const [users, threads] = await Promise.all([
      User.find({ _id: { $in: ids } })
        .select("name username avatarUrl isOnline lastSeen")
        .lean(),
      Thread.find({ participants: { $all: [me] } })
        .select("participants unreadCount lastMessageAt")
        .lean(),
    ]);
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const threadMap = new Map();
    for (const th of threads) {
      if ((th.participants || []).length === 2) {
        const other = th.participants
          .map((p) => String(p))
          .find((p) => p !== String(me));
        if (other) threadMap.set(other, th);
      }
    }
    const conversations = ids
      .map((id) => {
        const th = threadMap.get(id);
        const unread = th?.unreadCount?.get?.(String(me)) || th?.unreadCount?.[String(me)] || 0;
        return {
          _id: id,
          user: userMap.get(id) || { _id: id },
          lastMessage: convMap.get(id).lastMessage,
          lastMessageTime: convMap.get(id).lastMessageTime,
          unreadCount: unread,
          threadId: th ? String(th._id) : null,
        };
      })
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    return res.json({ data: conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ message: "Error fetching conversations" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    if (!other) return res.status(400).json({ message: "Missing userId" });
    const [connected, blocked] = await Promise.all([
      areConnected(me, other),
      isBlocked(me, other),
    ]);
    if (!connected) return res.status(403).json({ message: "You can only message connected users" });
    if (blocked) return res.status(403).json({ message: "Messaging is blocked between these users" });

    const docs = await Message.find({
      $or: [
        { from: me, to: other },
        { from: other, to: me },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();
    const out = [];
    for (const d of docs) {
      const dto = parseMessage(d, me);
      if (dto) out.push(dto);
    }
    // Mark as read server-side on fetch
    const participants = [String(me), String(other)].sort();
    const thread = await Thread.findOne({ participants: { $all: participants, $size: 2 } });
    if (thread) {
      const now = new Date();
      thread.lastReadAt.set(String(me), now);
      // recompute unread = messages to me after lastReadAt
      const unread = await Message.countDocuments({ from: other, to: me, createdAt: { $gt: now } });
      thread.unreadCount.set(String(me), unread);
      await thread.save();
      if (req.io) {
        req.io.to(String(me)).emit("unread:update", { conversationId: String(thread._id), newCount: unread });
        req.io.to(String(other)).emit("messages:readReceipt", { conversationId: String(thread._id), readerId: String(me), readUpTo: now });
      }
    }
    return res.json(out);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ message: "Error fetching messages" });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const to = req.params.userId || req.body.to;
    if (!to) return res.status(400).json({ message: "Missing recipient" });
    const [connected, blocked] = await Promise.all([
      areConnected(me, to),
      isBlocked(me, to),
    ]);
    if (!connected) return res.status(403).json({ message: "You can only message connected users" });
    if (blocked) return res.status(403).json({ message: "Messaging is blocked between these users" });

    const content = (req.body.content || "").toString();
    const attachments = [];
    const files = req.files || {};
    const imageFile = (files?.image && files.image[0]) || (files?.media && files.media[0]) || (req.file || null);
    if (imageFile) {
      const rel = path.posix.join("/uploads/messages", imageFile.filename || imageFile); // keep compatibility
      attachments.push(rel);
    }
    if (req.body.replyToId) {
      attachments.push(`reply:${req.body.replyToId}`);
    }

    const msg = await Message.create({ from: me, to, content, attachments });
    const dto = parseMessage(msg.toObject(), me);

    // Upsert thread and increment unread for recipient (server authority)
    const participants = [String(me), String(to)].sort();
    const thread = await Thread.findOneAndUpdate(
      { participants: { $all: participants, $size: 2 } },
      {
        $setOnInsert: { participants },
        $set: { lastMessageAt: new Date(), lastMessage: msg._id },
        $inc: { [`unreadCount.${to}`]: 1 },
      },
      { upsert: true, new: true }
    );

    if (req.io) {
      const payload = {
        conversationId: String(thread._id),
        messageId: String(dto.id),
        senderId: String(dto.senderId),
        body: dto.content,
        createdAt: dto.timestamp,
      };
      // New event contract: deliver only to recipient
      req.io.to(String(to)).emit("message:new", payload);
      // Notify unread update to recipient only
      const newUnread = (thread.unreadCount?.get?.(String(to)) || thread.unreadCount?.[String(to)] || 0);
      req.io.to(String(to)).emit("unread:update", { conversationId: String(thread._id), newCount: newUnread });
      // Status events to sender
      req.io.to(String(me)).emit("message:sent", { id: String(dto.id), messageId: String(dto.id), status: "sent" });
      // If recipient currently connected, mark delivered
      try {
        const isRecipientOnline = !!req.io.sockets?.adapter?.rooms?.get?.(String(to));
        if (isRecipientOnline) {
          req.io.to(String(me)).emit("message:delivered", { id: String(dto.id), messageId: String(dto.id), status: "delivered" });
        }
      } catch {}
    }

    return res.status(201).json(dto);
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Error sending message" });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId } = req.params;
    const scope = (req.body?.for || req.query?.for || "me").toLowerCase();
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    const isParticipant = [String(msg.from), String(msg.to)].includes(String(me));
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

    if (scope === "everyone") {
      if (String(msg.from) !== String(me)) {
        return res.status(403).json({ message: "Only sender can delete for everyone" });
      }
      await Message.deleteOne({ _id: messageId });
      if (req.io) {
        [String(msg.from), String(msg.to)].forEach((uid) =>
          req.io.to(uid).emit("messageDeleted", { messageId, scope: "everyone" })
        );
      }
      return res.json({ ok: true });
    }

    const marker = `deletedFor:${me}`;
    const atts = msg.attachments || [];
    if (!atts.includes(marker)) {
      msg.attachments = [...atts, marker];
      await msg.save();
    }
    if (req.io) req.io.to(String(me)).emit("messageDeleted", { messageId, scope: "me" });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ message: "Error deleting message" });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageIds = [], for: scopeRaw = "me" } = req.body || {};
    const scope = (scopeRaw || "me").toLowerCase();
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: "messageIds required" });
    }
    const msgs = await Message.find({ _id: { $in: messageIds } });
    const result = { updated: 0, deleted: 0 };
    for (const msg of msgs) {
      const isParticipant = [String(msg.from), String(msg.to)].includes(String(me));
      if (!isParticipant) continue;
      if (scope === "everyone") {
        if (String(msg.from) !== String(me)) continue;
        await Message.deleteOne({ _id: msg._id });
        result.deleted += 1;
      } else {
        const marker = `deletedFor:${me}`;
        const atts = msg.attachments || [];
        if (!atts.includes(marker)) {
          msg.attachments = [...atts, marker];
          await msg.save();
        }
        result.updated += 1;
      }
    }
    if (req.io) req.io.to(String(me)).emit("messageDeleted", { messageIds, scope });
    return res.json(result);
  } catch (error) {
    console.error("Error deleting messages:", error);
    return res.status(500).json({ message: "Error deleting messages" });
  }
};

exports.react = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId, emoji } = req.body || {};
    if (!messageId) return res.status(400).json({ message: "messageId required" });
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    const isParticipant = [String(msg.from), String(msg.to)].includes(String(me));
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

    let atts = msg.attachments || [];
    atts = atts.filter((a) => !(typeof a === "string" && a.startsWith(`react:${me}:`)));
    if (emoji) atts.push(`react:${me}:${emoji}`);
    msg.attachments = atts;
    await msg.save();

    const reactions = [];
    for (const a of atts) {
      if (typeof a === "string" && a.startsWith("react:")) {
        const parts = a.split(":");
        const userId = parts[1];
        const sym = parts.slice(2).join(":");
        reactions.push({ userId, emoji: sym });
      }
    }
    if (req.io) {
      [String(msg.from), String(msg.to)].forEach((uid) =>
        req.io.to(uid).emit("messageReacted", { messageId: String(msg._id), reactions })
      );
    }
    return res.json({ messageId: String(msg._id), reactions });
  } catch (error) {
    console.error("Error reacting to message:", error);
    return res.status(500).json({ message: "Error reacting to message" });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    const scope = (req.body?.for || req.query?.for || "me").toLowerCase();
    if (!other) return res.status(400).json({ message: "Missing userId" });

    if (scope === "everyone") {
      await Message.deleteMany({
        $or: [
          { from: me, to: other },
          { from: other, to: me },
        ],
      });
      if (req.io) {
        req.io.to(String(me)).emit("messageDeleted", { scope: "everyone", chatCleared: true, userId: other });
        req.io.to(String(other)).emit("messageDeleted", { scope: "everyone", chatCleared: true, userId: String(me) });
      }
      return res.json({ ok: true });
    }

    const cursor = Message.find({
      $or: [
        { from: me, to: other },
        { from: other, to: me },
      ],
    }).cursor();
    const marker = `deletedFor:${me}`;
    for await (const msg of cursor) {
      const atts = msg.attachments || [];
      if (!atts.includes(marker)) {
        msg.attachments = [...atts, marker];
        await msg.save();
      }
    }
    if (req.io) req.io.to(String(me)).emit("messageDeleted", { scope: "me", chatCleared: true, userId: other });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return res.status(500).json({ message: "Error deleting chat" });
  }
};

exports.report = async (req, res) => {
  try {
    const me = req.user._id;
    const { targetUserId, reason } = req.body || {};
    if (!targetUserId) return res.status(400).json({ message: "targetUserId required" });
    const admins = await User.find({ role: "admin" }).select("_id");
    await Promise.all(
      admins.map((a) =>
        NotificationService.createNotification({
          recipientId: a._id,
          senderId: me,
          type: "message",
          content: `Report: ${me} -> ${targetUserId}${reason ? ": " + reason : ""}`,
          relatedId: targetUserId,
        })
      )
    );
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Error reporting user:", error);
    return res.status(500).json({ message: "Error reporting user" });
  }
};

exports.block = async (req, res) => {
  try {
    const me = req.user._id;
    const { targetUserId, action } = req.body || {};
    if (!targetUserId) return res.status(400).json({ message: "targetUserId required" });
    if (!action || !["block", "unblock"].includes(action)) {
      return res.status(400).json({ message: "action must be 'block' or 'unblock'" });
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
    return res.json({ ok: true });
  } catch (error) {
    console.error("Error updating block:", error);
    return res.status(500).json({ message: "Error updating block" });
  }
};

exports.getBlocks = async (req, res) => {
  try {
    const me = req.user._id;
    const [blocked, blockedBy] = await Promise.all([
      Block.find({ blocker: me }).select("blocked").lean(),
      Block.find({ blocked: me }).select("blocker").lean(),
    ]);
    return res.json({
      blocked: blocked.map((b) => String(b.blocked)),
      blockedBy: blockedBy.map((b) => String(b.blocker)),
    });
  } catch (error) {
    console.error("Error fetching block list:", error);
    return res.status(500).json({ message: "Error fetching block list" });
  }
};

exports.getMedia = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    if (!other) return res.status(400).json({ message: "Missing userId" });
    const docs = await Message.find({
      $or: [
        { from: me, to: other },
        { from: other, to: me },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();
    const media = [];
    for (const d of docs) {
      if ((d.attachments || []).includes(`deletedFor:${me}`)) continue;
      (d.attachments || []).forEach((a) => {
        if (typeof a === "string" && a.startsWith("/uploads/messages/")) media.push(a);
      });
    }
    return res.json({ media });
  } catch (error) {
    console.error("Error fetching media:", error);
    return res.status(500).json({ message: "Error fetching media" });
  }
};
