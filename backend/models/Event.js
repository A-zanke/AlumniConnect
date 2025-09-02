import React from 'react';
import { motion } from 'framer-motion';

const HomePage = () => {
    return (
        <div>
            <h1>Welcome to Alumni Connect</h1>
            <div className="banner">
                <h2 className="text-2xl text-white">MIT - Maharashtra Institute of Technology, Aurangabad</h2>
            </div>
            <div className="testimonials">
                <h2>Latest Placements</h2>
                <div className="placement-card">Student Name - Company - Role</div>
            </div>
        </div>
    );
};

export default HomePage;const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentScope: [{ type: String }],
  yearScope: [{ type: Number }],
  audience: { type: String, enum: ['college', 'department', 'year', 'custom'], default: 'college' },
  location: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  approved: { type: Boolean, default: false },
  rsvps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

EventSchema.index({ startAt: 1 });
EventSchema.index({ organizer: 1 });

module.exports = mongoose.model('Event', EventSchema);