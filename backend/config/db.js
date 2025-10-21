const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    let uriToUse = mongoUri;
    
    if (!mongoUri) {
      console.warn('No MONGO_URI provided, using in-memory MongoDB instance');
      const mem = await MongoMemoryServer.create();
      uriToUse = mem.getUri();
    }

    // Enhanced connection options for better reliability
    const conn = await mongoose.connect(uriToUse, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    });

    // Verify connection is actually working
    await mongoose.connection.db.admin().ping();
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      process.exit(1);
    });

    mongoose.connection.on('disconnected', () => {
      console.error('❌ MongoDB disconnected');
      process.exit(1);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    
    // Only attempt fallback in development
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('🔄 Attempting fallback to in-memory MongoDB...');
        const mem = await MongoMemoryServer.create();
        const uri = mem.getUri();
        const conn = await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false,
        });
        
        await mongoose.connection.db.admin().ping();
        console.log('✅ Fallback: Using in-memory MongoDB instance');
        console.log(`📊 Database: ${conn.connection.name}`);
        return conn;
      } catch (memErr) {
        console.error('❌ In-memory MongoDB start failed:', memErr.message);
      }
    }
    
    console.error('💥 Critical: Cannot start application without database connection');
    process.exit(1);
  }
};

module.exports = connectDB;