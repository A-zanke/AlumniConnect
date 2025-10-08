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
      required: true,
      trim: true,
    },
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
    // Rich text content with HTML formatting
    richContent: {
      type: String,
      trim: true,
    },
    media: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "file", "link"],
          default: "image",
        },
        name: String,
        // For link previews
        title: String,
        description: String,
        thumbnail: String,
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
    hashtags: [String], // Separate hashtags from tags
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
    // Bookmark functionality
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Share tracking
    shareHistory: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
        sharedWith: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
    approved: {
      type: Boolean,
      default: true,
    },
    // Post engagement metrics
    viewCount: {
      type: Number,
      default: 0,
    },
    // For post editing history
    editHistory: [
      {
        content: String,
        editedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
