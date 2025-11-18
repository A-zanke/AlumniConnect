const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alumni-connect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));

async function checkMessages() {
  try {
    console.log('🔍 Checking recent messages...\n');
    
    // Get the 10 most recent messages
    const recentMessages = await Message.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    console.log(`Found ${recentMessages.length} recent messages:\n`);
    
    recentMessages.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`);
      console.log(`  ID: ${msg._id}`);
      console.log(`  From: ${msg.from}`);
      console.log(`  To: ${msg.to}`);
      console.log(`  Encrypted: ${msg.encrypted || false}`);
      console.log(`  Content: ${msg.content ? `"${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}"` : '(empty)'}`);
      console.log(`  Content Length: ${msg.content ? msg.content.length : 0}`);
      console.log(`  Has EncryptionData: ${!!msg.encryptionData}`);
      console.log(`  Created: ${msg.createdAt}`);
      console.log('');
    });
    
    // Count messages by status
    const stats = await Message.aggregate([
      {
        $group: {
          _id: {
            encrypted: '$encrypted',
            hasContent: { $cond: [{ $and: [{ $ne: ['$content', null] }, { $ne: ['$content', ''] }] }, true, false] }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📊 Message Statistics:');
    stats.forEach(stat => {
      console.log(`  Encrypted: ${stat._id.encrypted || false}, Has Content: ${stat._id.hasContent} => ${stat.count} messages`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMessages();
