const mongoose = require('mongoose');

const postReportSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['post', 'comment'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    default: 'Inappropriate'
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
    default: 'Pending'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for faster admin queries
postReportSchema.index({ resolved: 1 });
postReportSchema.index({ targetType: 1 });

module.exports = mongoose.model('PostReport', postReportSchema);
