const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    profilePicture: { type: String, default: '' },
    bio: { type: String, default: '' },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    year: {
        type: Number,
        required: true,
        enum: [1,2,3,4]
    },
    graduationYear: { type: Number },
    skills: [{ type: String, trim: true }],

    // Simplified student profile fields
    careerInterests: [{ type: String, trim: true }], // Internships, Research, Startups, Higher Studies
    activities: [{ type: String, trim: true }], // clubs/societies/projects/competitions
    socials: {
        linkedin: { type: String, default: '' },
        github: { type: String, default: '' },
        portfolio: { type: String, default: '' }
    },
    mentorshipOpen: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

studentSchema.index({ name: 'text', username: 'text', skills: 'text' });
studentSchema.index({ department: 1, year: 1 });

const Student = mongoose.model('Student', studentSchema, 'students');

module.exports = Student; 