// Script to list all collections in the MongoDB database
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni-connect';

async function listCollections() {
  await mongoose.connect(MONGO_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in DB:');
  collections.forEach(col => console.log(col.name));
  await mongoose.disconnect();
}

listCollections();
