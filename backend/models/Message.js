const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
}, { _id: false });

const ReplyToSchema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  snippet: { type: String },
}, { _id: false });

const MediaSchema = new mongoose.Schema({
  url: { type: String },
  mime: { type: String },
  size: { type: Number },
  width: { type: Number },
  height: { type: Number },
  thumb: { type: String },
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  threadId: { type: String, index: true },
  clientKey: { type: String, index: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['text', 'image', 'video', 'file', 'system'], default: 'text' },
  content: { type: String, default: '' },
  media: MediaSchema,
  attachments: [{ type: String }],
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent', index: true },
  reactions: [ReactionSchema],
  replyTo: ReplyToSchema,
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedForAllAt: { type: Date, default: null },
  readAt: { type: Date, default: null }
}, { timestamps: true });

MessageSchema.index({ from: 1, to: 1, createdAt: -1 });
MessageSchema.index({ threadId: 1, createdAt: -1 });
MessageSchema.index({ threadId: 1, clientKey: 1 }, { unique: false });

module.exports = mongoose.model('Message', MessageSchema);