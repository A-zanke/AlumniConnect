const Event = require('../models/Event');
const User = require('../models/User');
const EventRegistration = require('../models/EventRegistration');

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

  if (req.file) {
    // When using Cloudinary storage, req.file.path is the secure URL
    payload.imageUrl = req.file.path || req.file.secure_url || payload.imageUrl;
  }

	return payload;
};

const Notification = require('../models/Notification');

const buildTargetedUsers = async ({
  target_roles = [],
  target_student_combinations = [],
  target_teacher_departments = [],
  target_alumni_combinations = []
}) => {
  let targetedUserIds = new Set();

  if (target_roles.includes('student')) {
    if (target_student_combinations.length > 0) {
      const studentFilter = {
        role: 'student',
        $or: target_student_combinations.map(comb => ({
          department: comb.department,
          year: comb.year
        }))
      };
      const students = await User.find(studentFilter).select('_id');
      students.forEach(s => targetedUserIds.add(s._id.toString()));
    } else {
      const allStudents = await User.find({ role: 'student' }).select('_id');
      allStudents.forEach(s => targetedUserIds.add(s._id.toString()));
    }
  }

  if (target_roles.includes('teacher')) {
    if (target_teacher_departments.length > 0) {
      const teacherFilter = {
        role: 'teacher',
        department: { $in: target_teacher_departments }
      };
      const teachers = await User.find(teacherFilter).select('_id');
      teachers.forEach(t => targetedUserIds.add(t._id.toString()));
    } else {
      const allTeachers = await User.find({ role: 'teacher' }).select('_id');
      allTeachers.forEach(t => targetedUserIds.add(t._id.toString()));
    }
  }

  if (target_roles.includes('alumni')) {
    if (target_alumni_combinations.length > 0) {
      const alumniFilter = {
        role: 'alumni',
        $or: target_alumni_combinations.map(comb => ({
          department: comb.department,
          graduationYear: comb.graduation_year
        }))
      };
      const alumni = await User.find(alumniFilter).select('_id');
      alumni.forEach(a => targetedUserIds.add(a._id.toString()));
    } else {
      const allAlumni = await User.find({ role: 'alumni' }).select('_id');
      allAlumni.forEach(a => targetedUserIds.add(a._id.toString()));
    }
  }

  return Array.from(targetedUserIds).map(id => ({ _id: id }));
};

const notifyTargetAudiences = async ({
  event,
  organizer,
  io,
  targetedUsers
}) => {
  if (!event || !targetedUsers || targetedUsers.length === 0) return;

  const creatorName = organizer?.name || organizer?.username || 'Someone';

  const notifications = targetedUsers.map(u => ({
    recipient: u._id,
    sender: organizer?._id,
    type: 'event',
    content: `${creatorName} created an event for you: ${event.title}`,
    relatedId: event._id,
    onModel: 'Event',
    link: `/events/${event._id}`
  }));

  await Notification.insertMany(notifications);

  if (io) {
    targetedUsers.forEach(u => {
      io.to(u._id.toString()).emit('notification:new', {
        type: 'event',
        content: `${creatorName} created an event for you: ${event.title}`,
        relatedId: event._id,
        link: `/events/${event._id}`,
        sender: { _id: organizer?._id, name: creatorName }
      });
    });
  }
};

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
    // If created by alumni, do NOT notify now. Notifications will be sent upon approval.
    const creatorRoleLower = (req.user.role || '').toLowerCase();
    if (creatorRoleLower !== 'alumni') {
      const targetedUsers = await buildTargetedUsers(payload);
      if (targetedUsers.length > 0) {
        await notifyTargetAudiences({
          event,
          organizer: req.user,
          io: req.io,
          targetedUsers
        });
      }
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

// Strict audience filtering for "All Events"
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
		} else if (role === 'student') {
			// Students see events targeting their department + year
			filter = {
				status: 'active',
				target_roles: { $in: ['student'] },
				$or: [
					// Specific department + year combination
					{
						target_student_combinations: {
							$elemMatch: {
								department: user.department,
								year: user.year
							}
						}
					},
					// Or no specific combinations (all students)
					{ target_student_combinations: { $exists: true, $eq: [] } }
				]
			};
		} else if (role === 'teacher') {
			// Teachers see events targeting their department
			filter = {
				status: 'active',
				target_roles: { $in: ['teacher'] },
				$or: [
					{ target_teacher_departments: { $in: [user.department] } },
					{ target_teacher_departments: { $exists: true, $eq: [] } }
				]
			};
		} else if (role === 'alumni') {
			// Alumni see events targeting their department + graduation year
			filter = {
				status: 'active',
				target_roles: { $in: ['alumni'] },
				$or: [
					{
						target_alumni_combinations: {
							$elemMatch: {
								department: user.department,
								graduation_year: user.graduationYear
							}
						}
					},
					{ target_alumni_combinations: { $exists: true, $eq: [] } }
				]
			};
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

    // After approval, send notifications to targeted audience (for alumni-created events in particular)
    try {
      const organizer = await User.findById(updated.organizer).select('name username _id');
      const targetedUsers = await buildTargetedUsers({
        target_roles: ensureArray(updated.target_roles),
        target_student_combinations: ensureArray(updated.target_student_combinations),
        target_teacher_departments: ensureArray(updated.target_teacher_departments),
        target_alumni_combinations: ensureArray(updated.target_alumni_combinations)
      });

      if (targetedUsers.length > 0) {
        await notifyTargetAudiences({
          event: updated,
          organizer: organizer || req.user,
          io: req.io,
          targetedUsers
        });
      }
    } catch (notifyErr) {
      console.error('Error notifying users on event approval:', notifyErr);
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

// Register for an event (students)
const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(eventId).populate('organizer', 'role');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    if (event.maxAttendees && event.registrationCount >= event.maxAttendees) {
      return res.status(400).json({ message: 'Event is full' });
    }

    const existingRegistration = await EventRegistration.findOne({ event: eventId, user: userId });
    if (existingRegistration) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    // Build registration payload
    let registrationPayload = { event: eventId, user: userId };
    const organizerRole = typeof event.organizer === 'object' ? (event.organizer.role || '') : '';

    if ((organizerRole || '').toLowerCase() === 'alumni') {
      // One-click registration. Attempt to hydrate from user profile if possible.
      const registrant = await User.findById(userId).select('name username department year division rollNo');
      registrationPayload = {
        ...registrationPayload,
        name: registrant?.name || registrant?.username || 'Participant',
        rollNo: registrant?.rollNo || 'N/A',
        year: registrant?.year || null,
        department: registrant?.department || 'General',
        division: registrant?.division || 'A'
      };
    } else {
      // Strict fields for teacher/admin-created events
      const { name, rollNo, year, department, division } = req.body || {};
      if (!name || !rollNo || !year || !department || !division) {
        return res.status(400).json({ message: 'All registration fields are required' });
      }
      registrationPayload = {
        ...registrationPayload,
        name,
        rollNo,
        year: parseInt(year, 10),
        department,
        division
      };
    }

    const registration = await EventRegistration.create(registrationPayload);

    await Event.findByIdAndUpdate(eventId, {
      $inc: { registrationCount: 1 },
      $addToSet: { rsvps: userId }
    });

    res.status(201).json({ 
      message: 'Successfully registered for the event',
      registration 
    });
  } catch (err) {
    console.error('Error registering for event:', err);
    res.status(500).json({ message: err.message || 'Failed to register for event' });
  }
};

// Get registrations for an event (Admin/Teacher creators only; alumni creators can only view, not manage attendance)
const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userRole = (req.user.role || '').toLowerCase();

    const event = await Event.findById(eventId).populate('organizer', 'role');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const organizerId = typeof event.organizer === 'object' ? event.organizer._id : event.organizer;
    const organizerRole = typeof event.organizer === 'object' ? (event.organizer.role || '').toLowerCase() : '';

    // Admin always allowed
    if (userRole !== 'admin') {
      // Teacher allowed only if creator of this event
      if (userRole === 'teacher') {
        if (String(organizerId) !== String(req.user._id)) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else {
        // Alumni and others cannot access detailed registration management
        if (String(organizerId) !== String(req.user._id)) {
          return res.status(403).json({ message: 'Access denied' });
        }
        // If alumni creator, they can only view list and counts; still return list here (frontend can limit actions)
      }
    }

    const registrations = await EventRegistration.find({ event: eventId })
      .populate('user', 'name email username avatarUrl role department year graduationYear')
      .sort({ registeredAt: -1 });

    res.status(200).json(registrations);
  } catch (err) {
    console.error('Error fetching event registrations:', err);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
};

// Mark attendance (Admin always; Teacher only if creator). Alumni: never.
const markAttendance = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { attended } = req.body;
    const userRole = (req.user.role || '').toLowerCase();
    
    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const registration = await EventRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const wasAttended = registration.attended;
    registration.attended = attended;
    if (attended && !wasAttended) {
      registration.attendedAt = new Date();
    }
    await registration.save();

    const event = await Event.findById(registration.event).populate('organizer', 'role');
    if (event) {
      // Teacher can only mark attendance for their own events
      if (userRole === 'teacher') {
        const organizerId = typeof event.organizer === 'object' ? event.organizer._id : event.organizer;
        if (String(organizerId) !== String(req.user._id)) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      // Alumni never allowed (caught above), admin allowed for any
      if (attended && !wasAttended) {
        event.attendanceCount = (event.attendanceCount || 0) + 1;
      } else if (!attended && wasAttended) {
        event.attendanceCount = Math.max(0, (event.attendanceCount || 0) - 1);
      }
      await event.save();
    }

    res.status(200).json({ 
      message: 'Attendance updated successfully',
      registration 
    });
  } catch (err) {
    console.error('Error marking attendance:', err);
    res.status(500).json({ message: 'Failed to update attendance' });
  }
};

// Download registrations as CSV (Admin always; Teacher only if creator). Alumni: never.
const downloadRegistrationsCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userRole = (req.user.role || '').toLowerCase();
    
    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (userRole === 'teacher') {
      const organizerId = typeof event.organizer === 'object' ? event.organizer._id : event.organizer;
      if (String(organizerId) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const registrations = await EventRegistration.find({ event: eventId })
      .populate('user', 'name email')
      .sort({ registeredAt: -1 });

    const csvHeader = 'Name,Roll No,Department,Year,Division,Attended,Registered At,Email\n';
    const csvRows = registrations.map(reg => {
      const email = reg.user?.email || '';
      const attendedStatus = reg.attended ? 'Yes' : 'No';
      const registeredAt = reg.registeredAt ? new Date(reg.registeredAt).toLocaleString() : '';
      
      return `"${reg.name}","${reg.rollNo}","${reg.department}","${reg.year}","${reg.division}","${attendedStatus}","${registeredAt}","${email}"`;
    }).join('\n');

		const csv = csvHeader + csvRows;

		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', `attachment; filename="event-registrations-${eventId}.csv"`);
		res.status(200).send(csv);
	} catch (err) {
		console.error('Error downloading CSV:', err);
		res.status(500).json({ message: 'Failed to download CSV' });
	}
};

// Get user's registered events
const getMyRegisteredEvents = async (req, res) => {
	try {
		const userId = req.user._id;
		
		const registrations = await EventRegistration.find({ user: userId })
			.populate({
				path: 'event',
				populate: {
					path: 'organizer',
					select: 'name email role'
				}
			})
			.sort({ registeredAt: -1 });

		const events = registrations
			.filter(reg => reg.event)
			.map(reg => ({
				...reg.event.toObject(),
				registration: {
					_id: reg._id,
					attended: reg.attended,
					registeredAt: reg.registeredAt
				}
			}));

		res.status(200).json(events);
	} catch (err) {
		console.error('Error fetching registered events:', err);
		res.status(500).json({ message: 'Failed to fetch registered events' });
	}
};

// Check if user is registered for an event
const checkRegistration = async (req, res) => {
	try {
		const { eventId } = req.params;
		const userId = req.user._id;

		const registration = await EventRegistration.findOne({ 
			event: eventId, 
			user: userId 
		});

		res.status(200).json({ 
			isRegistered: !!registration,
			registration: registration || null
		});
	} catch (err) {
		console.error('Error checking registration:', err);
		res.status(500).json({ message: 'Failed to check registration' });
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
	getEventsForUser,
	registerForEvent,
	getEventRegistrations,
	markAttendance,
	downloadRegistrationsCSV,
	getMyRegisteredEvents,
	checkRegistration
};
