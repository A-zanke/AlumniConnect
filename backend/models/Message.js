const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    // Client-side identifiers for idempotency and mapping
    messageId: { type: String, index: true, default: null },
    clientKey: { type: String, index: true, default: null },
    threadId: { type: String, index: true, default: null },

    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: "",
      maxlength: 4096, // WhatsApp-like message length limit
    },
    // For Cloudinary URLs or remote media
    attachments: [
      {
        type: String,
        maxlength: 1000,
      },
    ],

    // Enhanced message status tracking
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },

    // Message type for different kinds of messages
    messageType: {
      type: String,
      enum: [
        "text",
        "image",
        "video",
        "audio",
        "document",
        "location",
        "contact",
      ],
      default: "text",
    },

    // Per-message emoji reactions
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        emoji: { type: String, required: true, maxlength: 16 },
        reactedAt: { type: Date, default: Date.now },
      },
    ],

    // For forwarded messages
    isForwarded: {
      type: Boolean,
      default: false,
    },
    originalMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Message metadata
    metadata: {
      // For media messages
      mediaInfo: {
        width: Number,
        height: Number,
        duration: Number, // for video/audio
        size: Number, // file size in bytes
        mimeType: String,
        thumbnail: String, // thumbnail URL for videos
      },

      // For location messages
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },

      // For contact messages
      contact: {
        name: String,
        phone: String,
        email: String,
      },
    },

    // Message encryption (for future use)
    encrypted: {
      type: Boolean,
      default: false,
    },

    // Message priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Deletion flags (explicit fields in addition to legacy markers)
    deletedForEveryone: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // Auto-delete timer (in seconds)
    autoDeleteAfter: {
      type: Number,
      default: null,
    },

    // Message expiry
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    // Add indexes for better query performance
    indexes: [
      { from: 1, to: 1, createdAt: -1 },
      { to: 1, isRead: 1, createdAt: -1 },
      { createdAt: 1 }, // For cleanup operations
      { expiresAt: 1 }, // For TTL index
      { "metadata.location.latitude": 1, "metadata.location.longitude": 1 }, // For location queries
    ],
  }
);

// Compound indexes for better performance
MessageSchema.index({ from: 1, to: 1, createdAt: -1 });
MessageSchema.index({ to: 1, isRead: 1, createdAt: -1 });
MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ messageId: 1 }, { sparse: true });
MessageSchema.index({ clientKey: 1 }, { sparse: true });
MessageSchema.index({ threadId: 1 }, { sparse: true });
MessageSchema.index({ "reactions.userId": 1 });
MessageSchema.index({ deletedForEveryone: 1, createdAt: -1 });
MessageSchema.index({ deletedFor: 1, createdAt: -1 });

// TTL index for auto-expiring messages
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text search index for message content
MessageSchema.index({ content: "text" });

// Virtual for message age
MessageSchema.virtual("age").get(function () {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for checking if message is recent (within last 5 minutes)
MessageSchema.virtual("isRecent").get(function () {
  return this.age < 5 * 60 * 1000; // 5 minutes in milliseconds
});

// Pre-save middleware to set message type based on attachments
MessageSchema.pre("save", function (next) {
  if (this.attachments && this.attachments.length > 0) {
    const first = String(this.attachments[0]);
    const lower = first.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff)(\?.*)?$/.test(lower)) this.messageType = "image";
    else if (/\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/.test(lower)) this.messageType = "video";
    else if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|wma)(\?.*)?$/.test(lower)) this.messageType = "audio";
    else if (/\.(pdf|doc|docx|txt|xlsx|xls|ppt|pptx|zip|rar|7z)(\?.*)?$/.test(lower)) this.messageType = "document";
  }

  // Set auto-delete timer if specified
  if (this.autoDeleteAfter && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + this.autoDeleteAfter * 1000);
  }

  next();
});

// Static method to find messages between two users
MessageSchema.statics.findConversation = function (userA, userB, options = {}) {
  const a = String(userA);
  const b = String(userB);
  const query = {
    $or: [
      { from: a, to: b },
      { from: b, to: a },
    ],
  };

  // Exclude deleted messages for the requesting user
  if (options.excludeDeletedFor) {
    query.attachments = {
      $not: { $in: [`deletedFor:${options.excludeDeletedFor}`] },
    };
  }

  return this.find(query)
    .sort({ createdAt: options.sortOrder || 1 })
    .limit(options.limit || 100)
    .populate("from to", "name username avatarUrl")
    .lean();
};

// Static method to mark messages as read
MessageSchema.statics.markAsRead = function (messageIds, userId) {
  return this.updateMany(
    {
      _id: { $in: messageIds },
      to: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

// Static method to get unread count for user
MessageSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    to: userId,
    isRead: false,
    // Respect explicit deletion flags
    deletedForEveryone: { $ne: true },
    deletedFor: { $ne: userId },
    // Backward compatibility with legacy markers kept in attachments
    attachments: { $not: { $in: [`deletedFor:${userId}`, "deletedForEveryone"] } },
  });
};

// Instance method to check if message is deleted for user
MessageSchema.methods.isDeletedFor = function (userId) {
  // Respect explicit fields first
  if (this.deletedForEveryone) return true;
  if (Array.isArray(this.deletedFor)) {
    const uid = String(userId);
    if (this.deletedFor.some((id) => String(id) === uid)) return true;
  }
  // Backward compatibility with legacy markers in attachments
  return (
    (this.attachments && this.attachments.includes(`deletedFor:${userId}`)) ||
    (this.attachments && this.attachments.includes("deletedForEveryone"))
  );
};

// Instance method to get reactions
MessageSchema.methods.getReactions = function () {
  // Prefer structured reactions array if present
  if (Array.isArray(this.reactions) && this.reactions.length > 0) {
    return this.reactions.map((r) => ({
      userId: r.userId,
      emoji: r.emoji,
    }));
  }

  // Fallback to legacy attachment markers react:{userId}:{emoji}
  if (!this.attachments) return [];
  return this.attachments
    .filter((att) => typeof att === "string" && att.startsWith("react:"))
    .map((att) => {
      const parts = att.split(":");
      return {
        userId: parts[1],
        emoji: parts.slice(2).join(":"),
      };
    });
};

// Instance method to check if starred by user
MessageSchema.methods.isStarredBy = function (userId) {
  return this.attachments && this.attachments.includes(`star:${userId}`);
};

// Instance method to check if pinned by user
MessageSchema.methods.isPinnedBy = function (userId) {
  return this.attachments && this.attachments.includes(`pin:${userId}`);
};

// Instance method to get reply reference
MessageSchema.methods.getReplyTo = function () {
  if (!this.attachments) return null;

  const replyAtt = this.attachments.find(
    (att) => typeof att === "string" && att.startsWith("reply:")
  );

  if (replyAtt) {
    const refId = replyAtt.split(":")[1];
    return { id: refId };
  }

  return null;
};

// Instance method to format for API response
MessageSchema.methods.toAPIResponse = function (viewerId) {
  // Check if deleted for viewer
  if (this.isDeletedFor(viewerId)) return null;

  return {
    id: this._id,
    senderId: this.from,
    recipientId: this.to,
    content: this.content,
    messageType: this.messageType,
    attachments: (this.attachments || []).filter((att) => typeof att === "string" && /^https?:\/\//.test(att)),
    reactions: this.getReactions(),
    replyTo: this.getReplyTo(),
    isStarred: this.isStarredBy(viewerId),
    isPinned: this.isPinnedBy(viewerId),
    isForwarded: this.isForwarded,
    timestamp: this.createdAt,
    readAt: this.readAt,
    deliveredAt: this.deliveredAt,
    status: this.isRead ? "seen" : this.deliveredAt ? "delivered" : "sent",
    metadata: this.metadata,
  };
};

module.exports = mongoose.model("Message", MessageSchema);
