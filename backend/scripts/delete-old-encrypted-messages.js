const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alumni-connect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));

async function deleteOldEncryptedMessages() {
  try {
    console.log('🗑️  Deleting all old encrypted messages...\n');
    
    // Find all messages with the placeholder text
    const placeholderMessages = await Message.find({
      content: '🔒 This message was encrypted and cannot be recovered'
    });
    
    console.log(`📊 Found ${placeholderMessages.length} old encrypted messages`);
    
    if (placeholderMessages.length === 0) {
      console.log('✅ No old encrypted messages to delete!');
      process.exit(0);
    }
    
    // Delete them
    const result = await Message.deleteMany({
      content: '🔒 This message was encrypted and cannot be recovered'
    });
    
    console.log(`✅ Successfully deleted ${result.deletedCount} old encrypted messages`);
    console.log('\n💡 Both users can now start fresh with working plaintext messages!');
    console.log('💡 All NEW messages will work perfectly without encryption issues.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteOldEncryptedMessages();
