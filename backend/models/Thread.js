const mongoose = require("mongoose");

const ThreadSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      ],
      validate: {
        validator: function (arr) {
          if (!Array.isArray(arr)) return false;
          const unique = new Set(arr.map((id) => String(id)));
          return unique.size === arr.length && arr.length === 2;
        },
        message: "participants must contain exactly two distinct users",
      },
    },
    // Deterministic unique key for the pair, e.g. "idA_idB"
    key: { type: String, index: true },
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

// Compute deterministic key before validation/saving
ThreadSchema.pre("validate", function (next) {
  if (Array.isArray(this.participants) && this.participants.length === 2) {
    const [a, b] = this.participants
      .map((id) => String(id))
      .sort((x, y) => (x < y ? -1 : 1));
    this.participants = [a, b];
    this.key = `${a}_${b}`;
  }
  next();
});

ThreadSchema.index({ key: 1 }, { unique: true });
ThreadSchema.index({ participants: 1 });
ThreadSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("Thread", ThreadSchema);
