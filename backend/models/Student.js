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
    rollNumber: {
        type: String,
        required: true,
        unique: true
    },
    major: { type: String, default: '' },
    graduationYear: { type: Number },
    skills: [{ type: String, trim: true }],
    certifications: [{
        name: {
            type: String,
            required: true
        },
        issuer: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        credentialId: String,
        credentialUrl: String
    }],
    projects: [{
        name: {
            type: String,
            required: true
        },
        description: String,
        startDate: Date,
        endDate: Date,
        status: {
            type: String,
            enum: ['ongoing', 'completed'],
            default: 'ongoing'
        },
        technologies: [String],
        githubUrl: String,
        liveUrl: String,
        teamMembers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        }]
    }],
    achievements: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        date: Date,
        issuer: String,
        certificateUrl: String
    }],
    internships: [{
        company: {
            type: String,
            required: true
        },
        position: String,
        startDate: Date,
        endDate: Date,
        description: String,
        certificateUrl: String
    }],
    location: { type: String, default: '' },
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    academicPerformance: [{
        semester: {
            type: Number,
            required: true
        },
        sgpa: Number,
        cgpa: Number,
        subjects: [{
            name: String,
            code: String,
            grade: String,
            credits: Number
        }]
    }],
    attendance: [{
        semester: Number,
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
        },
        present: Number,
        total: Number,
        percentage: Number
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

studentSchema.index({ name: 'text', username: 'text', skills: 'text', major: 'text' });
studentSchema.index({ department: 1, year: 1, division: 1, batch: 1 });
studentSchema.index({ rollNumber: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student; 