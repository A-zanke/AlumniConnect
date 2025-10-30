/**
 * Quick initialization script for departments
 * Run this to immediately populate all default departments
 * 
 * Usage: node scripts/initDepartments.js
 */

const mongoose = require('mongoose');
const Department = require('../models/Department');
const { DEFAULT_DEPARTMENTS } = require('../config/departments');
require('dotenv').config();

const initDepartments = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni-connect';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('📦 Initializing default departments...');
    console.log(`   Departments to add: ${DEFAULT_DEPARTMENTS.join(', ')}\n`);

    let added = 0;
    let existing = 0;

    for (const deptName of DEFAULT_DEPARTMENTS) {
      try {
        const dept = await Department.findOne({ name: deptName });
        if (dept) {
          console.log(`   ✓ ${deptName} - already exists`);
          existing++;
        } else {
          await Department.create({ name: deptName, code: deptName });
          console.log(`   ✓ ${deptName} - created`);
          added++;
        }
      } catch (err) {
        if (err.code === 11000) {
          console.log(`   ✓ ${deptName} - already exists (duplicate)`);
          existing++;
        } else {
          console.error(`   ✗ ${deptName} - error:`, err.message);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Added: ${added}`);
    console.log(`   - Already existed: ${existing}`);
    console.log(`   - Total: ${added + existing}/${DEFAULT_DEPARTMENTS.length}`);

    // Display all departments
    const allDepts = await Department.find().sort({ name: 1 });
    console.log(`\n📋 All Departments in Database (${allDepts.length} total):`);
    allDepts.forEach(d => console.log(`   - ${d.name}`));

    await mongoose.connection.close();
    console.log('\n✅ Done! Departments initialized successfully.');
    console.log('   You can now restart your backend server.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

initDepartments();
