const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Always use a real MongoDB instance
    const uri =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni-connect';

    // Remove deprecated options (Mongoose 6+ handles these automatically)
    const conn = await mongoose.connect(uri);

    console.log('✅ MongoDB Connected');
    console.log(`MongoDB Host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Mongo connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;