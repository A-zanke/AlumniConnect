const fs = require("fs");
const path = require("path");
const Post = require("../models/Post");
const User = require("../models/User");

const detectMedia = (file) => {
  const type = (file.mimetype || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return "file";
};

exports.createPost = async (req, res) => {
  try {
    const { content = "", visibility = "public", tags = "", link = "" } = req.body;

    if (!content.trim() && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: "Content or media required" });
    }

    const media = (req.files || []).map((f) => ({
      url: `/uploads/${path.basename(f.path)}`,
      type: detectMedia(f),
      name: f.originalname,
    }));

    // Extract mentions from content using @username
    const mentionUsernames = Array.from(
      new Set(
        (content.match(/@([a-zA-Z0-9_.-]+)/g) || []).map((m) => m.slice(1))
      )
    );
    const mentionUsers =
      mentionUsernames.length > 0
        ? await User.find({ username: { $in: mentionUsernames } }).select("_id")
        : [];

    // Extract hashtags from content
    const hashtags = Array.from(
      new Set((content.match(/#([a-zA-Z0-9_]+)/g) || []).map((h) => h.slice(1)))
    );

    // Parse tags if provided
    const parsedTags = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    const linkPreview = link && /^https?:\/\//i.test(link)
      ? {
          url: link,
        }
      : undefined;

    const post = new Post({
      userId: req.user._id,
      content,
      media,
      postType: "text",
      visibility: ["public", "connections", "private"].includes(visibility)
        ? visibility
        : "public",
      tags: [...parsedTags, ...hashtags],
      mentions: mentionUsers.map((u) => u._id),
      linkPreview,
      approved: true,
    });

    await post.save();

    const populated = await Post.findById(post._id)
      .populate("userId", "name avatarUrl username role")
      .populate("mentions", "name avatarUrl username");

    // Shape response for frontend
    res.status(201).json({
      _id: populated._id,
      user: {
        _id: populated.userId._id,
        name: populated.userId.name,
        username: populated.userId.username,
        role: populated.userId.role,
        avatarUrl: populated.userId.avatarUrl
          ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
              populated.userId.avatarUrl
            }`
          : null,
      },
      content: populated.content,
      media:
        populated.media?.map((m) => ({
          ...m,
          url: `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
            m.url
          }`,
        })) || [],
      visibility: populated.visibility,
      tags: populated.tags || [],
      mentions: populated.mentions || [],
      likes: populated.likes || [],
      comments: populated.comments || [],
      linkPreview: populated.linkPreview || null,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    });
  } catch (e) {
    console.error("createPost error:", e);
    res.status(500).json({ message: "Error creating post" });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("userId", "name avatarUrl username role")
      .populate("mentions", "name avatarUrl username")
      .populate("comments.userId", "name avatarUrl username")
      .populate("comments.replies.userId", "name avatarUrl username")
      .populate("reactions.userId", "name avatarUrl username");

    const shaped = posts.map((p) => ({
      _id: p._id,
      user: {
        _id: p.userId._id,
        name: p.userId?.name,
        username: p.userId?.username,
        role: p.userId?.role,
        avatarUrl: p.userId?.avatarUrl
          ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
              p.userId.avatarUrl
            }`
          : null,
      },
      content: p.content,
      media:
        p.media?.map((m) => ({
          ...m,
          url: `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
            m.url
          }`,
        })) || [],
      visibility: p.visibility,
      tags: p.tags || [],
      mentions: p.mentions || [],
      likes: p.likes || [],
      reactions:
        p.reactions?.map((r) => ({
          userId: r.userId._id,
          type: r.type,
          user: {
            name: r.userId?.name,
            username: r.userId?.username,
            avatarUrl: r.userId?.avatarUrl
              ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
                  r.userId.avatarUrl
                }`
              : null,
          },
        })) || [],
      comments:
        p.comments?.map((c) => ({
          _id: c._id,
          content: c.content,
          user: {
            _id: c.userId._id,
            name: c.userId?.name,
            username: c.userId?.username,
            avatarUrl: c.userId?.avatarUrl
              ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
                  c.userId.avatarUrl
                }`
              : null,
          },
          replies:
            c.replies?.map((r) => ({
              _id: r._id,
              content: r.content,
              user: {
                _id: r.userId._id,
                name: r.userId?.name,
                username: r.userId?.username,
                avatarUrl: r.userId?.avatarUrl
                  ? `${
                      process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"
                    }${r.userId.avatarUrl}`
                  : null,
              },
              createdAt: r.createdAt,
            })) || [],
          createdAt: c.createdAt,
        })) || [],
      linkPreview: p.linkPreview || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json(shaped);
  } catch (e) {
    console.error("getUserPosts error:", e);
    res.status(500).json({ message: "Error fetching posts" });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      approved: true,
      $or: [
        { visibility: "public" },
        {
          visibility: "connections",
          userId: { $in: req.user.connections || [] },
        },
        { userId: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name avatarUrl username role")
      .populate("mentions", "name avatarUrl username")
      .populate("comments.userId", "name avatarUrl username")
      .populate("comments.replies.userId", "name avatarUrl username")
      .populate("reactions.userId", "name avatarUrl username");

    const shaped = posts.map((p) => ({
      _id: p._id,
      user: {
        _id: p.userId._id,
        name: p.userId?.name,
        username: p.userId?.username,
        role: p.userId?.role,
        avatarUrl: p.userId?.avatarUrl
          ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
              p.userId.avatarUrl
            }`
          : null,
      },
      content: p.content,
      media:
        p.media?.map((m) => ({
          ...m,
          url: `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
            m.url
          }`,
        })) || [],
      visibility: p.visibility,
      tags: p.tags || [],
      mentions: p.mentions || [],
      likes: p.likes || [],
      reactions:
        p.reactions?.map((r) => ({
          userId: r.userId._id,
          type: r.type,
          user: {
            name: r.userId?.name,
            username: r.userId?.username,
            avatarUrl: r.userId?.avatarUrl
              ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
                  r.userId.avatarUrl
                }`
              : null,
          },
        })) || [],
      comments:
        p.comments?.map((c) => ({
          _id: c._id,
          content: c.content,
          user: {
            _id: c.userId._id,
            name: c.userId?.name,
            username: c.userId?.username,
            avatarUrl: c.userId?.avatarUrl
              ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
                  c.userId.avatarUrl
                }`
              : null,
          },
          replies:
            c.replies?.map((r) => ({
              _id: r._id,
              content: r.content,
              user: {
                _id: r.userId._id,
                name: r.userId?.name,
                username: r.userId?.username,
                avatarUrl: r.userId?.avatarUrl
                  ? `${
                      process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"
                    }${r.userId.avatarUrl}`
                  : null,
              },
              createdAt: r.createdAt,
            })) || [],
          createdAt: c.createdAt,
        })) || [],
      linkPreview: p.linkPreview || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json(shaped);
  } catch (e) {
    console.error("getAllPosts error:", e);
    res.status(500).json({ message: "Error fetching posts" });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes = post.likes.filter((id) => !id.equals(userId));
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      liked: !isLiked,
      likesCount: post.likes.length,
      likes: post.likes,
    });
  } catch (e) {
    console.error("likePost error:", e);
    res.status(500).json({ message: "Error liking post" });
  }
};

exports.commentOnPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ message: "Comment content required" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = {
      userId: req.user._id,
      content: content.trim(),
      createdAt: new Date(),
    };

    post.comments.push(comment);
    await post.save();

    // Get the newly added comment with populated user data
    const updatedPost = await Post.findById(req.params.id)
      .populate("comments.userId", "name avatarUrl username")
      .populate("mentions", "username");

    const newComment = updatedPost.comments[updatedPost.comments.length - 1];

    res.status(201).json({
      _id: newComment._id,
      content: newComment.content,
      user: {
        _id: newComment.userId._id,
        name: newComment.userId.name,
        username: newComment.userId.username,
        avatarUrl: newComment.userId.avatarUrl
          ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
              newComment.userId.avatarUrl
            }`
          : null,
      },
      createdAt: newComment.createdAt,
    });
  } catch (e) {
    console.error("commentOnPost error:", e);
    res.status(500).json({ message: "Error adding comment" });
  }
};

exports.sharePost = async (req, res) => {
  try {
    const { connectionIds = [], message = "" } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found" });

    // Increment share counter
    post.shares = (post.shares || 0) + 1;
    await post.save();

    // Optionally create message entries to each connection
    // and emit socket notifications if available
    try {
      const Message = require("../models/Message");
      const shareLink = `${process.env.FRONTEND_PUBLIC_URL || "http://localhost:3000"}/posts/${post._id}`;
      const content = message && message.trim().length > 0 ? `${message}\n${shareLink}` : shareLink;
      await Promise.all(
        (connectionIds || []).map((to) =>
          Message.create({ from: req.user._id, to, content })
        )
      );
      // Emit socket event to receivers
      if (req.io) {
        (connectionIds || []).forEach((to) => {
          req.io.to(String(to)).emit("share:receive", {
            from: String(req.user._id),
            to: String(to),
            postId: String(post._id),
            content,
          });
        });
      }
    } catch (err) {
      // Non-fatal
    }

    res.json({ message: "Post shared successfully", sharedWith: connectionIds.length, shares: post.shares });
  } catch (e) {
    console.error("sharePost error:", e);
    res.status(500).json({ message: "Error sharing post" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if user owns the post or is admin
    if (
      post.userId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    // Delete associated media files
    if (post.media && post.media.length > 0) {
      post.media.forEach((m) => {
        try {
          const filePath = path.join(__dirname, "..", m.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error("Error deleting media file:", err);
        }
      });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully" });
  } catch (e) {
    console.error("deletePost error:", e);
    res.status(500).json({ message: "Error deleting post" });
  }
};

// React to post (LinkedIn-style reactions)
exports.reactToPost = async (req, res) => {
  try {
    const { reactionType } = req.body;
    const validReactions = [
      "like",
      "love",
      "celebrate",
      "support",
      "insightful",
      "curious",
    ];

    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ message: "Invalid reaction type" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user._id;
    const existingReactionIndex = post.reactions.findIndex((r) =>
      r.userId.equals(userId)
    );

    if (existingReactionIndex !== -1) {
      // User already reacted - update or remove
      if (post.reactions[existingReactionIndex].type === reactionType) {
        // Same reaction - remove it
        post.reactions.splice(existingReactionIndex, 1);
        // Also remove from likes array for backward compatibility
        post.likes = post.likes.filter((id) => !id.equals(userId));
      } else {
        // Different reaction - update it
        post.reactions[existingReactionIndex].type = reactionType;
      }
    } else {
      // New reaction
      post.reactions.push({ userId, type: reactionType });
      // Also add to likes array for backward compatibility
      if (!post.likes.includes(userId)) {
        post.likes.push(userId);
      }
    }

    await post.save();

    // Calculate reaction counts
    const reactionCounts = {};
    validReactions.forEach((type) => {
      reactionCounts[type] = post.reactions.filter(
        (r) => r.type === type
      ).length;
    });

    res.json({
      reactions: post.reactions,
      reactionCounts,
      totalReactions: post.reactions.length,
      userReaction:
        post.reactions.find((r) => r.userId.equals(userId))?.type || null,
    });
  } catch (e) {
    console.error("reactToPost error:", e);
    res.status(500).json({ message: "Error reacting to post" });
  }
};

// Update post (content and optional link)
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content = "", link = "" } = req.body;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Only owner or admin can edit
    if (
      post.userId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized to edit this post" });
    }

    if (typeof content === "string" && content.trim()) {
      post.content = content.trim();
    }
    if (typeof link === "string") {
      if (link && /^https?:\/\//i.test(link)) {
        post.linkPreview = { ...(post.linkPreview || {}), url: link };
      } else if (!link) {
        post.linkPreview = undefined;
      }
    }

    await post.save();
    const populated = await Post.findById(post._id)
      .populate("userId", "name avatarUrl username role");

    res.json({
      _id: populated._id,
      user: {
        _id: populated.userId._id,
        name: populated.userId.name,
        username: populated.userId.username,
        role: populated.userId.role,
        avatarUrl: populated.userId.avatarUrl
          ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
              populated.userId.avatarUrl
            }`
          : null,
      },
      content: populated.content,
      media:
        populated.media?.map((m) => ({
          ...m,
          url: `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
            m.url
          }`,
        })) || [],
      linkPreview: populated.linkPreview || null,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    });
  } catch (e) {
    console.error("updatePost error:", e);
    res.status(500).json({ message: "Error updating post" });
  }
};

// Toggle bookmark
exports.toggleBookmark = async (req, res) => {
  try {
    const postId = req.params.id;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const idx = (user.bookmarkedPosts || []).findIndex((id) => id.equals(postId));
    let bookmarked = false;
    if (idx >= 0) {
      user.bookmarkedPosts.splice(idx, 1);
      bookmarked = false;
    } else {
      user.bookmarkedPosts.push(postId);
      bookmarked = true;
    }
    await user.save();
    res.json({ bookmarked, postId });
  } catch (e) {
    console.error("toggleBookmark error:", e);
    res.status(500).json({ message: "Error updating bookmark" });
  }
};

// Get saved/bookmarked posts for current user
exports.getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("bookmarkedPosts");
    const ids = user?.bookmarkedPosts || [];
    if (!ids.length) return res.json([]);

    const posts = await Post.find({ _id: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate("userId", "name avatarUrl username role")
      .populate("mentions", "name avatarUrl username")
      .populate("comments.userId", "name avatarUrl username")
      .populate("comments.replies.userId", "name avatarUrl username")
      .populate("reactions.userId", "name avatarUrl username");

    const shaped = posts.map((p) => ({
      _id: p._id,
      user: {
        _id: p.userId._id,
        name: p.userId?.name,
        username: p.userId?.username,
        role: p.userId?.role,
        avatarUrl: p.userId?.avatarUrl
          ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
              p.userId.avatarUrl
            }`
          : null,
      },
      content: p.content,
      media:
        p.media?.map((m) => ({
          ...m,
          url: `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
            m.url
          }`,
        })) || [],
      visibility: p.visibility,
      tags: p.tags || [],
      mentions: p.mentions || [],
      likes: p.likes || [],
      reactions:
        p.reactions?.map((r) => ({
          userId: r.userId._id,
          type: r.type,
          user: {
            name: r.userId?.name,
            username: r.userId?.username,
            avatarUrl: r.userId?.avatarUrl
              ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
                  r.userId.avatarUrl
                }`
              : null,
          },
        })) || [],
      comments:
        p.comments?.map((c) => ({
          _id: c._id,
          content: c.content,
          user: {
            _id: c.userId._id,
            name: c.userId?.name,
            username: c.userId?.username,
            avatarUrl: c.userId?.avatarUrl
              ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
                  c.userId.avatarUrl
                }`
              : null,
          },
          replies:
            c.replies?.map((r) => ({
              _id: r._id,
              content: r.content,
              user: {
                _id: r.userId._id,
                name: r.userId?.name,
                username: r.userId?.username,
                avatarUrl: r.userId?.avatarUrl
                  ? `${
                      process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"
                    }${r.userId.avatarUrl}`
                  : null,
              },
              createdAt: r.createdAt,
            })) || [],
          createdAt: c.createdAt,
        })) || [],
      linkPreview: p.linkPreview || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json(shaped);
  } catch (e) {
    console.error("getSavedPosts error:", e);
    res.status(500).json({ message: "Error fetching saved posts" });
  }
};
// Reply to a comment
exports.replyToComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { id: postId, commentId } = req.params;

    if (!content?.trim()) {
      return res.status(400).json({ message: "Reply content required" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = {
      userId: req.user._id,
      content: content.trim(),
      createdAt: new Date(),
    };

    comment.replies.push(reply);
    await post.save();

    // Get the newly added reply with populated user data
    const updatedPost = await Post.findById(postId).populate(
      "comments.replies.userId",
      "name avatarUrl username"
    );

    const updatedComment = updatedPost.comments.id(commentId);
    const newReply = updatedComment.replies[updatedComment.replies.length - 1];

    res.status(201).json({
      _id: newReply._id,
      content: newReply.content,
      user: {
        _id: newReply.userId._id,
        name: newReply.userId.name,
        username: newReply.userId.username,
        avatarUrl: newReply.userId.avatarUrl
          ? `${process.env.BACKEND_PUBLIC_URL || "http://localhost:3001"}${
              newReply.userId.avatarUrl
            }`
          : null,
      },
      createdAt: newReply.createdAt,
    });
  } catch (e) {
    console.error("replyToComment error:", e);
    res.status(500).json({ message: "Error adding reply" });
  }
};
