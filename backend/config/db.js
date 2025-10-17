const mongoose = require('mongoose');

// Only enable in-memory MongoDB when explicitly requested.
const shouldUseInMemory = String(process.env.USE_IN_MEMORY_DB || '').toLowerCase() === 'true';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    let uriToUse = mongoUri;

    if (!mongoUri) {
      if (shouldUseInMemory) {
        // Lazy-load to avoid requiring the package unless needed
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mem = await MongoMemoryServer.create();
        uriToUse = mem.getUri();
        console.log('Using in-memory MongoDB instance');
      } else {
        throw new Error('MONGO_URI is not set. Set MONGO_URI or enable USE_IN_MEMORY_DB=true');
      }
    }
    const conn = await mongoose.connect(uriToUse, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Mongo connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;