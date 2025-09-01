const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'file'], default: 'image' },
  name: { type: String, default: '' }
}, { _id: false });

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  media: { type: [MediaSchema], default: [] },
  postType: { type: String, enum: ['text'], default: 'text' },
  visibility: { type: String, enum: ['public', 'connections', 'private'], default: 'public' },
  // Targeting
  departmentScope: [{ type: String }],
  yearScope: [{ type: Number }],
  roleScope: [{ type: String }], // e.g., ['student','teacher']
  // Interactions
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Moderation
  approved: { type: Boolean, default: true }
}, { timestamps: true });

PostSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);
backend/controllers/postsController.js
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');

const publicBase = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';

const detectMedia = (file) => {
  const type = (file.mimetype || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  return 'file';
};

const parseArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const shape = (p) => ({
  _id: p._id,
  user: {
    name: p.userId?.name,
    avatarUrl: p.userId?.avatarUrl ? `${publicBase}${p.userId.avatarUrl}` : null
  },
  content: p.content,
  media: (p.media || []).map(m => ({ ...m, url: `${publicBase}${m.url}` })),
  createdAt: p.createdAt
});

// Match a post targeting against a user
const matchesTarget = (post, user) => {
  // role
  if (post.roleScope?.length) {
    if (!user?.role) return false;
    if (!post.roleScope.map(r => (r || '').toLowerCase()).includes((user.role || '').toLowerCase())) return false;
  }
  // department
  if (post.departmentScope?.length) {
    const dep = user?.department;
    if (!dep || !post.departmentScope.includes(dep)) return false;
  }
  // year
  if (post.yearScope?.length) {
    const y = user?.year;
    if (!y || !post.yearScope.includes(Number(y))) return false;
  }
  return true;
};

exports.createPost = async (req, res) => {
  try {
    const { content = '', visibility = 'public' } = req.body;

    const departmentScope = parseArray(req.body.departmentScope);
    const yearScope = parseArray(req.body.yearScope).map(n => Number(n)).filter(n => !Number.isNaN(n));
    const roleScope = parseArray(req.body.roleScope).map(r => String(r).toLowerCase());

    if (!content.trim() && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Content or media required' });
    }

    const media = (req.files || []).map(f => ({
      url: `/uploads/${path.basename(f.path)}`,
      type: detectMedia(f),
      name: f.originalname
    }));

    // Alumni require admin approval; teacher/admin auto-approved
    const role = (req.user.role || '').toLowerCase();
    const approved = role === 'alumni' ? false : true;

    const post = new Post({
      userId: req.user._id,
      content,
      media,
      postType: 'text',
      visibility: ['public','connections','private'].includes(visibility) ? visibility : 'public',
      departmentScope,
      yearScope,
      roleScope,
      mentions: []
      , approved
    });

    await post.save();

    const populated = await Post.findById(post._id).populate('userId', 'name avatarUrl');
    return res.status(201).json(shape(populated));
  } catch (e) {
    console.error('createPost error:', e);
    res.status(500).json({ message: 'Error creating post' });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const forUserId = req.params.userId;
    const isOwner = req.user && req.user._id && req.user._id.toString() === forUserId;

    const filter = { userId: forUserId };
    if (!isOwner) filter.approved = true;

    const posts = await Post.find(filter).sort({ createdAt: -1 }).populate('userId', 'name avatarUrl');
    res.json({ data: posts.map(shape) });
  } catch (e) {
    res.status(500).json({ message: 'Error fetching user posts' });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const all = await Post.find({ approved: true }).sort({ createdAt: -1 }).populate('userId', 'name avatarUrl');
    const user = req.user;

    // visibility + targeting
    const visible = all.filter(p => {
      // Private: only author
      if (p.visibility === 'private' && p.userId?._id?.toString() !== user._id.toString()) return false;
      // Connections: you + your connections -> left as accepted (implement if connections available); default pass-through
      // Targeting: if any scope is set, must match
      if (!matchesTarget(p, user)) return false;
      return true;
    });

    res.json(visible.map(shape));
  } catch (e) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const idx = post.likes.findIndex(id => id.toString() === req.user._id.toString());
    if (idx === -1) post.likes.push(req.user._id);
    else post.likes.splice(idx, 1);
    await post.save();
    res.json({ likes: post.likes.length });
  } catch {
    res.status(500).json({ message: 'Error liking post' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Comment required' });
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ userId: req.user._id, content });
    await post.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Error adding comment' });
  }
};
