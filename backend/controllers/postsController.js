const Post = require('../models/Post');
const User = require('../models/User');

const getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name avatarUrl')
      .populate('mentions', 'name avatarUrl')
      .populate('comments.userId', 'name avatarUrl');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user posts' });
  }
};

const createPost = async (req, res) => {
  try {
    const { content, postType, visibility, location, tags, mentions } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // Process mentions if any
    let mentionUsers = [];
    if (mentions && mentions.length > 0) {
      mentionUsers = await User.find({ username: { $in: mentions } });
    }

    // Process tags if any
    const processedTags = tags ? tags.map(tag => tag.trim()) : [];

    const post = new Post({
      userId: req.user._id,
      content,
      images: req.body.images || [],
      postType: postType || 'text',
      visibility: visibility || 'public',
      location: location || null,
      tags: processedTags,
      mentions: mentionUsers.map(user => user._id)
    });

    await post.save();

    // Populate user and mention details before sending response
    const populatedPost = await Post.findById(post._id)
      .populate('userId', 'name avatarUrl')
      .populate('mentions', 'name avatarUrl');

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
};

const getPosts = async (req, res) => {
  try {
    const { visibility = 'public' } = req.query;
    
    let query = {};
    if (visibility === 'connections') {
      // Get user's connections
      const user = await User.findById(req.user._id).populate('connections');
      const connectionIds = user.connections.map(conn => conn._id);
      query = {
        $or: [
          { userId: { $in: connectionIds } },
          { userId: req.user._id }
        ],
        visibility: { $in: ['public', 'connections'] }
      };
    } else if (visibility === 'private') {
      query = { userId: req.user._id };
    } else {
      query = { visibility: 'public' };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'name avatarUrl')
      .populate('mentions', 'name avatarUrl')
      .populate('comments.userId', 'name avatarUrl');
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likeIndex = post.likes.indexOf(req.user._id);
    if (likeIndex === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error updating post like' });
  }
};

const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      userId: req.user._id,
      content
    });

    await post.save();
    
    const populatedPost = await Post.findById(post._id)
      .populate('comments.userId', 'name avatarUrl');
    
    res.json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment' });
  }
};

module.exports = { 
  getUserPosts, 
  createPost, 
  getPosts, 
  likePost, 
  addComment 
}; 