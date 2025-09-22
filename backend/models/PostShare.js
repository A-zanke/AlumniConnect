const mongoose = require('mongoose');

const PostShareSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  message: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('PostShare', PostShareSchema);