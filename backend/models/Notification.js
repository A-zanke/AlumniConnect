const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['connection_request', 'connection_accepted', 'message', 'like', 'comment', 'event'],
      required: true,
    },
    content: { type: String },
    relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'onModel' },
    onModel: { type: String },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', null],
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 