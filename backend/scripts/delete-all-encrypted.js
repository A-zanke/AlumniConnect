const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alumni-connect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));

async function deleteAllEncrypted() {
  try {
    console.log('🗑️  Deleting ALL encrypted messages...\n');
    
    // Delete all messages marked as encrypted OR with empty content
    const result = await Message.deleteMany({
      $or: [
        { encrypted: true },
        { content: '' },
        { content: null },
        { content: { $exists: false } },
        { content: '🔒 This message was encrypted and cannot be recovered' }
      ]
    });
    
    console.log(`✅ Successfully deleted ${result.deletedCount} messages`);
    console.log('\n💡 Chat history cleared! Both users can now start fresh.');
    console.log('💡 All NEW messages will be plaintext and work perfectly.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteAllEncrypted();
