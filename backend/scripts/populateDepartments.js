/**
 * Utility script to populate Department collection from existing user registrations
 * Run this once to sync departments from User collection to Department collection
 * 
 * Usage: node scripts/populateDepartments.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
require('dotenv').config();

const populateDepartments = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni-connect';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get unique departments from users
    const uniqueDepartments = await User.distinct('department', {
      department: { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`\n📊 Found ${uniqueDepartments.length} unique departments from users:`);
    uniqueDepartments.forEach(dept => console.log(`   - ${dept}`));

    if (uniqueDepartments.length === 0) {
      console.log('\n⚠️  No departments found in User collection');
      console.log('   Using default departments...');
      
      const defaultDepartments = ['CSE', 'AI-DS', 'E&TC', 'Mechanical', 'Civil', 'Other'];
      const departmentDocs = defaultDepartments.map(name => ({ name }));
      
      await Department.insertMany(departmentDocs, { ordered: false }).catch(err => {
        if (err.code !== 11000) throw err; // Ignore duplicate key errors
      });
      
      console.log('✅ Default departments added to collection');
    } else {
      // Insert departments into Department collection
      const departmentDocs = uniqueDepartments
        .filter(dept => dept && dept.trim())
        .map(name => ({ name: name.trim() }));

      let insertedCount = 0;
      let duplicateCount = 0;

      for (const doc of departmentDocs) {
        try {
          await Department.create(doc);
          insertedCount++;
        } catch (err) {
          if (err.code === 11000) {
            duplicateCount++;
          } else {
            throw err;
          }
        }
      }

      console.log(`\n✅ Departments populated successfully!`);
      console.log(`   - Inserted: ${insertedCount}`);
      console.log(`   - Already existed: ${duplicateCount}`);
    }

    // Display final department list
    const allDepartments = await Department.find().sort({ name: 1 });
    console.log(`\n📋 Final Department Collection (${allDepartments.length} total):`);
    allDepartments.forEach(dept => console.log(`   - ${dept.name}`));

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error populating departments:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

populateDepartments();
