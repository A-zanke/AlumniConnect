const mongoose = require('mongoose');

const EventRegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Student registration details
  name: {
    type: String,
    required: false
  },
  rollNo: {
    type: String,
    required: false
  },
  year: {
    type: Number,
    required: false
  },
  department: {
    type: String,
    required: false
  },
  division: {
    type: String,
    required: false
  },
  // Attendance tracking
  attended: {
    type: Boolean,
    default: false
  },
  attendedAt: {
    type: Date
  },
  // Registration metadata
  registeredAt: {
    type: Date,
    default: Date.now
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  }
}, { timestamps: true });

// Compound index to prevent duplicate registrations
EventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

// Index for querying registrations by event
EventRegistrationSchema.index({ event: 1 });

// Index for querying registrations by user
EventRegistrationSchema.index({ user: 1 });

module.exports = mongoose.model('EventRegistration', EventRegistrationSchema);
