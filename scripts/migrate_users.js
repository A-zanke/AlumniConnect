// Migration script: Move users from User collection to Student, Alumni, Teacher, Admin collections
// Usage: node scripts/migrate_users.js

const mongoose = require('mongoose');
const User = require('../backend/models/User');
const Student = mongoose.model('Student', require('../backend/models/Student').schema, 'students');
const Department = mongoose.model('Department', require('../backend/models/Department').schema, 'departments');
const Alumni = mongoose.model('Alumni', require('../backend/models/Alumni').schema, 'alumnis');
const Teacher = mongoose.model('Teacher', require('../backend/models/Teacher').schema, 'teachers');
const Admin = mongoose.model('Admin', require('../backend/models/Admin').schema, 'admin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni-connect';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const users = await mongoose.connection.collection('users').find({}).toArray();
  let studentCount = 0, alumniCount = 0, teacherCount = 0, adminCount = 0, skipped = 0;

  for (const user of users) {
    try {
      if (user.role === 'student') {
        const exists = await Student.findOne({ _id: user._id });
        if (!exists) {
          // Department logic: create if not exists
          let departmentId = null;
          if (user.department) {
            let deptDoc = await Department.findOne({ name: user.department });
            if (!deptDoc) {
              deptDoc = await Department.create({ name: user.department, code: user.department });
            }
            departmentId = deptDoc._id;
          }
          try {
            await Student.create({
              _id: user._id,
              name: user.name || '',
              username: user.username || '',
              email: user.email || '',
              password: user.password || '',
              department: departmentId,
              year: user.year || null,
              division: user.division || 'A',
              graduationYear: user.graduationYear || null,
              emailVerified: user.emailVerified || false
            });
            studentCount++;
          } catch (err) {
            console.error(`Skipped student ${user.username || user._id}:`, err.message);
            skipped++;
          }
        } else {
          console.warn(`Skipped student ${user.username || user._id}: already exists in students collection.`);
          skipped++;
        }
      } else if (user.role === 'alumni') {
        const exists = await Alumni.findOne({ _id: user._id });
        if (!exists) {
          await Alumni.create({
            _id: user._id,
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            password: user.password || '',
            graduationYear: user.graduationYear || null,
            emailVerified: user.emailVerified || false
          });
          alumniCount++;
        } else {
          skipped++;
        }
      } else if (user.role === 'teacher') {
        const exists = await Teacher.findOne({ _id: user._id });
        if (!exists) {
          // Department logic: create if not exists
          let departmentId = null;
          if (user.department) {
            let deptDoc = await Department.findOne({ name: user.department });
            if (!deptDoc) {
              deptDoc = await Department.create({ name: user.department, code: user.department });
            }
            departmentId = deptDoc._id;
          }
          await Teacher.create({
            _id: user._id,
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            password: user.password || '',
            department: departmentId,
            emailVerified: user.emailVerified || false
          });
          teacherCount++;
        } else {
          skipped++;
        }
      } else if (user.role === 'admin') {
        const exists = await Admin.findOne({ _id: user._id });
        if (!exists) {
          await Admin.create({
            _id: user._id,
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            password: user.password || '',
            emailVerified: user.emailVerified || false
          });
          adminCount++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Error migrating user ${user._id}:`, err);
      skipped++;
    }
  }

  console.log('--- Migration Summary ---');
  console.log(`Students migrated: ${studentCount}`);
  console.log(`Alumni migrated:   ${alumniCount}`);
  console.log(`Teachers migrated: ${teacherCount}`);
  console.log(`Admins migrated:   ${adminCount}`);
  console.log(`Skipped/Errors:    ${skipped}`);

  await mongoose.disconnect();
  console.log('Migration complete.');
}

migrate();
