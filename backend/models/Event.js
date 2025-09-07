const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Target audience configuration with department-year pairs
  target_roles: [{ type: String, enum: ['student', 'teacher', 'alumni'], default: [] }],
  target_student_combinations: [{
    department: { type: String, required: true },
    year: { type: Number, required: true }
  }],
  target_alumni_combinations: [{
    department: { type: String, required: true },
    graduation_year: { type: Number, required: true }
  }],
  
  // Status for alumni events approval workflow
  status: { 
    type: String, 
    enum: ['active', 'pending', 'rejected'], 
    default: 'active' 
  },
  
  // Legacy fields for backward compatibility
  departmentScope: [{ type: String }],
  yearScope: [{ type: Number }],
  graduationYearScope: [{ type: Number }],
  roleScope: [{ type: String, enum: ['student', 'teacher', 'alumni'] }],
  audience: { type: String, enum: ['college', 'department', 'year', 'custom'], default: 'college' },
  approved: { type: Boolean, default: true },
  
  location: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  imageUrl: { type: String },
  rsvps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

EventSchema.index({ startAt: 1 });
EventSchema.index({ organizer: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ 'target_roles': 1 });
EventSchema.index({ 'target_student_combinations.department': 1, 'target_student_combinations.year': 1 });
EventSchema.index({ 'target_alumni_combinations.department': 1, 'target_alumni_combinations.graduation_year': 1 });

module.exports = mongoose.model('Event', EventSchema);

