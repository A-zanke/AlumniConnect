const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["like", "love", "celebrate", "support", "insightful", "curious"],
    required: true,
  },
});

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true, trim: true },
    isEdited: { type: Boolean, default: false },
    reactions: [reactionSchema],
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
    content: { type: String, required: true, trim: true },
    media: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["image", "video", "document"],
          required: true,
        },
        public_id: { type: String },
        originalName: { type: String }, // Store original filename
      },
    ],
    // NEW: Department-based visibility
    departments: [
      {
        type: String,
        enum: ["CSE", "AI-DS", "E&TC", "Mechanical", "Civil", "Other", "All"],
        required: true,
      },
    ],
    authorRole: {
      type: String,
      enum: ["student", "teacher", "alumni", "admin"],
      required: true,
    },
    visibility: {
      type: String,
      enum: ["public", "connections"],
      default: "public",
    },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reactions: [reactionSchema],
    comments: [commentSchema],
    shares: { type: Number, default: 0 },
    bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isEdited: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }, // For soft deletes
  },
  { timestamps: true }
);

// Index for faster feed queries with department filtering
postSchema.index({ deletedAt: 1, visibility: 1, createdAt: -1 });
postSchema.index({ departments: 1, createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
