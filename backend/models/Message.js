const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a skill name'],
    trim: true
  },
  proficiency: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  }
});

module.exports = mongoose.model('Skill', SkillSchema);