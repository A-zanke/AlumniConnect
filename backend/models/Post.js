const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return !this.media || this.media.length === 0;
      }, // ✅ Content only required if no media
      trim: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    editHistory: [
      {
        version: { type: Number },
        content: { type: String },
        editedAt: { type: Date },
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    deletedAt: {
      type: Date,
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        type: {
          type: String,
          enum: [
            "like",
            "love",
            "celebrate",
            "support",
            "insightful",
            "curious",
          ],
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    editHistory: [
      {
        version: { type: Number },
        content: { type: String },
        editedAt: { type: Date },
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    deletedAt: {
      type: Date,
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        type: {
          type: String,
          enum: [
            "like",
            "love",
            "celebrate",
            "support",
            "insightful",
            "curious",
          ],
          required: true,
        },
      },
    ],
    replies: [replySchema],
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    media: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "file"],
          default: "image",
        },
        name: String,
        public_id: String, // Cloudinary public_id for deletion
      },
    ],
    postType: {
      type: String,
      enum: ["text", "image", "video", "link", "poll"],
      default: "text",
    },
    visibility: {
      type: String,
      enum: ["public", "connections", "private"],
      default: "public",
    },
    tags: [String],
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        type: {
          type: String,
          enum: [
            "like",
            "love",
            "celebrate",
            "support",
            "insightful",
            "curious",
          ],
          required: true,
        },
      },
    ],
    // Keep likes for backward compatibility
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema],
    shares: {
      type: Number,
      default: 0,
    },
    linkPreview: {
      url: { type: String },
      title: { type: String },
      description: { type: String },
      image: { type: String },
    },
    bookmarkedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    approved: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
