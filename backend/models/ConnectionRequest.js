const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
connectionRequestSchema.index({ senderId: 1, receiverId: 1 });
connectionRequestSchema.index({ receiverId: 1, status: 1 });

module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);
