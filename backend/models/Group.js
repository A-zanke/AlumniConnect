const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    avatarPublicId: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [MemberSchema],
      default: [],
    },
    pinnedMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    metadata: {
      color: { type: String, default: null },
      topic: { type: String, default: null },
      customFields: { type: Map, of: String, default: {} },
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

GroupSchema.index({ createdBy: 1, name: 1 });
GroupSchema.index({ "members.user": 1 });
GroupSchema.index({ lastMessageAt: -1 });

GroupSchema.methods.isMember = function (userId) {
  const id = String(userId);
  return this.members.some((member) => String(member.user) === id);
};

GroupSchema.methods.isAdmin = function (userId) {
  const id = String(userId);
  return this.members.some(
    (member) => String(member.user) === id && member.role === "admin"
  );
};

module.exports = mongoose.model("Group", GroupSchema);
