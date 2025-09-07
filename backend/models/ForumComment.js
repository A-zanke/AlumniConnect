const mongoose = require('mongoose');

const ForumCommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumComment', default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional if anonymous reply later
  isAnonymous: { type: Boolean, default: false },
  content: { type: String, required: true, trim: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('ForumComment', ForumCommentSchema);