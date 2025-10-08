


const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema(
  {
    // Display name of the skill or tip
    name: { type: String, required: true, trim: true },

    // Optional department filter (kept as string for flexibility)
    department: { type: String, trim: true },

    // Optional short tip/description to show users
    tip: { type: String, trim: true },

    // Optional external resource
    link: { type: String, trim: true },

    // Optional tags/keywords to classify the skill
    keywords: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// Useful indexes for quick lookups
SkillSchema.index({ department: 1 });
SkillSchema.index({ keywords: 1 });

module.exports = mongoose.model('Skill', SkillSchema);