const Post = require("../models/Post");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "posts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "mp4", "webm", "pdf", "doc", "docx"],
    transformation: [{ width: 1200, height: 1200, crop: "limit" }],
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Multiple file upload for posts
const uploadMultiple = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB per file, max 5 files
});

// @desc    Get all posts (from teachers and alumni)
// @route   GET /api/posts
// @access  Private
exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ approved: true })
      .populate("userId", "name email role avatarUrl department graduationYear")
      .populate("likes", "name")
      .populate("reactions.userId", "name avatarUrl")
      .populate("comments.userId", "name avatarUrl role")
      .populate("comments.replies.userId", "name avatarUrl role")
      .populate("bookmarks", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({ approved: true });
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user's own posts
// @route   GET /api/posts/my-posts
// @access  Private (Teacher/Alumni only)
exports.getMyPosts = async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "alumni") {
      return res.status(403).json({ message: "Access denied" });
    }

    const posts = await Post.find({ author: req.user._id })
      .populate("author", "name email role avatarUrl department graduationYear")
      .populate("likes", "name")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private (Teacher/Alumni only)
exports.createPost = async (req, res) => {
  try {
    // Check if user is teacher or alumni
    if (req.user.role !== "teacher" && req.user.role !== "alumni") {
      return res
        .status(403)
        .json({ message: "Only teachers and alumni can create posts" });
    }

    const { 
      content, 
      richContent, 
      visibility = "public", 
      tags = [], 
      hashtags = [],
      mentions = []
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Extract hashtags from content if not provided
    const extractedHashtags = content.match(/#[\w]+/g) || [];
    const finalHashtags = [...new Set([...hashtags, ...extractedHashtags.map(tag => tag.substring(1))])];

    // Extract mentions from content
    const extractedMentions = content.match(/@[\w]+/g) || [];
    const mentionUsernames = extractedMentions.map(mention => mention.substring(1));
    
    // Find mentioned users
    const User = require("../models/User");
    const mentionedUsers = await User.find({
      $or: [
        { name: { $in: mentionUsernames } },
        { email: { $in: mentionUsernames } }
      ]
    });

    const postData = {
      userId: req.user._id,
      content: content.trim(),
      richContent: richContent || content.trim(),
      visibility,
      tags: Array.isArray(tags) ? tags : [],
      hashtags: finalHashtags,
      mentions: mentionedUsers.map(user => user._id),
    };

    // Handle media uploads
    if (req.files && req.files.length > 0) {
      postData.media = req.files.map(file => ({
        url: file.path,
        type: file.mimetype.startsWith('image/') ? 'image' : 
              file.mimetype.startsWith('video/') ? 'video' : 'file',
        name: file.originalname
      }));
    } else if (req.file) {
      postData.media = [{
        url: req.file.path,
        type: req.file.mimetype.startsWith('image/') ? 'image' : 
              req.file.mimetype.startsWith('video/') ? 'video' : 'file',
        name: req.file.originalname
      }];
    }

    // Detect post type based on content
    if (postData.media && postData.media.length > 0) {
      postData.postType = postData.media[0].type;
    } else if (content.includes('http')) {
      postData.postType = 'link';
    } else {
      postData.postType = 'text';
    }

    const post = await Post.create(postData);

    // Populate author details
    await post.populate(
      "userId",
      "name email role avatarUrl department graduationYear"
    );

    res.status(201).json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private (Owner only)
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only edit your own posts" });
    }

    const { content } = req.body;

    if (content) {
      post.content = content.trim();
    }

    // Update image if new one is uploaded
    if (req.file) {
      post.image = req.file.path;
    }

    await post.save();
    await post.populate(
      "author",
      "name email role avatarUrl department graduationYear"
    );

    res.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private (Owner only)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own posts" });
    }

    await post.deleteOne();
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Like/Unlike a post
// @route   POST /api/posts/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const likeIndex = post.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push(req.user._id);
    }

    await post.save();
    await post.populate("likes", "name");

    res.json(post);
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add a comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const comment = {
      author: req.user._id,
      content: content.trim(),
    };

    post.comments.push(comment);
    await post.save();

    // Get the newly added comment with populated author
    const updatedPost = await Post.findById(post._id).populate(
      "comments.author",
      "name avatarUrl role"
    );

    const newComment = updatedPost.comments[updatedPost.comments.length - 1];

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Private
exports.getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "comments.author",
      "name avatarUrl role"
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post.comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/posts/:id/comments/:commentId
// @access  Private (Comment author or post author)
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is comment author or post author
    if (
      comment.author.toString() !== req.user._id.toString() &&
      post.author.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    comment.deleteOne();
    await post.save();

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add reaction to a post
// @route   POST /api/posts/:id/react
// @access  Private
exports.addReaction = async (req, res) => {
  try {
    const { reactionType } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Remove existing reaction from this user
    post.reactions = post.reactions.filter(
      (reaction) => reaction.userId.toString() !== req.user._id.toString()
    );

    // Add new reaction
    post.reactions.push({
      userId: req.user._id,
      type: reactionType,
    });

    await post.save();
    await post.populate("reactions.userId", "name avatarUrl");

    res.json({
      reactions: post.reactions,
      userReaction: reactionType,
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Bookmark/Unbookmark a post
// @route   POST /api/posts/:id/bookmark
// @access  Private
exports.toggleBookmark = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const bookmarkIndex = post.bookmarks.indexOf(req.user._id);

    if (bookmarkIndex > -1) {
      // Remove bookmark
      post.bookmarks.splice(bookmarkIndex, 1);
    } else {
      // Add bookmark
      post.bookmarks.push(req.user._id);
    }

    await post.save();
    await post.populate("bookmarks", "name");

    res.json({
      bookmarks: post.bookmarks,
      isBookmarked: bookmarkIndex === -1,
    });
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user's bookmarked posts
// @route   GET /api/posts/bookmarked
// @access  Private
exports.getBookmarkedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ bookmarks: req.user._id })
      .populate("userId", "name email role avatarUrl department graduationYear")
      .populate("likes", "name")
      .populate("reactions.userId", "name avatarUrl")
      .populate("comments.userId", "name avatarUrl role")
      .populate("comments.replies.userId", "name avatarUrl role")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error("Error fetching bookmarked posts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Share a post
// @route   POST /api/posts/:id/share
// @access  Private
exports.sharePost = async (req, res) => {
  try {
    const { sharedWith } = req.body; // Array of user IDs to share with
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Increment share count
    post.shares += 1;

    // Add to share history
    post.shareHistory.push({
      userId: req.user._id,
      sharedWith: sharedWith || [],
    });

    await post.save();

    res.json({
      shares: post.shares,
      message: "Post shared successfully",
    });
  } catch (error) {
    console.error("Error sharing post:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get post by ID with full details
// @route   GET /api/posts/:id
// @access  Private
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("userId", "name email role avatarUrl department graduationYear")
      .populate("likes", "name")
      .populate("reactions.userId", "name avatarUrl")
      .populate("comments.userId", "name avatarUrl role")
      .populate("comments.replies.userId", "name avatarUrl role")
      .populate("bookmarks", "name");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user connections for sharing
// @route   GET /api/posts/share/connections
// @access  Private
exports.getUserConnections = async (req, res) => {
  try {
    const Connection = require("../models/Connection");
    
    const connections = await Connection.find({
      $or: [
        { requester: req.user._id, status: "accepted" },
        { recipient: req.user._id, status: "accepted" },
      ],
    })
      .populate("requester", "name avatarUrl role")
      .populate("recipient", "name avatarUrl role");

    const userConnections = connections.map((conn) => {
      const isRequester = conn.requester._id.toString() === req.user._id.toString();
      return isRequester ? conn.recipient : conn.requester;
    });

    res.json(userConnections);
  } catch (error) {
    console.error("Error fetching connections:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Search posts
// @route   GET /api/posts/search
// @access  Private
exports.searchPosts = async (req, res) => {
  try {
    const { q, hashtag, mention } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let query = { approved: true };

    if (q) {
      query.$or = [
        { content: { $regex: q, $options: "i" } },
        { richContent: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    if (hashtag) {
      query.hashtags = { $in: [hashtag] };
    }

    if (mention) {
      const User = require("../models/User");
      const mentionedUser = await User.findOne({
        $or: [
          { name: { $regex: mention, $options: "i" } },
          { email: { $regex: mention, $options: "i" } },
        ],
      });

      if (mentionedUser) {
        query.mentions = mentionedUser._id;
      }
    }

    const posts = await Post.find(query)
      .populate("userId", "name email role avatarUrl department graduationYear")
      .populate("likes", "name")
      .populate("reactions.userId", "name avatarUrl")
      .populate("comments.userId", "name avatarUrl role")
      .populate("comments.replies.userId", "name avatarUrl role")
      .populate("bookmarks", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error searching posts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get trending hashtags
// @route   GET /api/posts/trending/hashtags
// @access  Private
exports.getTrendingHashtags = async (req, res) => {
  try {
    const hashtags = await Post.aggregate([
      { $match: { approved: true, hashtags: { $exists: true, $ne: [] } } },
      { $unwind: "$hashtags" },
      { $group: { _id: "$hashtags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json(hashtags);
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Export multer upload middleware
exports.uploadPostImage = upload.single("image");
exports.uploadPostMedia = uploadMultiple.array("media", 5);
