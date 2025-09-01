const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    let uriToUse = mongoUri;
    if (!mongoUri) {
      const mem = await MongoMemoryServer.create();
      uriToUse = mem.getUri();
      console.log('Using in-memory MongoDB instance');
    }
    const conn = await mongoose.connect(uriToUse, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Mongo connection error: ${error.message}`);
    if (process.env.NODE_ENV !== 'production') {
      try {
        const mem = await MongoMemoryServer.create();
        const uri = mem.getUri();
        const conn = await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log('Fallback: Using in-memory MongoDB instance');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return;
      } catch (memErr) {
        console.error('In-memory MongoDB start failed:', memErr.message);
      }
    }
    process.exit(1);
  }
};

module.exports = connectDB;