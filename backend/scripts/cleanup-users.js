const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Alumni = require('../models/Alumni');
const Admin = require('../models/Admin');
require('dotenv').config();

async function cleanupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all user emails from the main users collection
    const users = await User.find({}, 'email');
    const userEmails = users.map(user => user.email);

    console.log(`Found ${userEmails.length} users in main collection`);

    // Delete from all role-specific collections
    const studentResult = await Student.deleteMany({ email: { $in: userEmails } });
    console.log(`Deleted ${studentResult.deletedCount} students`);

    const teacherResult = await Teacher.deleteMany({ email: { $in: userEmails } });
    console.log(`Deleted ${teacherResult.deletedCount} teachers`);

    const alumniResult = await Alumni.deleteMany({ email: { $in: userEmails } });
    console.log(`Deleted ${alumniResult.deletedCount} alumni`);

    const adminResult = await Admin.deleteMany({ email: { $in: userEmails } });
    console.log(`Deleted ${adminResult.deletedCount} admins`);

    // Clear the main users collection
    const userResult = await User.deleteMany({});
    console.log(`Deleted ${userResult.deletedCount} users from main collection`);

    console.log('Database cleanup completed successfully!');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Alternative: If you want to delete ALL users from ALL collections
async function deleteAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete from all collections
    const results = await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Teacher.deleteMany({}),
      Alumni.deleteMany({}),
      Admin.deleteMany({})
    ]);

    console.log('Deleted from collections:');
    console.log(`Users: ${results[0].deletedCount}`);
    console.log(`Students: ${results[1].deletedCount}`);
    console.log(`Teachers: ${results[2].deletedCount}`);
    console.log(`Alumni: ${results[3].deletedCount}`);
    console.log(`Admins: ${results[4].deletedCount}`);

    console.log('All users deleted from all collections!');

  } catch (error) {
    console.error('Error during deletion:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Choose which function to run
if (process.argv[2] === 'all') {
  deleteAllUsers();
} else {
  cleanupDatabase();
}
