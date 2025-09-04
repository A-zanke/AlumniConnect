const Event = require('../models/Event');

const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); }
    catch { return value.split(',').map(s => s.trim()).filter(Boolean); }
  }
  return [];
};

const coerceDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};

const buildEventPayload = (req) => {
  const body = req.body || {};
  const startAt = coerceDate(body.startAt);
  const endAt = coerceDate(body.endAt || body.startAt);

  if (!startAt || !endAt) {
    const err = new Error('Invalid or missing start/end date');
    err.status = 400;
    throw err;
  }

  const payload = {
    title: body.title,
    description: body.description,
    organizer: req.user._id,
    audience: body.audience,
    departmentScope: parseArray(body.departmentScope),
    yearScope: parseArray(body.yearScope).map(n => Number(n)).filter(n => !Number.isNaN(n)),
    graduationYearScope: parseArray(body.graduationYearScope).map(n => Number(n)).filter(n => !Number.isNaN(n)),
    roleScope: parseArray(body.roleScope).map(v => String(v).toLowerCase()).filter(v => ['student','teacher','alumni'].includes(v)),
    location: body.location,
    startAt,
    endAt
  };

  if (req.file && req.file.filename) {
    payload.imageUrl = `/uploads/${req.file.filename}`;
  }

  return payload;
};

const createEvent = async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    const payload = buildEventPayload(req);

    const event = await Event.create({
      ...payload,
      approved: role === 'alumni' ? false : true
    });

    res.status(201).json(event);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(err.status || 400).json({ message: err.message || 'Failed to create event' });
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
    if (!event) return res.status(404).json({ message: 'Event not found' });
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
    if (!event) return res.status(404).json({ message: 'Event not found' });
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

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = buildEventPayload(req);
    const updated = await Event.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Event not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(err.status || 400).json({ message: err.message || 'Failed to update event' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Event.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ message: 'Failed to delete event' });
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
  updateEvent,
  deleteEvent,
  listPending
};