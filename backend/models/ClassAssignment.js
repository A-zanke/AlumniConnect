const mongoose = require('mongoose');

const ClassAssignmentSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  division: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  batch: {
    type: String,
    required: true
  },
  isClassTeacher: {
    type: Boolean,
    default: false
  },
  subjects: [{
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    }
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ClassAssignmentSchema.index({ teacher: 1, department: 1 });
ClassAssignmentSchema.index({ year: 1, division: 1, batch: 1 });

module.exports = mongoose.model('ClassAssignment', ClassAssignmentSchema); 