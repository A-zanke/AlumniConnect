const fs = require("fs");
const path = require("path");
const Post = require("../models/Post");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const { validationResult } = require('express-validator');

// Helper to detect media type
const detectMediaType = (file) => {
  const mimetype = file.mimetype || "";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "file";
};

// --- GET ALL POSTS (main feed) ---
// Fetches approved posts visible to the current user (respect visibility)
exports.getAllPosts = async (req, res) => {
  try {
    const currentUserId = req.user?._id;
    const visibleQuery = [
      { visibility: "public" },
      { userId: currentUserId }, // author's own posts
    ];

    // If user has connections list on the User doc, include connections-only
    const me = await User.findById(currentUserId).select("connections").lean();
    const connectionIds = (me?.connections || []).map((id) => id);

    if (connectionIds.length > 0) {
      visibleQuery.push({ visibility: "connections", userId: { $in: connectionIds } });
    }

    const posts = await Post.find({ approved: true, $or: visibleQuery })
    .sort({ createdAt: -1 })
    .populate("userId", "name avatarUrl username role")
    .populate("mentions", "name avatarUrl username")
    .populate("comments.userId", "name avatarUrl username")
    .populate("reactions.userId", "name avatarUrl username")
    .lean(); // Use .lean() for faster queries

    const shapedPosts = posts.map(post => ({
      ...post,
      user: post.userId, // Simplify user object
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      reactionsCount: post.reactions?.length || 0,
      sharesCount: post.shares || 0,
      // Ensure frontend knows if the current user has bookmarked this post
      isBookmarked: req.user ? post.bookmarkedBy?.some(id => id.equals(req.user._id)) : false,
    }));

    res.json(shapedPosts);
  } catch (error) {
    console.error("Error in getAllPosts:", error);
    res.status(500).json({ message: "Server error while fetching posts." });
  }
};

// --- GET FEED (alias) ---
exports.getFeed = async (req, res) => {
  return exports.getAllPosts(req, res);
};

// --- GET POST BY ID ---
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("userId", "name avatarUrl username role")
      .populate("mentions", "name avatarUrl username")
      .populate("comments.userId", "name avatarUrl username")
      .populate("reactions.userId", "name avatarUrl username")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Visibility enforcement: allow if public, author, or connections-only where requester is in author's connections
    const authorId = String(post.userId?._id || post.userId);
    const meId = String(req.user?._id || "");
    if (post.visibility === "private" && meId !== authorId && String(req.user?.role).toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Not authorized to view this post" });
    }
    if (post.visibility === "connections" && meId !== authorId) {
      const author = await User.findById(authorId).select("connections");
      const allowed = author?.connections?.some((c) => String(c) === meId);
      if (!allowed) return res.status(403).json({ message: "Connections only" });
    }

    const shaped = {
      ...post,
      user: post.userId,
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      reactionsCount: post.reactions?.length || 0,
      sharesCount: post.shares || 0,
      isBookmarked: req.user ? (post.bookmarkedBy || []).some((id) => String(id) === meId) : false,
    };
    res.json(shaped);
  } catch (error) {
    console.error("Error in getPostById:", error);
    res.status(500).json({ message: "Server error while fetching post." });
  }
};

// --- CREATE POST ---
// Creates a new post with content, media, mentions, and visibility.
exports.createPost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { content, visibility = "public" } = req.body;
    
    if (!content?.trim() && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: "Post content or media is required." });
    }

    const mediaFiles = req.files ? req.files.map(file => ({
      url: file.path,
      type: detectMediaType(file),
      public_id: file.filename, // from multer-storage-cloudinary
    })) : [];

    // Extract mentions and find user IDs
    const mentionUsernames = (content.match(/@(\w+)/g) || []).map(m => m.substring(1));
    const mentionedUsers = await User.find({ username: { $in: mentionUsernames } }).select('_id');

    const newPost = new Post({
      userId: req.user._id,
      content: content.trim(),
      media: mediaFiles,
      visibility,
      mentions: mentionedUsers.map(u => u._id),
      approved: true, // Auto-approve for now
    });

    await newPost.save();

    // Populate the newly created post to return full data to frontend
    const populatedPost = await Post.findById(newPost._id)
      .populate("userId", "name avatarUrl username role")
      .populate("mentions", "name avatarUrl username")
      .lean();

    const shapedPost = {
      ...populatedPost,
      user: populatedPost.userId,
      likesCount: 0,
      commentsCount: 0,
      reactionsCount: 0,
      sharesCount: 0,
      isBookmarked: false,
    };

    res.status(201).json(shapedPost);
  } catch (error) {
    console.error("Error in createPost:", error);
    res.status(500).json({ message: "Server error while creating post." });
  }
};

// --- REACT TO POST (LinkedIn Style) ---
exports.reactToPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user._id;

    const validReactions = ["like", "love", "celebrate", "support", "insightful", "curious"];
    if (!validReactions.includes(type)) {
      return res.status(400).json({ message: "Invalid reaction type." });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const existingReactionIndex = post.reactions.findIndex(r => r.userId.equals(userId));

    if (existingReactionIndex > -1) {
      // User has reacted before
      if (post.reactions[existingReactionIndex].type === type) {
        // Same reaction, so remove it (toggle off)
        post.reactions.splice(existingReactionIndex, 1);
      } else {
        // Different reaction, so update it
        post.reactions[existingReactionIndex].type = type;
      }
    } else {
      // New reaction
      post.reactions.push({ userId, type });
    }

    await post.save();
    
    // Populate reactions to return user info
    await post.populate('reactions.userId', 'name username avatarUrl');

    res.json({
      reactions: post.reactions,
      reactionsCount: post.reactions.length,
      userReaction: post.reactions.find(r => r.userId.equals(userId)) || null
    });

  } catch (error) {
    console.error("Error in reactToPost:", error);
    res.status(500).json({ message: "Server error while reacting to post." });
  }
};

// --- COMMENT ON POST ---
exports.commentOnPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ message: "Comment content cannot be empty." });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const newComment = {
      userId: req.user._id,
      content: content.trim(),
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    // Populate the newly added comment to return full user data
    await post.populate("comments.userId", "name avatarUrl username");
    const addedComment = post.comments[post.comments.length - 1];
    res.status(201).json(addedComment);
  } catch (error) {
    console.error("Error in commentOnPost:", error);
    res.status(500).json({ message: "Server error while adding comment." });
  }
};

// --- LIKE (backward-compat simple like) ---
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const uid = String(req.user._id);
    const already = post.likes.some((u) => String(u) === uid);
    if (already) {
      post.likes = post.likes.filter((u) => String(u) !== uid);
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();
    return res.json({ likes: post.likes.length, liked: !already });
  } catch (e) {
    console.error("Error in likePost:", e);
    return res.status(500).json({ message: "Failed to like post" });
  }
};

// --- SHARE ---
exports.sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { message = "", connectionIds = [] } = req.body || {};
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.shares = (post.shares || 0) + 1;
    await post.save();
    // Optionally notify the author
    try {
      const NotificationService = require('../services/notificationService');
      await NotificationService.createNotification({
        recipientId: post.userId,
        senderId: req.user._id,
        type: 'post_share',
        content: `${req.user.name} shared your post`,
        relatedId: post._id,
        onModel: 'Post'
      });
    } catch (_) {}
    return res.json({ sharesCount: post.shares });
  } catch (e) {
    console.error('Error in sharePost:', e);
    return res.status(500).json({ message: 'Failed to share post' });
  }
};

// --- DELETE POST ---
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Check if user is the owner or an admin
    if (!post.userId.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not authorized to delete this post." });
    }

    // Delete media from Cloudinary
    if (post.media && post.media.length > 0) {
      const deletePromises = post.media.map(m => {
        if (m.public_id) {
          return cloudinary.uploader.destroy(m.public_id);
        }
        return Promise.resolve();
      });
      await Promise.all(deletePromises);
    }

    await post.deleteOne();

    res.json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Error in deletePost:", error);
    res.status(500).json({ message: "Server error while deleting post." });
  }
};

// --- GET USER'S POSTS ---
exports.getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await Post.find({ userId })
            .sort({ createdAt: -1 })
            .populate("userId", "name avatarUrl username role")
            .lean();
        
        const shapedPosts = posts.map(post => ({
            ...post,
            user: post.userId,
            likesCount: post.likes?.length || 0,
            commentsCount: post.comments?.length || 0,
            reactionsCount: post.reactions?.length || 0,
            isBookmarked: req.user ? post.bookmarkedBy?.some(id => id.equals(req.user._id)) : false,
        }));
        
        res.json(shapedPosts);
    } catch (error) {
        console.error("Error in getUserPosts:", error);
        res.status(500).json({ message: "Server error while fetching user posts." });
    }
};

// --- TOGGLE BOOKMARK ---
exports.toggleBookmark = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }
        
        const userId = req.user._id;
        const isBookmarked = post.bookmarkedBy.some(id => id.equals(userId));

        if (isBookmarked) {
            post.bookmarkedBy = post.bookmarkedBy.filter(id => !id.equals(userId));
        } else {
            post.bookmarkedBy.push(userId);
        }

        await post.save();
        res.json({ bookmarked: !isBookmarked, message: isBookmarked ? "Post removed from saved" : "Post saved successfully" });

    } catch (error) {
        console.error("Error in toggleBookmark:", error);
        res.status(500).json({ message: "Server error while saving post." });
    }
};

// --- GET SAVED POSTS ---
exports.getSavedPosts = async (req, res) => {
    try {
        const posts = await Post.find({ bookmarkedBy: req.user._id })
            .sort({ createdAt: -1 })
            .populate("userId", "name avatarUrl username role")
            .lean();

        const shapedPosts = posts.map(post => ({
            ...post,
            user: post.userId,
            likesCount: post.likes?.length || 0,
            commentsCount: post.comments?.length || 0,
            reactionsCount: post.reactions?.length || 0,
            isBookmarked: true, // All posts here are bookmarked
        }));

        res.json(shapedPosts);
    } catch (error) {
        console.error("Error in getSavedPosts:", error);
        res.status(500).json({ message: "Server error while fetching saved posts." });
    }
};

// --- UPDATE POST ---
exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        if (!post.userId.equals(req.user._id)) {
            return res.status(403).json({ message: "You are not authorized to edit this post." });
        }

        post.content = content.trim();
        post.isEdited = true;
        post.editedAt = Date.now();

        await post.save();

        const populatedPost = await Post.findById(id).populate("userId", "name avatarUrl username role").lean();
        
        res.json({ ...populatedPost, user: populatedPost.userId });

    } catch (error) {
        console.error("Error in updatePost:", error);
        res.status(500).json({ message: "Server error while updating post." });
    }
};
