/**
 * Check notifications in database
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
require('dotenv').config();

const checkNotifications = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni-connect';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const count = await Notification.countDocuments();
    console.log(`📊 Total notifications in database: ${count}\n`);

    if (count > 0) {
      const notifications = await Notification.find()
        .populate('sender', 'name username')
        .populate('recipient', 'name username')
        .sort({ createdAt: -1 })
        .limit(10);

      console.log('📋 Last 10 notifications:');
      notifications.forEach((n, i) => {
        console.log(`\n${i + 1}. ${n.type} - ${n.read ? '✓ Read' : '✗ Unread'}`);
        console.log(`   From: ${n.sender?.name || 'Unknown'}`);
        console.log(`   To: ${n.recipient?.name || 'Unknown'}`);
        console.log(`   Content: ${n.content}`);
        console.log(`   Created: ${n.createdAt}`);
      });
    } else {
      console.log('⚠️  No notifications found in database!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

checkNotifications();
