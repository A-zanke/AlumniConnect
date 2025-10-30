const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: [
      // Forum/UI set
      "like", "love", "laugh", "wow", "sad", "angry",
      // LinkedIn-style professional reactions
      "celebrate", "support", "insightful", "curious", "clap", "funny",
    ],
    required: true,
    default: "like",
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
    parentCommentId: { type: mongoose.Schema.Types.ObjectId },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
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
    shares: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        sharedWith: [mongoose.Schema.Types.ObjectId],
        sharedAt: { type: Date, default: Date.now },
        message: String,
      },
    ],
    bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isEdited: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }, // For soft deletes
    tags: [{ type: String, trim: true }],
    views: { type: Number, default: 0 },
    viewedBy: [{ userId: mongoose.Schema.Types.ObjectId, viewedAt: Date }],
    engagementRate: { type: Number, default: 0 },
    reportsCount: { type: Number, default: 0 },
    isReported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Virtual fields
postSchema.virtual("totalEngagement").get(function () {
  return this.reactions.length + this.comments.length + this.shares.length;
});

postSchema.virtual("shareCount").get(function () {
  return this.shares.length;
});

// Include virtuals in JSON output
postSchema.set("toJSON", { virtuals: true });

// Index for faster feed queries with department filtering
postSchema.index({ deletedAt: 1, visibility: 1, createdAt: -1 });
postSchema.index({ departments: 1, createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ views: -1 });
postSchema.index({ reportsCount: -1 });

module.exports = mongoose.model("Post", postSchema);
