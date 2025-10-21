const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Mongo connection error: MONGO_URI is not set');
    process.exit(1);
  }

  // Connection state logging
  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  });
  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('MongoDB connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.error('MongoDB disconnected');
  });

  // Initiate connection
  await mongoose.connect(mongoUri, {
    // Mongoose v7 uses sane defaults; options kept minimal
  });

  return mongoose.connection;
};

const getConnectionState = () => mongoose.connection.readyState; // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
const isDbConnected = () => isConnected || mongoose.connection.readyState === 1;

module.exports = { connectDB, getConnectionState, isDbConnected };