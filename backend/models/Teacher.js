const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
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
    role: {
        type: String,
        enum: ['teacher', 'hod', 'admin'],
        default: 'teacher'
    },
    position: { type: String, default: '' },
    qualifications: [{
        degree: {
            type: String,
            required: true
        },
        specialization: String,
        institution: String,
        year: Number
    }],
    expertise: [{
        area: String,
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        }
    }],
    skills: [{ type: String, trim: true }],
    publications: [{
        title: String,
        authors: [String],
        journal: String,
        year: Number,
        doi: String,
        url: String
    }],
    researchProjects: [{
        title: String,
        description: String,
        startDate: Date,
        endDate: Date,
        status: {
            type: String,
            enum: ['ongoing', 'completed'],
            default: 'ongoing'
        },
        funding: String,
        collaborators: [String]
    }],
    location: { type: String, default: '' },
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
    classAssignments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassAssignment'
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

teacherSchema.index({ name: 'text', username: 'text', skills: 'text', department: 1 });
teacherSchema.index({ role: 1, department: 1 });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher; 