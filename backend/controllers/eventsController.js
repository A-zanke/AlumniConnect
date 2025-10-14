const Event = require('../models/Event');
const User = require('../models/User');

const isLikelyJson = (s) => {
	if (typeof s !== 'string') return false;
	const t = s.trim();
	return (t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'));
};

const ensureArray = (value) => {
	if (value === undefined || value === null) return [];
	if (Array.isArray(value)) return value;
	if (typeof value === 'string') {
		if (isLikelyJson(value)) {
			try {
				const parsed = JSON.parse(value);
				return Array.isArray(parsed) ? parsed : [parsed];
			} catch {
				return [value];
			}
		}
		return [value];
	}
	return [value];
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

	// Normalize roles to array of valid roles
	const target_roles = ensureArray(body.target_roles)
		.map(v => String(v).toLowerCase())
		.filter(v => ['student','teacher','alumni'].includes(v));

	if (!target_roles.length) {
		const err = new Error('Please select at least one target role');
		err.status = 400;
		throw err;
	}

	// Student department-year pairs
	let target_student_combinations = [];
	ensureArray(body.target_student_combinations).forEach(item => {
		let obj = item;
		if (typeof item === 'string' && isLikelyJson(item)) {
			try { obj = JSON.parse(item); } catch { obj = null; }
		}
		if (obj && typeof obj === 'object' && obj.department && obj.year !== undefined) {
			const yearNum = Number(obj.year);
			if (!Number.isNaN(yearNum)) {
				target_student_combinations.push({ department: String(obj.department), year: yearNum });
			}
		}
	});

	// Teacher departments
	const target_teacher_departments = ensureArray(body.target_teacher_departments).map(String);

	// Alumni department-graduation_year pairs
	let target_alumni_combinations = [];
	ensureArray(body.target_alumni_combinations).forEach(item => {
		let obj = item;
		if (typeof item === 'string' && isLikelyJson(item)) {
			try { obj = JSON.parse(item); } catch { obj = null; }
		}
		if (obj && typeof obj === 'object' && obj.department && obj.graduation_year !== undefined) {
			const gy = Number(obj.graduation_year);
			if (!Number.isNaN(gy)) {
				target_alumni_combinations.push({ department: String(obj.department), graduation_year: gy });
			}
		}
	});

	const payload = {
		title: body.title,
		description: body.description,
		organizer: req.user._id, // legacy compatibility
		createdBy: {
			id: req.user._id,
			role: req.user.role,
			name: req.user.name || req.user.username || ''
		},
		target_roles,
		target_student_combinations,
		target_teacher_departments,
		target_alumni_combinations,
		location: body.location,
		startAt,
		endAt,

		// legacy fields for compatibility only (not used for filtering)
		audience: body.audience,
		departmentScope: [
			...target_teacher_departments,
			...target_student_combinations.map(c => c.department),
			...target_alumni_combinations.map(c => c.department)
		],
		yearScope: target_student_combinations.map(c => c.year),
		graduationYearScope: target_alumni_combinations.map(c => c.graduation_year),
		roleScope: target_roles
	};

	if (req.file && req.file.filename) {
		payload.imageUrl = `/uploads/${req.file.filename}`;
	}

	return payload;
};

const Notification = require('../models/Notification');
const createEvent = async (req, res) => {
	try {
		const creatorRole = (req.user.role || '').toLowerCase();
		const payload = buildEventPayload(req);

		let status = 'active';
		let approved = true;
		if (creatorRole === 'alumni') {
			status = 'pending';
			approved = false;
		}

		const event = await Event.create({
			...payload,
			status,
			approved
		});

    // Find targeted users based on criteria
    let targetedUserIds = new Set();

    // For students
    if (payload.target_roles.includes('student') && payload.target_student_combinations.length > 0) {
      const studentFilter = {
        role: 'student',
        $or: payload.target_student_combinations.map(comb => ({
          department: comb.department,
          year: comb.year
        }))
      };
      const students = await User.find(studentFilter).select('_id');
      students.forEach(s => targetedUserIds.add(s._id.toString()));
    } else if (payload.target_roles.includes('student')) {
      // All students if no specific combinations
      const allStudents = await User.find({ role: 'student' }).select('_id');
      allStudents.forEach(s => targetedUserIds.add(s._id.toString()));
    }

    // For teachers
    if (payload.target_roles.includes('teacher') && payload.target_teacher_departments.length > 0) {
      const teacherFilter = {
        role: 'teacher',
        department: { $in: payload.target_teacher_departments }
      };
      const teachers = await User.find(teacherFilter).select('_id');
      teachers.forEach(t => targetedUserIds.add(t._id.toString()));
    } else if (payload.target_roles.includes('teacher')) {
      // All teachers
      const allTeachers = await User.find({ role: 'teacher' }).select('_id');
      allTeachers.forEach(t => targetedUserIds.add(t._id.toString()));
    }

    // For alumni
    if (payload.target_roles.includes('alumni') && payload.target_alumni_combinations.length > 0) {
      const alumniFilter = {
        role: 'alumni',
        $or: payload.target_alumni_combinations.map(comb => ({
          department: comb.department,
          graduationYear: comb.graduation_year
        }))
      };
      const alumni = await User.find(alumniFilter).select('_id');
      alumni.forEach(a => targetedUserIds.add(a._id.toString()));
    } else if (payload.target_roles.includes('alumni')) {
      // All alumni
      const allAlumni = await User.find({ role: 'alumni' }).select('_id');
      allAlumni.forEach(a => targetedUserIds.add(a._id.toString()));
    }

    const targetedUsers = Array.from(targetedUserIds).map(id => ({ _id: id }));

    // Create notifications for targeted users
    const notifications = targetedUsers.map(u => ({
      recipient: u._id,
      sender: req.user._id,
      type: 'event',
      content: `New event: ${event.title}`,
      relatedId: event._id,
      onModel: 'Event'
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // 🔥 Emit real-time events via Socket.io to audience rooms
    if (req.io && payload.audience && payload.audience.length > 0) {
      payload.audience.forEach(role => {
        req.io.to(role).emit("newEvent", {
          eventId: event._id,
          title: event.title,
          message: `New event: ${event.title}`,
          relatedId: event._id,
          audience: payload.audience
        });
        req.io.to(role).emit("newNotification", {
          type: 'event',
          content: `Prof. ${req.user.name} created a new event: ${event.title}`,
          relatedId: event._id,
          onModel: 'Event',
          sender: req.user._id,
          eventId: event._id
        });
      });
    }

		res.status(201).json(event);
	} catch (err) {
		console.error('Error creating event:', err);
		res.status(err.status || 400).json({ message: err.message || 'Failed to create event' });
	}
};

// Get events for current user based on targeting criteria
const getEventsForUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('role department year graduationYear name');
    if (!user) return res.status(401).json({ message: 'User not found' });

    const role = (user.role || '').toLowerCase();
    const upcomingOnly = req.query.upcoming === 'true';
    let filter = { status: 'active' };

    if (role === 'admin') {
      // Admin sees everything
      filter = { status: { $in: ['active', 'pending'] } };
    }

    // Filter for upcoming events if requested
    if (upcomingOnly) {
      filter.startAt = { $gt: new Date() };
    }

    const events = await Event.find(filter)
      .populate('organizer', 'name email role department year graduationYear')
      .sort({ startAt: upcomingOnly ? 1 : -1 });

    res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching events for user:', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

// Strict audience filtering for "All Events" using new targeting fields
const listEvents = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select('role department year graduationYear name');
		if (!user) return res.status(401).json({ message: 'User not found' });

		const role = (user.role || '').toLowerCase();
		const upcomingOnly = req.query.upcoming === 'true';
		let filter = { status: 'active' };

		if (role === 'admin') {
			// Admin sees everything
			filter = { status: { $in: ['active', 'pending'] } };
		} else {
			// Build targeting filter for non-admin users
			const targetingFilters = [];

			// Check if user matches student targeting
			if (role === 'student') {
				// Events targeted at all students
				targetingFilters.push({ target_roles: 'student' });
				// Events with specific student combinations matching user
				if (user.department && user.year) {
					targetingFilters.push({
						target_roles: 'student',
						target_student_combinations: {
							$elemMatch: {
								department: user.department,
								year: user.year
							}
						}
					});
				}
			}

			// Check if user matches teacher targeting
			if (role === 'teacher') {
				// Events targeted at all teachers
				targetingFilters.push({ target_roles: 'teacher' });
				// Events with specific teacher departments matching user
				if (user.department) {
					targetingFilters.push({
						target_roles: 'teacher',
						target_teacher_departments: user.department
					});
				}
			}

			// Check if user matches alumni targeting
			if (role === 'alumni') {
				// Events targeted at all alumni
				targetingFilters.push({ target_roles: 'alumni' });
				// Events with specific alumni combinations matching user
				if (user.department && user.graduationYear) {
					targetingFilters.push({
						target_roles: 'alumni',
						target_alumni_combinations: {
							$elemMatch: {
								department: user.department,
								graduation_year: user.graduationYear
							}
						}
					});
				}
			}

			if (targetingFilters.length > 0) {
				filter.$or = targetingFilters;
			} else {
				// If no targeting matches, return no events
				filter._id = null;
			}
		}

		// Filter for upcoming events if requested
		if (upcomingOnly) {
			filter.startAt = { $gt: new Date() };
		}

		const events = await Event.find(filter)
			.populate('organizer', 'name email role department year graduationYear')
			.sort({ startAt: upcomingOnly ? 1 : -1 });

		res.status(200).json(events);
	} catch (err) {
		console.error('Error listing events:', err);
		res.status(500).json({ message: 'Failed to fetch events' });
	}
};

// "My Created Events" - creators always see their events
const listMyEvents = async (req, res) => {
	try {
		const userId = req.user._id;
		const events = await Event.find({
			$or: [
				{ 'createdBy.id': userId },
				{ organizer: userId }
			]
		})
			.populate('organizer', 'name email role department year graduationYear')
			.sort({ startAt: -1 });

		res.status(200).json(events);
	} catch (err) {
		console.error('Error listing my events:', err);
		res.status(500).json({ message: 'Failed to fetch my events' });
	}
};

const approveEvent = async (req, res) => {
	try {
		const { eventId } = req.params;
		const updated = await Event.findByIdAndUpdate(
			eventId,
			{ status: 'active', approved: true },
			{ new: true }
		);
		if (!updated) return res.status(404).json({ message: 'Event not found' });
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
			{ status: 'rejected', approved: false },
			{ new: true }
		);
		if (!updated) return res.status(404).json({ message: 'Event not found' });
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

		// Alumni edits reset to pending
		const editorRole = (req.user.role || '').toLowerCase();
		let statusUpdate = {};
		if (editorRole === 'alumni') {
			statusUpdate = { status: 'pending', approved: false };
		}

		const updated = await Event.findByIdAndUpdate(
			id,
			{ ...payload, ...statusUpdate },
			{ new: true }
		);
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
		const events = await Event.find({ status: 'pending', approved: false })
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
	listMyEvents,
	approveEvent,
	rejectEvent,
	getEventById,
	rsvpEvent,
	updateEvent,
	deleteEvent,
	listPending,
	getEventsForUser
};
