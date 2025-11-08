const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alumni-connect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));

async function updatePlaceholders() {
  try {
    console.log('🔧 Updating placeholder messages...');
    
    // Find all messages with the old placeholder
    const result = await Message.updateMany(
      { content: '[Old encrypted message - content unavailable]' },
      { $set: { content: '🔒 This message was encrypted and cannot be recovered' } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} messages`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updatePlaceholders();
