const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Department = require('../models/Department');

const exportCsv = (rows, headers) => {
  const escape = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = headers.map(h => escape(h.label)).join(',');
  const body = rows.map(r => headers.map(h => escape(r[h.key])).join(',')).join('\n');
  return head + '\n' + body + '\n';
};

const getAnalytics = async (req, res) => {
  const [userCount, postCount, eventCount] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments(),
    Event.countDocuments({ approved: true })
  ]);
  res.json({ userCount, postCount, eventCount });
};

const listUsers = async (req, res) => {
  const users = await User.find().select('name email username role department year graduationYear');
  res.json(users);
};

const setUserRole = async (req, res) => {
  const { role } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

const deleteUser = async (req, res) => {
  const result = await User.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).json({ message: 'User not found' });
  res.json({ success: true });
};

const exportUsersCsv = async (req, res) => {
  const users = await User.find().select('name email username role');
  const csv = exportCsv(users, [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'username', label: 'Username' },
    { key: 'role', label: 'Role' }
  ]);
  res.header('Content-Type', 'text/csv');
  res.attachment('users.csv');
  res.send(csv);
};

const exportPostsCsv = async (req, res) => {
  const posts = await Post.find().select('content userId createdAt');
  const rows = posts.map(p => ({ content: p.content, userId: p.userId, createdAt: p.createdAt }));
  const csv = exportCsv(rows, [
    { key: 'content', label: 'Content' },
    { key: 'userId', label: 'UserId' },
    { key: 'createdAt', label: 'CreatedAt' }
  ]);
  res.header('Content-Type', 'text/csv');
  res.attachment('posts.csv');
  res.send(csv);
};

const exportEventsCsv = async (req, res) => {
  const events = await Event.find().select('title organizer startAt endAt approved');
  const rows = events.map(e => ({ title: e.title, organizer: e.organizer, startAt: e.startAt, endAt: e.endAt, approved: e.approved }));
  const csv = exportCsv(rows, [
    { key: 'title', label: 'Title' },
    { key: 'organizer', label: 'Organizer' },
    { key: 'startAt', label: 'StartAt' },
    { key: 'endAt', label: 'EndAt' },
    { key: 'approved', label: 'Approved' }
  ]);
  res.header('Content-Type', 'text/csv');
  res.attachment('events.csv');
  res.send(csv);
};

// Branch (Department) management
const listDepartments = async (req, res) => {
  const deps = await Department.find().select('name code');
  res.json(deps);
};

const createDepartment = async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ message: 'Name and code required' });
  const dep = await Department.create({ name, code });
  res.status(201).json(dep);
};

const deleteDepartment = async (req, res) => {
  const dep = await Department.findByIdAndDelete(req.params.id);
  if (!dep) return res.status(404).json({ message: 'Department not found' });
  res.json({ success: true });
};

module.exports = {
  getAnalytics,
  listUsers,
  setUserRole,
  deleteUser,
  exportUsersCsv,
  exportPostsCsv,
  exportEventsCsv,
  listDepartments,
  createDepartment,
  deleteDepartment
};

