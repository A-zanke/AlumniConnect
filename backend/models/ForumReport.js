const mongoose = require('mongoose');

const ForumReportSchema = new mongoose.Schema({
  targetType: { type: String, enum: ['post', 'comment'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, default: 'Inappropriate' },
  resolved: { type: Boolean, default: false },
  moderatorNote: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ForumReport', ForumReportSchema);