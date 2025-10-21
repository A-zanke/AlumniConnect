const mongoose = require("mongoose");

const ThreadSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date, default: Date.now },
    // Per-user unread counts keyed by userId string
    unreadCount: { type: Map, of: Number, default: new Map() },
    // Per-user lastReadAt keyed by userId string
    lastReadAt: { type: Map, of: Date, default: new Map() },
    // Shared media quick refs per thread for side panel tabs
    mediaSummary: {
      images: { type: Number, default: 0 },
      videos: { type: Number, default: 0 },
      documents: { type: Number, default: 0 },
      links: { type: Number, default: 0 },
    },
    isStarred: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    typing: { type: Map, of: Date, default: new Map() },
  },
  { timestamps: true }
);

// Indexes for better query performance
ThreadSchema.index({ participants: 1 });
ThreadSchema.index({ lastMessageAt: -1 });
ThreadSchema.index({ "participants.0": 1, "participants.1": 1 }, { unique: true });

// Validation to ensure exactly 2 participants
ThreadSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Thread must have exactly 2 participants'));
  }
  next();
});

// Static method to find or create thread between two users
ThreadSchema.statics.findOrCreateThread = async function(userA, userB) {
  const participants = [userA, userB].sort();
  
  try {
    let thread = await this.findOne({
      participants: { $all: participants, $size: 2 }
    });
    
    if (!thread) {
      thread = await this.create({ participants });
    }
    
    return thread;
  } catch (error) {
    console.error('Error finding or creating thread:', error);
    throw error;
  }
};

// Static method to update unread count safely
ThreadSchema.statics.updateUnreadCount = async function(threadId, userId, increment = 1) {
  try {
    const thread = await this.findById(threadId);
    if (!thread) return null;
    
    const currentCount = thread.unreadCount.get(String(userId)) || 0;
    thread.unreadCount.set(String(userId), Math.max(0, currentCount + increment));
    
    return await thread.save();
  } catch (error) {
    console.error('Error updating unread count:', error);
    throw error;
  }
};

module.exports = mongoose.model("Thread", ThreadSchema);
