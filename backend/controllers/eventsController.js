const Event = require('../models/Event');

const createEvent = async (req, res) => {
  try {
    const body = req.body || {};
    const event = await Event.create({
      title: body.title,
      description: body.description,
      organizer: req.user._id,
      departmentScope: body.departmentScope || [],
      yearScope: body.yearScope || [],
      audience: body.audience || 'college',
      location: body.location || '',
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      approved: req.user.role === 'teacher' || req.user.role === 'admin' ? true : false
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create event' });
  }
};

const listEvents = async (req, res) => {
  try {
    const query = { approved: true };
    const events = await Event.find(query).sort({ startAt: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

const listPending = async (req, res) => {
  try {
    const events = await Event.find({ approved: false }).sort({ createdAt: -1 }).populate('organizer', 'name');
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending events' });
  }
};

const approveEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve event' });
  }
};

const rsvpEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!event.rsvps.includes(req.user._id)) event.rsvps.push(req.user._id);
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Failed to RSVP' });
  }
};

module.exports = { createEvent, listEvents, listPending, approveEvent, rsvpEvent };

