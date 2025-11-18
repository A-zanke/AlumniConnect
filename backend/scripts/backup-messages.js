/**
 * Message Backup Utility
 * 
 * This script helps backup, restore, and manage encrypted messages
 * Useful when encryption keys change or need to recover old messages
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const MessageBackup = require('../models/MessageBackup');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni-connect';
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

/**
 * Backup all encrypted messages
 */
async function backupAllEncryptedMessages() {
  try {
    console.log('\n📦 Starting backup of all encrypted messages...\n');
    
    const encryptedMessages = await Message.find({ encrypted: true }).lean();
    console.log(`Found ${encryptedMessages.length} encrypted messages to backup`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const msg of encryptedMessages) {
      try {
        // Check if already backed up
        const existingBackup = await MessageBackup.findOne({
          originalMessageId: msg._id,
        });
        
        if (existingBackup) {
          skipCount++;
          continue;
        }
        
        await MessageBackup.backupMessage(msg, 'encryption_migration');
        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`Progress: ${successCount} messages backed up...`);
        }
      } catch (error) {
        console.error(`Failed to backup message ${msg._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n✅ Backup completed!');
    console.log(`   Backed up: ${successCount} messages`);
    console.log(`   Skipped (already backed up): ${skipCount} messages`);
    console.log(`   Errors: ${errorCount} messages\n`);
    
    return { successCount, skipCount, errorCount };
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Backup messages for specific user
 */
async function backupUserMessages(userId) {
  try {
    console.log(`\n📦 Backing up messages for user: ${userId}\n`);
    
    const messages = await Message.find({
      $or: [{ from: userId }, { to: userId }],
    }).lean();
    
    console.log(`Found ${messages.length} messages for user`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const msg of messages) {
      try {
        const existingBackup = await MessageBackup.findOne({
          originalMessageId: msg._id,
        });
        
        if (existingBackup) {
          skipCount++;
          continue;
        }
        
        await MessageBackup.backupMessage(msg, 'manual_backup');
        successCount++;
      } catch (error) {
        console.error(`Failed to backup message ${msg._id}:`, error.message);
      }
    }
    
    console.log(`\n✅ User backup completed!`);
    console.log(`   Backed up: ${successCount} messages`);
    console.log(`   Skipped: ${skipCount} messages\n`);
    
    return { successCount, skipCount };
  } catch (error) {
    console.error('❌ User backup failed:', error);
    throw error;
  }
}

/**
 * Get backup statistics
 */
async function getBackupStats() {
  try {
    console.log('\n📊 Backup Statistics:\n');
    
    const totalBackups = await MessageBackup.countDocuments();
    const restorableBackups = await MessageBackup.countDocuments({ restorable: true });
    const encryptedBackups = await MessageBackup.countDocuments({ encrypted: true });
    
    const reasonStats = await MessageBackup.aggregate([
      {
        $group: {
          _id: '$backupReason',
          count: { $sum: 1 },
        },
      },
    ]);
    
    const oldestBackup = await MessageBackup.findOne().sort({ backupDate: 1 });
    const newestBackup = await MessageBackup.findOne().sort({ backupDate: -1 });
    
    console.log(`Total backups: ${totalBackups}`);
    console.log(`Restorable: ${restorableBackups}`);
    console.log(`Encrypted: ${encryptedBackups}`);
    console.log(`\nBackup reasons:`);
    reasonStats.forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });
    
    if (oldestBackup) {
      console.log(`\nOldest backup: ${oldestBackup.backupDate.toISOString()}`);
    }
    if (newestBackup) {
      console.log(`Newest backup: ${newestBackup.backupDate.toISOString()}`);
    }
    
    console.log('');
    
    return {
      totalBackups,
      restorableBackups,
      encryptedBackups,
      reasonStats,
    };
  } catch (error) {
    console.error('❌ Failed to get stats:', error);
    throw error;
  }
}

/**
 * Cleanup old non-restorable backups
 */
async function cleanupOldBackups(daysToKeep = 90) {
  try {
    console.log(`\n🗑️  Cleaning up backups older than ${daysToKeep} days...\n`);
    
    const deletedCount = await MessageBackup.cleanupOldBackups(daysToKeep);
    
    console.log(`✅ Cleanup completed! Deleted ${deletedCount} old backups\n`);
    
    return deletedCount;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

/**
 * List restorable messages for a user
 */
async function listRestorableMessages(userId, limit = 20) {
  try {
    console.log(`\n📋 Restorable messages for user: ${userId}\n`);
    
    const messages = await MessageBackup.find({
      $or: [{ from: userId }, { to: userId }],
      restorable: true,
    })
      .sort({ originalTimestamp: -1 })
      .limit(limit)
      .populate('from', 'name email')
      .populate('to', 'name email');
    
    console.log(`Found ${messages.length} restorable messages:\n`);
    
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.originalTimestamp.toISOString()}]`);
      console.log(`   From: ${msg.from?.name || msg.from}`);
      console.log(`   To: ${msg.to?.name || msg.to}`);
      console.log(`   Content: ${msg.content?.substring(0, 50) || '[Encrypted]'}...`);
      console.log(`   Encrypted: ${msg.encrypted}`);
      console.log(`   Backup reason: ${msg.backupReason}`);
      console.log('');
    });
    
    return messages;
  } catch (error) {
    console.error('❌ Failed to list messages:', error);
    throw error;
  }
}

// CLI Command Handler
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  await connectDB();
  
  try {
    switch (command) {
      case 'backup-all':
        await backupAllEncryptedMessages();
        break;
        
      case 'backup-user':
        if (!arg) {
          console.error('❌ Please provide user ID: npm run backup:messages backup-user <userId>');
          process.exit(1);
        }
        await backupUserMessages(arg);
        break;
        
      case 'stats':
        await getBackupStats();
        break;
        
      case 'cleanup':
        const days = parseInt(arg) || 90;
        await cleanupOldBackups(days);
        break;
        
      case 'list':
        if (!arg) {
          console.error('❌ Please provide user ID: npm run backup:messages list <userId>');
          process.exit(1);
        }
        await listRestorableMessages(arg, 20);
        break;
        
      default:
        console.log(`
📦 Message Backup Utility

Usage:
  node scripts/backup-messages.js <command> [args]

Commands:
  backup-all              Backup all encrypted messages
  backup-user <userId>    Backup messages for specific user
  stats                   Show backup statistics
  cleanup [days]          Cleanup backups older than X days (default: 90)
  list <userId>           List restorable messages for user

Examples:
  node scripts/backup-messages.js backup-all
  node scripts/backup-messages.js backup-user 507f1f77bcf86cd799439011
  node scripts/backup-messages.js stats
  node scripts/backup-messages.js cleanup 30
  node scripts/backup-messages.js list 507f1f77bcf86cd799439011
        `);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  backupAllEncryptedMessages,
  backupUserMessages,
  getBackupStats,
  cleanupOldBackups,
  listRestorableMessages,
};
