const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    company: {
        type: String,
        default: ''
    },
    position: {
        type: String,
        default: ''
    },
    skills: [{
        type: String,
        trim: true
    }],
    graduationYear: {
        type: Number
    },
    degree: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    
    // Academic Background for AI recommendation system
    specialization: { type: String, default: '' },
    // higher_studies removed as per requirements
    
    // Career Info
    current_job_title: { type: String, default: '' },
    company: { type: String, default: '' },
    industry: { type: String, default: '' },
    past_experience: [{ type: String, trim: true }],
    
    // Mentorship
    mentorship_interests: [{ 
        type: String, 
        enum: ['Career Guidance', 'Higher Studies', 'Technical Mentoring', 'Startup Advice'],
        default: []
    }],
    preferred_students: [{ type: String, trim: true }], // e.g., Same Department, Interested in AI, Entrepreneurship
    availability: { 
        type: String, 
        enum: ['Weekly', 'Bi-weekly', 'Monthly'],
        default: 'Monthly'
    },
    
    // Achievements
    certifications: [{ type: String, trim: true }],
    publications: [{ type: String, trim: true }],
    entrepreneurship: { type: String, default: '' }, // e.g., Founder of XYZ
    
    // Networking
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    website: { type: String, default: '' },
    connections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni'
    }],
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
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

// Add index for search functionality
alumniSchema.index({ name: 'text', skills: 'text', company: 'text', position: 'text' });

const Alumni = mongoose.model('Alumni', alumniSchema, 'alumnis');

module.exports = Alumni; 