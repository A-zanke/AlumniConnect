import React, { useState } from 'react';
import axios from 'axios';

const EventCreation = () => {
    const [eventData, setEventData] = useState({
        title: '',
        description: '',
        audience: 'student',
        departmentScope: [],
        yearScope: [],
        startAt: '',
        endAt: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEventData({ ...eventData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/events', eventData);
            alert('Event created successfully!');
        } catch (error) {
            alert('Failed to create event');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input name="title" placeholder="Title" onChange={handleChange} required />
            <textarea name="description" placeholder="Description" onChange={handleChange} required />
            <select name="audience" onChange={handleChange}>
                <option value="student">Students Only</option>
                <option value="teacher">Teachers Only</option>
                <option value="alumni">Alumni Only</option>
            </select>
            <input type="datetime-local" name="startAt" onChange={handleChange} />
            <input type="datetime-local" name="endAt" onChange={handleChange} />
            <button type="submit">Create Event</button>
        </form>
    );
};

export default EventCreation;