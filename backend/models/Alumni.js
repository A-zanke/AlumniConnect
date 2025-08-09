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

const Alumni = mongoose.model('Alumni', alumniSchema);

module.exports = Alumni; 