const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'file'], default: 'image' },
  name: { type: String, default: '' }
}, { _id: false });

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  media: { type: [MediaSchema], default: [] },
  postType: { type: String, enum: ['text'], default: 'text' },
  visibility: { type: String, enum: ['public', 'connections', 'private'], default: 'public' },
  // Targeting
  departmentScope: [{ type: String }],
  yearScope: [{ type: Number }],
  roleScope: [{ type: String }], // e.g., ['student','teacher']
  // Interactions
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  }],
  shares: { type: Number, default: 0 },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Moderation
  approved: { type: Boolean, default: true }
}, { timestamps: true });

PostSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);
