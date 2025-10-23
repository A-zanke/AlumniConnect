const mongoose = require('mongoose');
const Department = require('../backend/models/Department');

async function seedDepartments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/alumni-connect');

    const departments = ['CSE', 'AI-DS', 'E&TC', 'Mechanical', 'Civil', 'Other'];

    for (const dept of departments) {
      const existing = await Department.findOne({ name: dept });
      if (!existing) {
        await Department.create({ name: dept });
        console.log(`Added department: ${dept}`);
      } else {
        console.log(`Department already exists: ${dept}`);
      }
    }

    console.log('Department seeding completed');
  } catch (error) {
    console.error('Error seeding departments:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedDepartments();
