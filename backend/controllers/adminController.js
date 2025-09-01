const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Department = require('../models/Department');

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

const listPendingPosts = async (req, res) => {
  const posts = await Post.find({ approved: false }).sort({ createdAt: -1 }).populate('userId', 'name');
  res.json(posts.map(p => ({
    _id: p._id,
    author: p.userId?.name,
    content: p.content,
    createdAt: p.createdAt
  })));
};

const approvePost = async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
  if (!post) return res.status(404).json({ message: 'Post not found' });
  res.json({ success: true });
};

module.exports = {
  getAnalytics,
  listUsers,
  setUserRole,
  deleteUser,
  listPendingPosts,
  approvePost
};