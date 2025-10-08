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
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 1200, height: 1200, crop: "limit" }],
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// @desc    Get all posts (from teachers and alumni)
// @route   GET /api/posts
// @access  Private
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "name email role avatarUrl department graduationYear")
      .populate("likes", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(posts);
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

    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    const postData = {
      author: req.user._id,
      content: content.trim(),
    };

    // Add image if uploaded
    if (req.file) {
      postData.image = req.file.path;
    }

    const post = await Post.create(postData);

    // Populate author details
    await post.populate(
      "author",
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

// Export multer upload middleware
exports.uploadPostImage = upload.single("image");
