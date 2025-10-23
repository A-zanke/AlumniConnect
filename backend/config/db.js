const mongoose = require('mongoose');

// Connect to real MongoDB only. No in-memory fallback.
// Defaults to local AlumniConnect if MONGO_URI not provided.
const connectDB = async () => {
  try {
    const uri =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AlumniConnect';

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected');
    if (conn?.connection?.host) {
      console.log(`Mongo Host: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`Mongo connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;