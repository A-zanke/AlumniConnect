const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  attachments: [{ type: String }],
  readAt: { type: Date, default: null }
}, { timestamps: true });

MessageSchema.index({ from: 1, to: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);