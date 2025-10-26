const mongoose = require('mongoose');

const PostReportSchema = new mongoose.Schema({
  targetType: { type: String, enum: ['post', 'comment'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['Spam', 'Harassment', 'Misinformation', 'Inappropriate', 'Other'], required: true },
  description: { type: String, trim: true },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  moderatorNote: { type: String },
  action: { type: String, enum: ['Dismissed', 'ContentRemoved', 'UserWarned', 'UserBanned'] }
}, { timestamps: true });

// Indexes for efficient queries
PostReportSchema.index({ targetId: 1 });
PostReportSchema.index({ reporter: 1 });
PostReportSchema.index({ resolved: 1 });

// Static method to find pending reports
PostReportSchema.statics.findPendingReports = function() {
  return this.find({ resolved: false }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('PostReport', PostReportSchema);