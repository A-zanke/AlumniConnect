const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  synonyms: { type: [String], default: [] }, // optional
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} } // optional extra info
}, { timestamps: true });

module.exports = mongoose.model('Skill', SkillSchema);