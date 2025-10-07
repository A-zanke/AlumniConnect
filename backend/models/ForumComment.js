const mongoose = require('mongoose');

const CommentReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Keep same reaction set as posts
  type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'], required: true }
}, { _id: false });

const ForumCommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumComment', default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAnonymous: { type: Boolean, default: false },
  content: { type: String, required: true, trim: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [CommentReactionSchema]
}, { timestamps: true });

module.exports = mongoose.model('ForumComment', ForumCommentSchema);