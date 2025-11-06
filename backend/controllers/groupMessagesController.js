const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const Group = require("../models/Group");
const Message = require("../models/Message");
const User = require("../models/User");

const MAX_GROUP_MEMBERS = 256;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const hydrateMessage = (doc, viewerId) => {
  if (!doc) return null;
  try {
    const hydrated = Message.hydrate(doc);
    return hydrated.toAPIResponse(viewerId);
  } catch (error) {
    return null;
  }
};

const summarizeGroup = (group, viewerId, includeMembers = false) => {
  if (!group) return null;

  const memberEntry = group.members.find(
    (m) => String(m.user?._id || m.user) === String(viewerId)
  );

  const unreadMap = group.unreadCount || new Map();
  const unreadValue =
    typeof unreadMap.get === "function"
      ? unreadMap.get(String(viewerId)) || 0
      : unreadMap[String(viewerId)] || 0;

  const lastMessage = group.lastMessagePopulated
    ? hydrateMessage(group.lastMessagePopulated, viewerId)
    : null;

  return {
    id: group._id,
    name: group.name,
    description: group.description || "",
    avatarUrl: group.avatarUrl || "",
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    role: memberEntry ? memberEntry.role : null,
    membersCount: group.members.length,
    unreadCount: unreadValue,
    lastMessage,
    lastMessageAt: group.lastMessageAt,
    pinnedMessage: group.pinnedMessagePopulated
      ? hydrateMessage(group.pinnedMessagePopulated, viewerId)
      : null,
    members:
      includeMembers && Array.isArray(group.members)
        ? group.members.map((member) => ({
            userId: member.user?._id || member.user,
            role: member.role,
            avatarUrl: member.user?.avatarUrl,
            name: member.user?.name || member.user?.username,
            username: member.user?.username,
            joinedAt: member.joinedAt,
            addedBy: member.addedBy,
          }))
        : undefined,
  };
};

const ensureMembership = (group, userId) => {
  const isMember = group.members.some(
    (member) => String(member.user) === String(userId)
  );
  if (!isMember) {
    const err = new Error("You are not a member of this group");
    err.statusCode = 403;
    throw err;
  }
};

const ensureAdmin = (group, userId) => {
  const isAdmin = group.members.some(
    (member) =>
      String(member.user) === String(userId) && member.role === "admin"
  );
  if (!isAdmin) {
    const err = new Error("Admin privileges required");
    err.statusCode = 403;
    throw err;
  }
};

const attachMembers = async (groupQuery) => {
  return groupQuery
    .populate({ path: "members.user", select: "name username avatarUrl" })
    .populate({ path: "lastMessage", options: { lean: true } })
    .populate({ path: "pinnedMessage", options: { lean: true } })
    .lean({ virtuals: true });
};

const updateUnreadMap = (group, viewerId, value) => {
  if (!group) return;
  const key = String(viewerId);
  if (group.unreadCount instanceof Map) {
    group.unreadCount.set(key, value);
  } else {
    group.unreadCount[key] = value;
  }
  group.markModified && group.markModified("unreadCount");
};

const incrementUnreadForMembers = (group, senderId) => {
  const key = String(senderId);
  if (group.unreadCount instanceof Map) {
    group.members.forEach((member) => {
      const memberId = String(member.user);
      if (memberId === key) return;
      const current = group.unreadCount.get(memberId) || 0;
      group.unreadCount.set(memberId, current + 1);
    });
  } else {
    group.unreadCount = group.unreadCount || {};
    group.members.forEach((member) => {
      const memberId = String(member.user);
      if (memberId === key) return;
      const current = group.unreadCount[memberId] || 0;
      group.unreadCount[memberId] = current + 1;
    });
  }
  group.markModified && group.markModified("unreadCount");
};

const extractAttachments = (files = {}) => {
  const buckets = [
    ...(files.image || []),
    ...(files.video || []),
    ...(files.audio || []),
    ...(files.document || []),
    ...(files.media || []),
  ];

  return buckets
    .map((file) => file?.path)
    .filter(Boolean)
    .slice(0, 13);
};

exports.createGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description = "", memberIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Group name is required",
        success: false,
      });
    }

    const uniqueMemberIds = Array.from(
      new Set([
        ...memberIds
          .filter((id) => id && id !== String(userId) && isValidObjectId(id)),
      ])
    );

    if (uniqueMemberIds.length + 1 > MAX_GROUP_MEMBERS) {
      return res.status(400).json({
        message: `Group size cannot exceed ${MAX_GROUP_MEMBERS} members`,
        success: false,
      });
    }

    const membersDocs = await User.find({ _id: { $in: uniqueMemberIds } })
      .select("_id")
      .lean();

    const validMemberIds = membersDocs.map((doc) => String(doc._id));

    const members = [
      {
        user: userId,
        role: "admin",
        addedBy: userId,
        joinedAt: new Date(),
      },
      ...validMemberIds.map((id) => ({
        user: id,
        role: "member",
        addedBy: userId,
        joinedAt: new Date(),
      })),
    ];

    if (members.length === 0) {
      return res.status(400).json({
        message: "At least the creator must be in the group",
        success: false,
      });
    }

    const groupPayload = {
      name: name.trim(),
      description: description.trim(),
      createdBy: userId,
      members,
    };

    if (req.file && req.file.path) {
      groupPayload.avatarUrl = req.file.path;
      groupPayload.avatarPublicId = req.file.filename || null;
    }

    const group = await Group.create(groupPayload);

    if (group.unreadCount instanceof Map) {
      members.forEach((member) => group.unreadCount.set(String(member.user), 0));
    } else {
      group.unreadCount = {};
      members.forEach((member) => {
        group.unreadCount[String(member.user)] = 0;
      });
    }
    group.markModified("unreadCount");
    await group.save();

    const populated = await attachMembers(Group.findById(group._id));
    const payload = summarizeGroup(populated, userId, true);

    if (req.io) {
      members.forEach((member) => {
        req.io.to(String(member.user)).emit("group:created", payload);
      });
    }

    return res.status(201).json({
      group: payload,
      success: true,
    });
  } catch (error) {
    console.error("createGroup error", error);
    return res.status(500).json({
      message: "Failed to create group",
      success: false,
    });
  }
};

exports.listGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await attachMembers(
      Group.find({
        "members.user": userId,
        isDeleted: false,
      }).sort({ lastMessageAt: -1 })
    );

    const data = groups.map((group) => summarizeGroup(group, userId));
    return res.json({ groups: data, success: true });
  } catch (error) {
    console.error("listGroups error", error);
    return res.status(500).json({
      message: "Failed to list groups",
      success: false,
    });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    if (!isValidObjectId(groupId)) {
      return res.status(400).json({
        message: "Invalid group id",
        success: false,
      });
    }

    const group = await attachMembers(
      Group.findById(groupId).where({ isDeleted: false })
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);

    const payload = summarizeGroup(group, userId, true);
    return res.json({ group: payload, success: true });
  } catch (error) {
    console.error("getGroup error", error);
    return res.status(500).json({
      message: "Failed to fetch group",
      success: false,
    });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { name, description } = req.body;

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);
    ensureAdmin(group, userId);

    if (name && name.trim()) {
      group.name = name.trim();
    }
    if (typeof description === "string") {
      group.description = description.trim();
    }

    if (req.file && req.file.path) {
      if (group.avatarPublicId) {
        try {
          await cloudinary.uploader.destroy(group.avatarPublicId);
        } catch (error) {
          console.warn("Failed to destroy previous group avatar", error.message);
        }
      }
      group.avatarUrl = req.file.path;
      group.avatarPublicId = req.file.filename || null;
    }

    await group.save();

    const populated = await attachMembers(Group.findById(group._id));
    const payload = summarizeGroup(populated, userId, true);

    if (req.io) {
      group.members.forEach((member) => {
        req.io.to(String(member.user)).emit("group:updated", payload);
      });
    }

    return res.json({ group: payload, success: true });
  } catch (error) {
    console.error("updateGroup error", error);
    return res.status(500).json({
      message: "Failed to update group",
      success: false,
    });
  }
};

exports.addMembers = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { memberIds = [] } = req.body;

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);
    ensureAdmin(group, userId);

    const existingIds = new Set(group.members.map((m) => String(m.user)));
    const newIds = Array.from(
      new Set(
        memberIds
          .filter((id) => id && isValidObjectId(id))
          .map((id) => String(id))
          .filter((id) => !existingIds.has(id))
      )
    );

    if (group.members.length + newIds.length > MAX_GROUP_MEMBERS) {
      return res.status(400).json({
        message: `Adding these members would exceed the limit of ${MAX_GROUP_MEMBERS}`,
        success: false,
      });
    }

    if (newIds.length === 0) {
      return res.json({
        message: "No new members to add",
        group: summarizeGroup(await attachMembers(Group.findById(group._id)), userId, true),
        success: true,
      });
    }

    const users = await User.find({ _id: { $in: newIds } })
      .select("_id")
      .lean();

    users.forEach((doc) => {
      group.members.push({
        user: doc._id,
        role: "member",
        addedBy: userId,
        joinedAt: new Date(),
      });
      updateUnreadMap(group, doc._id, 0);
    });

    await group.save();

    const populated = await attachMembers(Group.findById(group._id));
    const payload = summarizeGroup(populated, userId, true);

    if (req.io) {
      group.members.forEach((member) => {
        req.io.to(String(member.user)).emit("group:updated", payload);
      });
      newIds.forEach((id) => {
        req.io.to(String(id)).emit("group:added", payload);
      });
    }

    return res.json({ group: payload, success: true });
  } catch (error) {
    console.error("addMembers error", error);
    return res.status(500).json({
      message: "Failed to add members",
      success: false,
    });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, memberId } = req.params;
    const targetId = memberId || userId;

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);

    if (String(targetId) !== String(userId)) {
      ensureAdmin(group, userId);
    }

    const index = group.members.findIndex(
      (member) => String(member.user) === String(targetId)
    );

    if (index === -1) {
      return res.status(404).json({ message: "Member not in group", success: false });
    }

    const wasAdmin = group.members[index].role === "admin";
    group.members.splice(index, 1);

    if (group.unreadCount instanceof Map) {
      group.unreadCount.delete(String(targetId));
    } else if (group.unreadCount) {
      delete group.unreadCount[String(targetId)];
    }
    group.markModified && group.markModified("unreadCount");

    if (wasAdmin) {
      const remainingAdmins = group.members.filter(
        (member) => member.role === "admin"
      );
      if (remainingAdmins.length === 0 && group.members.length > 0) {
        group.members[0].role = "admin";
      }
    }

    if (group.members.length === 0) {
      group.isDeleted = true;
    }

    await group.save();

    const populated = await attachMembers(Group.findById(group._id));
    const payload = summarizeGroup(populated, userId, true);

    if (req.io) {
      req.io.to(String(targetId)).emit("group:removed", { groupId });
      group.members.forEach((member) => {
        req.io.to(String(member.user)).emit("group:updated", payload);
      });
    }

    return res.json({ group: payload, success: true });
  } catch (error) {
    console.error("removeMember error", error);
    return res.status(500).json({
      message: "Failed to remove member",
      success: false,
    });
  }
};

exports.leaveGroup = async (req, res) => {
  req.params.memberId = req.user._id;
  return this.removeMember(req, res);
};

exports.updateMemberRole = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { memberId, role } = req.body;

    if (!memberId || !["admin", "member"].includes(role)) {
      return res.status(400).json({
        message: "memberId and valid role are required",
        success: false,
      });
    }

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);
    ensureAdmin(group, userId);

    const member = group.members.find(
      (m) => String(m.user) === String(memberId)
    );
    if (!member) {
      return res.status(404).json({ message: "Member not found", success: false });
    }

    member.role = role;
    await group.save();

    const populated = await attachMembers(Group.findById(group._id));
    const payload = summarizeGroup(populated, userId, true);

    if (req.io) {
      group.members.forEach((m) => {
        req.io.to(String(m.user)).emit("group:updated", payload);
      });
    }

    return res.json({ group: payload, success: true });
  } catch (error) {
    console.error("updateMemberRole error", error);
    return res.status(500).json({
      message: "Failed to update member role",
      success: false,
    });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);
    ensureAdmin(group, userId);

    group.isDeleted = true;
    await group.save();

    if (group.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(group.avatarPublicId);
      } catch (error) {
        console.warn("Failed to delete group avatar", error.message);
      }
    }

    if (req.io) {
      group.members.forEach((member) => {
        req.io.to(String(member.user)).emit("group:deleted", {
          groupId: String(group._id),
        });
      });
    }

    return res.json({ message: "Group deleted", success: true });
  } catch (error) {
    console.error("deleteGroup error", error);
    return res.status(500).json({
      message: "Failed to delete group",
      success: false,
    });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);

    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 400);
    const docs = await Message.findGroupMessages(groupId, {
      sortOrder: 1,
      limit,
    });

    const messages = docs.map((doc) => hydrateMessage(doc, userId)).filter(Boolean);

    updateUnreadMap(group, userId, 0);
    await group.save();

    return res.json({ messages, success: true });
  } catch (error) {
    console.error("getGroupMessages error", error);
    return res.status(500).json({
      message: "Failed to fetch group messages",
      success: false,
    });
  }
};

exports.sendGroupMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { content = "", messageType = "text", clientKey } = req.body;

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);

    if (!content.trim() && !req.files) {
      return res.status(400).json({
        message: "Message content or attachments required",
        success: false,
      });
    }

    const attachments = extractAttachments(req.files);

    const messagePayload = {
      from: userId,
      group: groupId,
      to: null,
      content: content.trim(),
      messageType,
      attachments,
      clientKey: clientKey || `grp_${Date.now()}`,
      deliveredAt: new Date(),
    };

    const messageDoc = await Message.create(messagePayload);
    const hydrated = await Message.findById(messageDoc._id)
      .populate("from", "name username avatarUrl")
      .populate("group", "name avatarUrl")
      .lean();

    const responseMessage = hydrateMessage(hydrated, userId);

    group.lastMessage = messageDoc._id;
    group.lastMessageAt = new Date();
    incrementUnreadForMembers(group, userId);
    await group.save();

    if (req.io) {
      const socketPayload = {
        groupId: String(group._id),
        message: responseMessage,
      };
      req.io.to(`group:${groupId}`).emit("group:message", socketPayload);
      group.members.forEach((member) => {
        if (String(member.user) !== String(userId)) {
          req.io.to(String(member.user)).emit("group:message", socketPayload);
        }
      });
    }

    return res.status(201).json({ message: responseMessage, success: true });
  } catch (error) {
    console.error("sendGroupMessage error", error);
    return res.status(500).json({
      message: "Failed to send group message",
      success: false,
    });
  }
};

exports.pinMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { messageId } = req.body;

    if (!messageId || !isValidObjectId(messageId)) {
      return res.status(400).json({ message: "messageId required", success: false });
    }

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);
    ensureAdmin(group, userId);

    const message = await Message.findOne({ _id: messageId, group: groupId });
    if (!message) {
      return res.status(404).json({ message: "Message not found", success: false });
    }

    group.pinnedMessage = message._id;
    await group.save();

    const hydrated = await Message.findById(message._id)
      .populate("from", "name username avatarUrl")
      .lean();
    const payload = hydrateMessage(hydrated, userId);

    if (req.io) {
      req.io.to(`group:${groupId}`).emit("group:pinned", {
        groupId,
        message: payload,
      });
    }

    return res.json({ message: payload, success: true });
  } catch (error) {
    console.error("pinMessage error", error);
    return res.status(500).json({
      message: "Failed to pin message",
      success: false,
    });
  }
};

exports.unpinMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);
    ensureAdmin(group, userId);

    group.pinnedMessage = null;
    await group.save();

    if (req.io) {
      req.io.to(`group:${groupId}`).emit("group:unpinned", { groupId });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("unpinMessage error", error);
    return res.status(500).json({
      message: "Failed to unpin message",
      success: false,
    });
  }
};

exports.deleteGroupMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, messageId } = req.params;

    const group = await Group.findById(groupId);
    if (!group || group.isDeleted) {
      return res.status(404).json({ message: "Group not found", success: false });
    }

    ensureMembership(group, userId);
    ensureAdmin(group, userId);

    const message = await Message.findOne({ _id: messageId, group: groupId });
    if (!message) {
      return res.status(404).json({ message: "Message not found", success: false });
    }

    message.metadata = message.metadata || {};
    message.metadata.deleted = true;
    message.content = "This message was deleted";
    message.attachments = [];
    await message.save();

    if (req.io) {
      req.io.to(`group:${groupId}`).emit("group:messageDeleted", {
        groupId,
        messageId,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("deleteGroupMessage error", error);
    return res.status(500).json({
      message: "Failed to delete message",
      success: false,
    });
  }
};
