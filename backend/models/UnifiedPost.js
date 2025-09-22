const mongoose = require('mongoose');

// Emoji reaction schema
const ReactionSchema = new mongoose.Schema({
  emoji: { 
    type: String, 
    required: true,
    enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
  },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

// Poll option schema
const PollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

// Poll schema
const PollSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: [PollOptionSchema],
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date },
  allowMultipleVotes: { type: Boolean, default: false }
}, { _id: false });

// Media attachment schema
const MediaAttachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['image', 'video', 'document'], 
    required: true 
  },
  filename: { type: String },
  size: { type: Number },
  thumbnail: { type: String }
}, { _id: false });

// Unified Post Schema
const UnifiedPostSchema = new mongoose.Schema({
  // Author information (required - no anonymous posts)
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Content
  title: { type: String, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true },
  
  // Organization
  category: {
    type: String,
    enum: ['Career', 'Higher Studies', 'Internships', 'Hackathons', 'Projects', 'Alumni Queries', 'General'],
    default: 'General'
  },
  tags: [{ type: String, trim: true, maxlength: 30 }],
  
  // Interactions
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Media attachments
  mediaAttachments: [MediaAttachmentSchema],
  
  // Poll functionality
  poll: PollSchema,
  
  // Emoji reactions
  reactions: [ReactionSchema],
  
  // Engagement metrics
  commentCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  
  // Moderation
  isReported: { type: Boolean, default: false },
  reportsCount: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  
  // Visibility
  visibility: { 
    type: String, 
    enum: ['public', 'connections', 'department'], 
    default: 'public' 
  },
  
  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Edit window (1 minute)
  canEdit: { type: Boolean, default: true },
  editWindowExpires: { type: Date, default: () => new Date(Date.now() + 60 * 1000) } // 1 minute from creation
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total reactions count
UnifiedPostSchema.virtual('totalReactions').get(function() {
  return this.reactions.reduce((total, reaction) => total + reaction.users.length, 0);
});

// Virtual to check if post is still editable (within 1 minute)
UnifiedPostSchema.virtual('isEditable').get(function() {
  return this.canEdit && new Date() < this.editWindowExpires;
});

// Indexes for performance
UnifiedPostSchema.index({ author: 1, createdAt: -1 });
UnifiedPostSchema.index({ category: 1, createdAt: -1 });
UnifiedPostSchema.index({ tags: 1 });
UnifiedPostSchema.index({ isDeleted: 1, createdAt: -1 });
UnifiedPostSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('UnifiedPost', UnifiedPostSchema);
