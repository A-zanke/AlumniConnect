const mongoose = require('mongoose');
const User = require('../backend/models/User');
require('dotenv').config({ path: '../backend/.env' });

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    await User.syncIndexes();
    console.log('Indexes synced!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Index sync error:', err);
    process.exit(1);
  });