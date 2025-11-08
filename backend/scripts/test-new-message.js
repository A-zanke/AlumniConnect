const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alumni-connect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));

async function checkNewMessages() {
  try {
    console.log('🔍 Checking messages from the last 5 minutes...\n');
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentMessages = await Message.find({
      createdAt: { $gte: fiveMinutesAgo }
    })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${recentMessages.length} messages from the last 5 minutes:\n`);
    
    if (recentMessages.length === 0) {
      console.log('No recent messages found. Try sending a new message and run this script again.');
      process.exit(0);
    }
    
    recentMessages.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`);
      console.log(`  ID: ${msg._id}`);
      console.log(`  Encrypted: ${msg.encrypted || false}`);
      console.log(`  Content: ${msg.content ? `"${msg.content}"` : '(empty)'}`);
      console.log(`  Content Length: ${msg.content ? msg.content.length : 0}`);
      console.log(`  Has EncryptionData: ${!!msg.encryptionData}`);
      if (msg.encryptionData) {
        console.log(`  EncryptionData Keys: ${Object.keys(msg.encryptionData).join(', ')}`);
      }
      console.log(`  Created: ${msg.createdAt}`);
      console.log('');
    });
    
    // Check if any new messages are encrypted without content
    const brokenNewMessages = recentMessages.filter(msg => 
      msg.encrypted && (!msg.content || msg.content.trim() === '')
    );
    
    if (brokenNewMessages.length > 0) {
      console.log(`⚠️  WARNING: ${brokenNewMessages.length} new messages are encrypted without fallback content!`);
      console.log('This means the backend fix is not working properly.');
    } else {
      console.log('✅ All recent messages have proper content!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkNewMessages();
