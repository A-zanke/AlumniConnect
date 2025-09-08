/*
  Simple seed script to populate users with roles, departments, skills, and years
  Usage: node seed.js
*/
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

async function run() {
  await connectDB();
  try {
    await User.deleteMany({ email: /seed@demo.com$/ });

    const departments = ['CSE', 'ECE', 'ME', 'CE'];
    const skillsPool = ['React', 'Node', 'MongoDB', 'Python', 'Django', 'Java', 'C++', 'ML', 'DevOps'];

    const docs = [];
    const roles = ['student', 'alumni', 'teacher'];
    for (let i = 1; i <= 12; i++) {
      const role = roles[(i - 1) % roles.length];
      const dept = departments[i % departments.length];
      const year = 2022 + (i % 3);
      const graduationYear = role === 'student' ? undefined : 2018 + (i % 5);
      const skills = skillsPool.filter((_, idx) => (idx + i) % 3 === 0).slice(0, 4);
      docs.push({
        username: `seeduser${i}`,
        password: 'Password@123',
        name: `Seed User ${i}`,
        email: `seed${i}@demo.com`,
        role,
        department: dept,
        year: role === 'student' ? year : undefined,
        graduationYear,
        skills
      });
    }

    const created = await User.insertMany(docs);
    console.log(`Inserted ${created.length} users`);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
  }
}

run();


