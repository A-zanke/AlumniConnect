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
        type: { type: String, enum: ["image", "video"], required: true },
        public_id: { type: String },
      },
    ],
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

// Index for faster feed queries
postSchema.index({ deletedAt: 1, visibility: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
