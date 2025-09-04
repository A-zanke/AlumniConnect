const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentScope: [{ type: String }],
  yearScope: [{ type: Number }],
  graduationYearScope: [{ type: Number }],
  roleScope: [{ type: String, enum: ['student', 'teacher', 'alumni'] }],
  audience: { type: String, enum: ['college', 'department', 'year', 'custom'], default: 'college' },
  location: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  imageUrl: { type: String },
  approved: { type: Boolean, default: false },
  rsvps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

EventSchema.index({ startAt: 1 });
EventSchema.index({ organizer: 1 });

module.exports = mongoose.model('Event', EventSchema);