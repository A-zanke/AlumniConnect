const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');

const detectMedia = (file) => {
  const type = (file.mimetype || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  return 'file';
};

exports.createPost = async (req, res) => {
  try {
    const { content = '', visibility = 'public' } = req.body;

    if (!content.trim() && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Content or media required' });
    }

    const media = (req.files || []).map(f => ({
      url: `/uploads/${path.basename(f.path)}`,
      type: detectMedia(f),
      name: f.originalname
    }));

    // simple mentions from content using @username
    const mentionUsernames = Array.from(new Set((content.match(/@([a-zA-Z0-9_.-]+)/g) || []).map(m => m.slice(1))));
    const mentionUsers = mentionUsernames.length > 0 ? await User.find({ username: { $in: mentionUsernames } }).select('_id') : [];

    const post = new Post({
      userId: req.user._id,
      content,
      media,
      postType: 'text',
      visibility: ['public','connections','private'].includes(visibility) ? visibility : 'public',
      tags: [],
      mentions: mentionUsers.map(u => u._id)
    });

    await post.save();

    const populated = await Post.findById(post._id)
      .populate('userId', 'name avatarUrl')
      .populate('mentions', 'name avatarUrl');

    // shape response like HomePage expects
    res.status(201).json({
      _id: populated._id,
      user: {
        name: populated.userId.name,
        avatarUrl: populated.userId.avatarUrl ? `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}${populated.userId.avatarUrl}` : null
      },
      content: populated.content,
      media: populated.media?.map(m => ({ ...m, url: `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}${m.url}` })) || [],
      createdAt: populated.createdAt
    });
  } catch (e) {
    console.error('createPost error:', e);
    res.status(500).json({ message: 'Error creating post' });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name avatarUrl')
      .populate('mentions', 'name avatarUrl');

    const shaped = posts.map(p => ({
      _id: p._id,
      user: {
        name: p.userId?.name,
        avatarUrl: p.userId?.avatarUrl ? `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}${p.userId.avatarUrl}` : null
      },
      content: p.content,
      media: (p.media || []).map(m => ({ ...m, url: `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}${m.url}` })),
      createdAt: p.createdAt
    }));
    res.json({ data: shaped });
  } catch {
    res.status(500).json({ message: 'Error fetching user posts' });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate('userId', 'name avatarUrl')
      .populate('mentions', 'name avatarUrl');

    const shaped = posts.map(p => ({
      _id: p._id,
      user: {
        name: p.userId?.name,
        avatarUrl: p.userId?.avatarUrl ? `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}${p.userId.avatarUrl}` : null
      },
      content: p.content,
      media: (p.media || []).map(m => ({ ...m, url: `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}${m.url}` })),
      createdAt: p.createdAt
    }));
    res.json(shaped);
  } catch {
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

    // Return the updated post with populated comments
    const updatedPost = await Post.findById(post._id)
      .populate('userId', 'name avatarUrl role')
      .populate('comments.userId', 'name avatarUrl role')
      .populate('mentions', 'name avatarUrl');

    res.json({ 
      success: true, 
      comments: updatedPost.comments,
      commentsCount: updatedPost.comments.length 
    });
  } catch {
    res.status(500).json({ message: 'Error adding comment' });
  }
};

exports.sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.shares += 1;
    await post.save();

    res.json({ shares: post.shares });
  } catch {
    res.status(500).json({ message: 'Error sharing post' });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('connections', '_id');
    const connectionIds = user.connections.map(conn => conn._id);
    
    // Get posts from user's connections and user themselves
    const posts = await Post.find({
      $or: [
        { userId: { $in: connectionIds } },
        { userId: req.user._id }
      ],
      visibility: { $in: ['public', 'connections'] }
    })
    .sort({ createdAt: -1 })
    .populate('userId', 'name avatarUrl role')
    .populate('comments.userId', 'name avatarUrl role')
    .populate('mentions', 'name avatarUrl')
    .limit(50);

    const shaped = posts.map(p => ({
      _id: p._id,
      user: {
        _id: p.userId._id,
        name: p.userId.name,
        avatarUrl: p.userId.avatarUrl ? `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}${p.userId.avatarUrl}` : null,
        role: p.userId.role
      },
      content: p.content,
      media: (p.media || []).map(m => ({ ...m, url: `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}${m.url}` })),
      likes: p.likes,
      likesCount: p.likes.length,
      comments: p.comments,
      commentsCount: p.comments.length,
      shares: p.shares,
      createdAt: p.createdAt,
      isLiked: p.likes.some(likeId => likeId.toString() === req.user._id.toString())
    }));

    res.json(shaped);
  } catch (error) {
    console.error('getFeed error:', error);
    res.status(500).json({ message: 'Error fetching feed' });
  }
};