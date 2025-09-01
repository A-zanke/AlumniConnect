const Event = require('../models/Event');

const matchesTarget = (ev, user) => {
  // audience: college (all), department (check), year (check), custom (check both arrays)
  const aud = ev.audience || 'college';
  if (aud === 'college') return true;
  if (aud === 'department') {
    return ev.departmentScope?.length ? ev.departmentScope.includes(user?.department) : true;
  }
  if (aud === 'year') {
    return ev.yearScope?.length ? ev.yearScope.includes(Number(user?.year)) : true;
  }
  // 'custom' -> both arrays optional; if provided must match
  if (ev.departmentScope?.length && !ev.departmentScope.includes(user?.department)) return false;
  if (ev.yearScope?.length && !ev.yearScope.includes(Number(user?.year))) return false;
  return true;
};

const parseArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
};

const createEvent = async (req, res) => {
  try {
    const body = req.body || {};
    const role = (req.user.role || '').toLowerCase();
    const event = await Event.create({
      title: body.title,
      description: body.description,
      organizer: req.user._id,
      departmentScope: parseArray(body.departmentScope),
      yearScope: parseArray(body.yearScope).map(n => Number(n)).filter(n => !Number.isNaN(n)),
      audience: body.audience || 'college',
      location: body.location || '',
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      approved: role === 'alumni' ? false : true
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create event' });
  }
};

const listEvents = async (req, res) => {
  try {
    const events = await Event.find({ approved: true }).sort({ startAt: 1 });
    const user = req.user;
    const visible = events.filter(e => matchesTarget(e, user));
    res.json(visible);
  } catch {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

const listPending = async (req, res) => {
  try {
    const events = await Event.find({ approved: false }).sort({ createdAt: -1 }).populate('organizer', 'name');
    res.json(events);
  } catch {
    res.status(500).json({ message: 'Failed to fetch pending events' });
  }
};

const approveEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch {
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
  } catch {
    res.status(500).json({ message: 'Failed to RSVP' });
  }
};

module.exports = { createEvent, listEvents, listPending, approveEvent, rsvpEvent };