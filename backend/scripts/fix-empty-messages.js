const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alumni-connect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));

async function fixEmptyMessages() {
  try {
    console.log('🔧 Starting to fix empty encrypted messages...');
    
    // Find all encrypted messages with empty or missing content
    const emptyMessages = await Message.find({
      encrypted: true,
      $or: [
        { content: '' },
        { content: { $exists: false } },
        { content: null }
      ]
    });
    
    console.log(`📊 Found ${emptyMessages.length} encrypted messages with empty content`);
    
    if (emptyMessages.length === 0) {
      console.log('✅ No messages need fixing!');
      process.exit(0);
    }
    
    let fixedCount = 0;
    
    for (const msg of emptyMessages) {
      try {
        // Mark as unencrypted with placeholder content
        await Message.updateOne(
          { _id: msg._id },
          {
            $set: {
              encrypted: false,
              content: '🔒 This message was encrypted and cannot be recovered',
              encryptionData: null,
              senderEncryptionData: null
            }
          }
        );
        fixedCount++;
        console.log(`✅ Fixed message ${msg._id}`);
      } catch (err) {
        console.error(`❌ Failed to fix message ${msg._id}:`, err.message);
      }
    }
    
    console.log(`\n✅ Successfully fixed ${fixedCount} out of ${emptyMessages.length} messages`);
    console.log('💡 These messages will now display as "[Old encrypted message - content unavailable]"');
    console.log('💡 New messages will be properly encrypted with fallback content');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the fix
fixEmptyMessages();
