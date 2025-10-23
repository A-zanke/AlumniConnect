const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Always use a real MongoDB instance
    const uri =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AlumniConnect';

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected');
    console.log(`MongoDB Host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Mongo connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;