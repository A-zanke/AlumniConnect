const mongoose = require('mongoose');

/**
 * MessageBackup Schema - Stores backups of messages before encryption changes
 * This allows recovery of old encrypted messages when keys are lost
 */
const MessageBackupSchema = new mongoose.Schema(
  {
    // Original message ID
    originalMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    
    // Thread reference
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
      index: true,
    },
    
    // Sender and recipient
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Message content (plaintext backup)
    content: {
      type: String,
      default: '',
    },
    
    // Encryption data (for recovery attempts)
    encrypted: {
      type: Boolean,
      default: false,
    },
    encryptionData: {
      encryptedMessage: String,
      encryptedAESKey: String,
      iv: String,
      version: String,
    },
    
    // Sender's encrypted copy (for self-recovery)
    senderEncryptionData: {
      encryptedMessage: String,
      encryptedAESKey: String,
      iv: String,
      version: String,
    },
    
    // Attachments
    attachments: [
      {
        type: String,
      },
    ],
    
    // Metadata
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    
    // Reply reference
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    
    // Forwarding
    isForwarded: Boolean,
    forwardedFrom: {
      originalSender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      forwardCount: Number,
    },
    
    // Reactions
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: String,
        timestamp: Date,
      },
    ],
    
    // Status
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
    },
    
    // Backup metadata
    backupReason: {
      type: String,
      enum: ['encryption_migration', 'key_rotation', 'manual_backup', 'recovery_preparation'],
      required: true,
    },
    backupDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    restorable: {
      type: Boolean,
      default: true,
    },
    
    // Original message timestamp
    originalTimestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'messages_backup', // Use existing collection name
  }
);

// Indexes for efficient queries
MessageBackupSchema.index({ from: 1, to: 1, originalTimestamp: -1 });
MessageBackupSchema.index({ threadId: 1, originalTimestamp: -1 });
MessageBackupSchema.index({ backupDate: -1 });
MessageBackupSchema.index({ originalMessageId: 1, backupDate: -1 });

// Static method to backup a message
MessageBackupSchema.statics.backupMessage = async function (message, reason = 'manual_backup') {
  try {
    const backup = new this({
      originalMessageId: message._id,
      threadId: message.threadId,
      from: message.from,
      to: message.to,
      content: message.content || '',
      encrypted: message.encrypted || false,
      encryptionData: message.encryptionData,
      senderEncryptionData: message.senderEncryptionData,
      attachments: message.attachments || [],
      isRead: message.isRead,
      readAt: message.readAt,
      replyTo: message.replyTo,
      isForwarded: message.isForwarded,
      forwardedFrom: message.forwardedFrom,
      reactions: message.reactions || [],
      status: message.status,
      backupReason: reason,
      originalTimestamp: message.createdAt || message.timestamp || new Date(),
    });
    
    await backup.save();
    return backup;
  } catch (error) {
    console.error('Failed to backup message:', error);
    throw error;
  }
};

// Static method to restore messages for a user
MessageBackupSchema.statics.getRestorableMessages = async function (userId) {
  return this.find({
    $or: [{ from: userId }, { to: userId }],
    restorable: true,
  })
    .sort({ originalTimestamp: -1 })
    .lean();
};

// Static method to cleanup old backups (older than 90 days)
MessageBackupSchema.statics.cleanupOldBackups = async function (daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await this.deleteMany({
    backupDate: { $lt: cutoffDate },
    restorable: false, // Only delete non-restorable backups
  });
  
  return result.deletedCount;
};

module.exports = mongoose.model('MessageBackup', MessageBackupSchema);
