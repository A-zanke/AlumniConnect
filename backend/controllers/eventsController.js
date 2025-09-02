const Event = require('../models/Event');

const createEvent = async (req, res) => {
    try {
        const body = req.body || {};
        const role = (req.user.role || '').toLowerCase();
        const event = await Event.create({
            title: body.title,
            description: body.description,
            organizer: req.user._id,
            audience: body.audience, // 'student', 'teacher', 'alumni'
            departmentScope: parseArray(body.departmentScope),
            yearScope: parseArray(body.yearScope).map(n => Number(n)).filter(n => !Number.isNaN(n)),
            startAt: new Date(body.startAt),
            endAt: new Date(body.endAt),
            approved: role === 'alumni' ? false : true
        });

        // If alumni, send request for approval
        if (role === 'alumni') {
            // Notify admin for approval logic here
        }

        res.status(201).json(event);
    } catch (err) {
        res.status(400).json({ message: 'Failed to create event' });
    }
};

const listEvents = async (req, res) => {
    // Add your logic to fetch events based on user role
};

const approveEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        await Event.findByIdAndUpdate(eventId, { approved: true });
        res.status(200).json({ message: 'Event approved successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to approve event' });
    }
};

module.exports = {
    createEvent,
    listEvents,
    approveEvent
};