const mongoose = require("mongoose");

const ThreadSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date, default: Date.now },
    // Per-user unread counts keyed by userId string
    unreadCount: { type: Map, of: Number, default: {} },
    // Per-user lastReadAt keyed by userId string
    lastReadAt: { type: Map, of: Date, default: {} },
  // Shared media quick refs per thread for side panel tabs
  mediaSummary: {
    images: { type: Number, default: 0 },
    videos: { type: Number, default: 0 },
    documents: { type: Number, default: 0 },
    links: { type: Number, default: 0 },
  },
    isStarred: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    typing: { type: Map, of: Date, default: {} },
  },
  { timestamps: true }
);

ThreadSchema.index({ participants: 1 });
ThreadSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("Thread", ThreadSchema);
