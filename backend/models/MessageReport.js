const mongoose = require('mongoose');

const messageReportSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['message', 'user'],
    required: true,
    default: 'message'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['spam', 'harassment', 'inappropriate', 'fake', 'other'],
    default: 'inappropriate'
  },
  description: {
    type: String,
    default: ''
  },
  resolved: {
    type: Boolean,
    default: false
  },
  moderatorNote: {
    type: String,
    default: ''
  },
  action: {
    type: String,
    enum: ['pending', 'dismissed', 'warning', 'suspended', 'banned'],
    default: 'pending'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  messageContent: {
    type: String,
    default: ''
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }
}, {
  timestamps: true
});

// Indexes for faster admin queries
messageReportSchema.index({ resolved: 1 });
messageReportSchema.index({ targetType: 1 });
messageReportSchema.index({ reportedUser: 1 });
messageReportSchema.index({ reporter: 1 });

module.exports = mongoose.model('MessageReport', messageReportSchema);
