const mongoose = require('mongoose');

// Emoji reaction schema for comments
const CommentReactionSchema = new mongoose.Schema({
  emoji: { 
    type: String, 
    required: true,
    enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
  },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

// Unified Comment Schema with threading
const UnifiedCommentSchema = new mongoose.Schema({
  // Required references
  post: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UnifiedPost', 
    required: true 
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Content
  content: { type: String, required: true, trim: true, maxlength: 1000 },
  
  // Threading support
  parentComment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UnifiedComment', 
    default: null 
  },
  replyTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Mentions in comment
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Media attachments in comments
  mediaAttachments: [{
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    filename: { type: String },
    size: { type: Number }
  }],
  
  // Emoji reactions
  reactions: [CommentReactionSchema],
  
  // Engagement metrics
  replyCount: { type: Number, default: 0 },
  
  // Moderation
  isReported: { type: Boolean, default: false },
  reportsCount: { type: Number, default: 0 },
  
  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total reactions count
UnifiedCommentSchema.virtual('totalReactions').get(function() {
  return this.reactions.reduce((total, reaction) => total + reaction.users.length, 0);
});

// Virtual for depth level (how deep in the thread)
UnifiedCommentSchema.virtual('depth').get(function() {
  return this.parentComment ? 1 : 0; // Simplified for now
});

// Indexes for performance
UnifiedCommentSchema.index({ post: 1, createdAt: 1 });
UnifiedCommentSchema.index({ author: 1, createdAt: -1 });
UnifiedCommentSchema.index({ parentComment: 1, createdAt: 1 });
UnifiedCommentSchema.index({ isDeleted: 1, createdAt: -1 });

// Pre-save middleware to update reply count
UnifiedCommentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentComment) {
    // Increment reply count for parent comment
    await this.constructor.findByIdAndUpdate(
      this.parentComment,
      { $inc: { replyCount: 1 } }
    );
  }
  next();
});

// Pre-remove middleware to update reply count
UnifiedCommentSchema.pre('remove', async function(next) {
  if (this.parentComment) {
    // Decrement reply count for parent comment
    await this.constructor.findByIdAndUpdate(
      this.parentComment,
      { $inc: { replyCount: -1 } }
    );
  }
  next();
});

module.exports = mongoose.model('UnifiedComment', UnifiedCommentSchema);
