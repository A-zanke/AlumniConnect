const mongoose = require('mongoose');
const Event = require('./models/Event');
const User = require('./models/User');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/alumni-connect');
    console.log('Connected to MongoDB');

    // Find a student user
    const student = await User.findOne({ role: 'student' });
    if (!student) {
      console.log('No student user found');
      return;
    }
    console.log('Student:', student.name, student.department, student.year);

    // Find events that should be visible to this student
    const events = await Event.find({ status: 'active' });
    console.log('Total events:', events.length);

    // Check targeting logic
    const visibleEvents = events.filter(event => {
      if (event.target_roles.includes('student')) {
        if (event.target_student_combinations.length > 0) {
          return event.target_student_combinations.some(comb =>
            comb.department === student.department && comb.year === student.year
          );
        }
        return true; // All students
      }
      return false;
    });

    console.log('Visible events for student:', visibleEvents.length);
    visibleEvents.forEach(e => console.log('-', e.title, e.target_roles, e.target_student_combinations));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
