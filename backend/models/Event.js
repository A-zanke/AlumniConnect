const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },

  // Keep legacy for compatibility with existing code
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // New creator info (do not remove organizer to avoid breaking other features)
  createdBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['student', 'teacher', 'alumni', 'admin'], required: true },
    name: { type: String, default: '' }
  },

  // Strict targeting
  target_roles: [{ type: String, enum: ['student', 'teacher', 'alumni'] }],

  // Student: strict department + year pairs
  target_student_combinations: [{
    department: { type: String, required: true },
    year: { type: Number, required: true }
  }],

  // Teacher: list of departments
  target_teacher_departments: [{ type: String }],

  // Alumni: strict department + graduation_year pairs
  target_alumni_combinations: [{
    department: { type: String, required: true },
    graduation_year: { type: Number, required: true }
  }],

  status: { type: String, enum: ['active', 'pending', 'rejected'], default: 'active' },

  // Date fields
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  // Audience field for notification and privacy
  audience: {
    type: [String], // e.g., ["student", "teacher", "alumni"]
    required: true
  },
  departmentScope: [{ type: String }],
  yearScope: [{ type: Number }],
  graduationYearScope: [{ type: Number }],
  roleScope: [{ type: String, enum: ['student', 'teacher', 'alumni'] }],
  imageUrl: { type: String },
  location: { type: String },

  // Legacy approval flag kept for UI compatibility
  approved: { type: Boolean, default: true },

  rsvps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Registration settings
  requiresRegistration: { type: Boolean, default: true },
  registrationDeadline: { type: Date },
  maxAttendees: { type: Number },
  
  // Tracking
  registrationCount: { type: Number, default: 0 },
  attendanceCount: { type: Number, default: 0 }
}, { timestamps: true });

EventSchema.index({ startAt: 1 });
EventSchema.index({ organizer: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ 'target_roles': 1 });
EventSchema.index({ 'target_student_combinations.department': 1, 'target_student_combinations.year': 1 });
EventSchema.index({ 'target_teacher_departments': 1 });
EventSchema.index({ 'target_alumni_combinations.department': 1, 'target_alumni_combinations.graduation_year': 1 });

module.exports = mongoose.model('Event', EventSchema);
