const Event = require('../models/Event');
const User = require('../models/User');

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

  // Build target roles array
  const target_roles = parseArray(body.target_roles).map(v => String(v).toLowerCase()).filter(v => ['student','teacher','alumni'].includes(v));

  // Build target student combinations (department-year pairs)
  const target_student_combinations = [];
  if (body.target_student_combinations) {
    const combinations = parseArray(body.target_student_combinations);
    combinations.forEach(combo => {
      if (typeof combo === 'object' && combo.department && combo.year) {
        target_student_combinations.push({
          department: combo.department,
          year: Number(combo.year)
        });
      }
    });
  }

  // Build target alumni combinations (department-graduation_year pairs)
  const target_alumni_combinations = [];
  if (body.target_alumni_combinations) {
    const combinations = parseArray(body.target_alumni_combinations);
    combinations.forEach(combo => {
      if (typeof combo === 'object' && combo.department && combo.graduation_year) {
        target_alumni_combinations.push({
          department: combo.department,
          graduation_year: Number(combo.graduation_year)
        });
      }
    });
  }

  const payload = {
    title: body.title,
    description: body.description,
    organizer: req.user._id,
    target_roles,
    target_student_combinations,
    target_alumni_combinations,
    
    // Legacy fields for backward compatibility
    audience: body.audience,
    departmentScope: target_student_combinations.map(c => c.department).concat(target_alumni_combinations.map(c => c.department)),
    yearScope: target_student_combinations.map(c => c.year),
    graduationYearScope: target_alumni_combinations.map(c => c.graduation_year),
    roleScope: target_roles,
    
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

    // Set status based on creator role
    let status = 'active';
    let approved = true;
    
    if (role === 'alumni') {
      status = 'pending';
      approved = false;
    }

    const event = await Event.create({
      ...payload,
      status,
      approved
    });

    res.status(201).json(event);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(err.status || 400).json({ message: err.message || 'Failed to create event' });
  }
};

const listEvents = async (req, res) => {
  try {
    const user = req.user;
    const userRole = (user.role || '').toLowerCase();
    
    // Get user's profile details for filtering
    const userProfile = await User.findById(user._id).select('department year graduationYear role');
    
    // Build filter based on user's role and profile
    const filter = { status: 'active' };
    
    if (userRole === 'student') {
      // Students see events ONLY IF:
      // - "student" in event.target_roles
      // - AND (user.department, user.year) matches one of the stored (department, year) pairs
      filter.$and = [
        { target_roles: 'student' }
      ];
      
      if (userProfile.department && userProfile.year) {
        filter.$and.push({
          target_student_combinations: {
            $elemMatch: {
              department: userProfile.department,
              year: userProfile.year
            }
          }
        });
      }
      
    } else if (userRole === 'teacher') {
      // Teachers see events ONLY IF:
      // - "teacher" in event.target_roles
      filter.target_roles = 'teacher';
      
    } else if (userRole === 'alumni') {
      // Alumni see events ONLY IF:
      // - "alumni" in event.target_roles
      // - AND (user.department, user.graduation_year) matches one of the stored (department, graduation_year) pairs
      filter.$and = [
        { target_roles: 'alumni' }
      ];
      
      if (userProfile.department && userProfile.graduationYear) {
        filter.$and.push({
          target_alumni_combinations: {
            $elemMatch: {
              department: userProfile.department,
              graduation_year: userProfile.graduationYear
            }
          }
        });
      }
      
    } else if (userRole === 'admin') {
      // Admins see all active events for review
      delete filter.status;
      filter.status = { $in: ['active', 'pending'] };
    }

    const events = await Event.find(filter)
      .populate('organizer', 'name email role department year graduationYear')
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
    const updated = await Event.findByIdAndUpdate(
      eventId, 
      { 
        status: 'active',
        approved: true 
      },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(200).json({ message: 'Event approved successfully', event: updated });
  } catch (err) {
    console.error('Error approving event:', err);
    res.status(500).json({ message: 'Failed to approve event' });
  }
};

const rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const updated = await Event.findByIdAndUpdate(
      eventId, 
      { 
        status: 'rejected',
        approved: false 
      },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(200).json({ message: 'Event rejected successfully', event: updated });
  } catch (err) {
    console.error('Error rejecting event:', err);
    res.status(500).json({ message: 'Failed to reject event' });
  }
};

const getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId)
      .populate('organizer', 'name email role department year graduationYear')
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
    const events = await Event.find({ 
      status: 'pending',
      approved: false 
    })
      .populate('organizer', 'name email role department year graduationYear')
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
  rejectEvent,
  getEventById,
  rsvpEvent,
  updateEvent,
  deleteEvent,
  listPending
};
