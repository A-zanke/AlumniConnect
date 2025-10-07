const User = require('../models/User');
const Event = require('../models/Event');
const ForumPost = require('../models/ForumPost');
const { Parser } = require('json2csv');

// Helper for counting by key
const countBy = (arr, key) => {
  const map = {};
  arr.forEach(i => {
    const k = (i?.[key] ?? 'Unknown') + '';
    map[k] = (map[k] || 0) + 1;
  });
  return map;
};

// ===================== Analytics =====================
const getAnalytics = async (req, res) => {
  try {
    const [students, teachers, alumni, events] = await Promise.all([
      User.find({ role: 'student' }).select('department year'),
      User.find({ role: 'teacher' }).select('department'),
      User.find({ role: 'alumni' }).select('graduationYear company industry'),
      Event.find({}).select('createdBy status')
    ]);

    const stats = {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalAlumni: alumni.length,
      studentByDepartment: countBy(students, 'department'),
      studentByYear: countBy(students, 'year'),
      alumniByGraduationYear: countBy(alumni, 'graduationYear'),
      alumniByCompany: countBy(alumni, 'company'),
      eventsByCreatorRole: events.reduce((acc, e) => {
        const r = (e?.createdBy?.role ?? 'unknown').toLowerCase();
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {}),
      eventsPending: events.filter(e => e.status === 'pending').length,
      eventsActive: events.filter(e => e.status === 'active').length,
      eventsRejected: events.filter(e => e.status === 'rejected').length
    };

    res.json(stats);
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

// ===================== Users =====================
const listUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('avatarUrl name email username role department year graduationYear company');
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Failed to list users' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

const exportUsers = async (req, res) => {
  try {
    const q = {};
    const { role, department, year, graduationYear } = req.query;
    if (role) q.role = role;
    if (department) q.department = department;
    if (year) q.year = Number(year);
    if (graduationYear) q.graduationYear = Number(graduationYear);

    const users = await User.find(q).select('name email username role department year graduationYear company avatarUrl');
    const parser = new Parser();
    const csv = parser.parse(users.map(u => u.toObject()));
    res.header('Content-Type', 'text/csv');
    res.attachment('users_export.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Export users error:', err);
    res.status(500).json({ message: 'Failed to export users' });
  }
};

// ===================== Events =====================
const listAllEvents = async (req, res) => {
  try {
    const events = await Event.find({})
      .populate('organizer', 'name role department year graduationYear email')
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ message: 'Failed to list events' });
  }
};

const approveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Event.findByIdAndUpdate(id, { status: 'active', approved: true }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Approved', event: updated });
  } catch (err) {
    console.error('Approve event error:', err);
    res.status(500).json({ message: 'Failed to approve' });
  }
};

const rejectEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Event.findByIdAndUpdate(id, { status: 'rejected', approved: false }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Rejected', event: updated });
  } catch (err) {
    console.error('Reject event error:', err);
    res.status(500).json({ message: 'Failed to reject' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await Event.findByIdAndDelete(id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
};

const exportEvents = async (req, res) => {
  try {
    const q = {};
    const { status, creatorRole, department, year, graduationYear } = req.query;
    if (status) q.status = status;
    if (creatorRole) q['createdBy.role'] = creatorRole;
    if (department) {
      q.$or = [
        { 'target_teacher_departments': department },
        { 'target_student_combinations': { $elemMatch: { department } } },
        { 'target_alumni_combinations': { $elemMatch: { department } } }
      ];
    }
    if (year) {
      q['target_student_combinations'] = { $elemMatch: { year: Number(year) } };
    }
    if (graduationYear) {
      q['target_alumni_combinations'] = { $elemMatch: { graduation_year: Number(graduationYear) } };
    }

    const events = await Event.find(q)
      .select('title description status createdBy target_roles target_teacher_departments target_student_combinations target_alumni_combinations startAt endAt');

    const parser = new Parser();
    const csv = parser.parse(events.map(e => e.toObject()));
    res.header('Content-Type', 'text/csv');
    res.attachment('events_export.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Export events error:', err);
    res.status(500).json({ message: 'Failed to export events' });
  }
};

// ===================== Posts moderation =====================
const listPendingPosts = async (req, res) => {
  try {
    // Placeholder: implement your actual logic here
    res.json({ message: 'List pending posts' });
  } catch (err) {
    console.error('List pending posts error:', err);
    res.status(500).json({ message: 'Failed to list pending posts' });
  }
};

const approvePost = async (req, res) => {
  try {
    // Placeholder: implement your actual logic here
    res.json({ message: 'Post approved' });
  } catch (err) {
    console.error('Approve post error:', err);
    res.status(500).json({ message: 'Failed to approve post' });
  }
};

// ===================== Forum (Admin moderation) =====================
const listForumPosts = async (req, res) => {
  try {
    const { q, category } = req.query || {};
    const query = { isDeleted: { $ne: true } };
    if (q) query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } }
    ];
    if (category) query.category = category;
    const posts = await ForumPost.find(query)
      .populate('author', 'name username role')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error('List forum posts error:', err);
    res.status(500).json({ message: 'Failed to list forum posts' });
  }
};

const deleteForumPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await ForumPost.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    await ForumPost.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete forum post error:', err);
    res.status(500).json({ message: 'Failed to delete forum post' });
  }
};

const exportForum = async (req, res) => {
  try {
    const { category } = req.query || {};
    const query = { isDeleted: { $ne: true } };
    if (category) query.category = category;
    const posts = await ForumPost.find(query)
      .select('title content category createdAt')
      .lean();
    const parser = new Parser();
    const csv = parser.parse(posts);
    res.header('Content-Type', 'text/csv');
    res.attachment('forum_posts_export.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Export forum error:', err);
    res.status(500).json({ message: 'Failed to export forum posts' });
  }
};

// ===================== Event detail =====================
const getEventByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate('organizer', 'name email role department year graduationYear');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    console.error('Get event by id (admin) error:', err);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
};

// ===================== Export all functions =====================
module.exports = {
  getAnalytics,
  listUsers,
  deleteUser,
  exportUsers,
  listAllEvents,
  approveEvent,
  rejectEvent,
  deleteEvent,
  exportEvents,
  listPendingPosts,
  approvePost,
  listForumPosts,
  deleteForumPost,
  exportForum,
  getEventByIdAdmin
};
