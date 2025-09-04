
const Event = require('../models/Event');

// Helper function to parse arrays
const parseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return value.split(',').map(item => item.trim()).filter(item => item);
        }
    }
    return [];
};

const createEvent = async (req, res) => {
    try {
        const body = req.body || {};
        const role = (req.user.role || '').toLowerCase();
        const event = await Event.create({
            title: body.title,
            description: body.description,
            organizer: req.user._id,
            audience: body.audience,
            departmentScope: parseArray(body.departmentScope),
            yearScope: parseArray(body.yearScope).map(n => Number(n)).filter(n => !Number.isNaN(n)),
            graduationYearScope: parseArray(body.graduationYearScope).map(n => Number(n)).filter(n => !Number.isNaN(n)),
            roleScope: parseArray(body.roleScope).map(v => String(v).toLowerCase()).filter(v => ['student','teacher','alumni'].includes(v)),
            location: body.location,
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
        console.error('Error creating event:', err);
        res.status(400).json({ message: 'Failed to create event', error: err.message });
    }
};

const listEvents = async (req, res) => {
    try {
        const events = await Event.find({ approved: true })
            .populate('organizer', 'name email')
            .sort({ startAt: -1 });
        res.status(200).json(events);
    } catch (err) {
        console.error('Error listing events:', err);
        res.status(500).json({ message: 'Failed to fetch events' });
    }
};

const approveEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        await Event.findByIdAndUpdate(eventId, { approved: true });
        res.status(200).json({ message: 'Event approved successfully' });
    } catch (err) {
        console.error('Error approving event:', err);
        res.status(500).json({ message: 'Failed to approve event' });
    }
};

const getEventById = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId)
            .populate('organizer', 'name email')
            .populate('rsvps', 'name email');
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        res.status(200).json(event);
    } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).json({ message: 'Failed to fetch event' });
    }
};

const rsvpEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        if (event.rsvps.includes(userId)) {
            return res.status(400).json({ message: 'Already RSVP\'d to this event' });
        }
        
        event.rsvps.push(userId);
        await event.save();
        
        res.status(200).json({ message: 'RSVP successful' });
    } catch (err) {
        console.error('Error RSVPing to event:', err);
        res.status(500).json({ message: 'Failed to RSVP to event' });
    }
};

const listPending = async (req, res) => {
    try {
        const events = await Event.find({ approved: false })
            .populate('organizer', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(events);
    } catch (err) {
        console.error('Error listing pending events:', err);
        res.status(500).json({ message: 'Failed to fetch pending events' });
    }
};

module.exports = {
    createEvent,
    listEvents,
    approveEvent,
    getEventById,
    rsvpEvent,
    listPending
};
