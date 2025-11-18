const Post = require('../models/Post');
const User = require('../models/User');
const PostReport = require('../models/PostReport');
const Message = require('../models/Message');
const Thread = require('../models/Thread');
const NotificationService = require('../services/NotificationService');

// Helper function to shape post data for client
const shapePost = (post, currentUserId) => {
  const reactions = post.reactions || [];
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});
  
  const userReaction = reactions.find(
    (r) => String(r.userId) === String(currentUserId)
  )?.type || null;
  
  const totalReactions = reactions.length;
  const totalComments = (post.comments || []).length;
  const totalShares = (post.shares || []).length;
  const views = post.views || 0;
  
  const engagementRate = views > 0
    ? ((totalReactions + totalComments + totalShares) / views) * 100
    : 0;
  
  const isBookmarked = Array.isArray(post.bookmarkedBy)
    ? post.bookmarkedBy.some((id) => String(id) === String(currentUserId))
    : false;
  
  return {
    ...post,
    user: post.userId,
    isBookmarked,
    userReaction,
    reactionCounts,
    totalReactions,
    totalComments,
    totalShares,
    engagementRate: parseFloat(engagementRate.toFixed(2)),
    tags: post.tags || [],
    views,
    shareCount: totalShares,
    reportsCount: post.reportsCount || 0,
    isOwner: String(post.userId?._id || post.userId) === String(currentUserId)
  };
};

// GET /api/posts - with department filtering
exports.getAllPosts = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select(
      "department role"
    );
    if (!currentUser) {
      return res.status(404).json({ message: "User not found." });
    }

    let query = { deletedAt: null };

    // Department-based filtering
    if (currentUser.role === "student") {
      // Students can only see posts from their department or "All" departments
      query.departments = { $in: [currentUser.department, "All"] };
    }

    const { q, filter, sort, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Search query
    if (q) {
      query.$or = [
        { content: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    // Filter
    if (filter === "my-posts") {
      query.userId = req.user.id;
    } else if (filter === "by-department") {
      query.departments = { $in: [currentUser.department] };
    }

    // Sort
    let sortOption = { createdAt: -1 };
    if (sort === "popular") {
      sortOption = { views: -1, createdAt: -1 };
    } else if (sort === "most-commented") {
      sortOption = { "comments.length": -1, createdAt: -1 };
    }

    const posts = await Post.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("userId", "name username avatarUrl role department")
      .populate("comments.userId", "name username avatarUrl")
      .lean();

    // Track views
    for (const post of posts) {
      const viewedBy = post.viewedBy || [];
      if (
        !viewedBy.some((view) => String(view.userId) === String(req.user.id))
      ) {
        await Post.findByIdAndUpdate(post._id, {
          $inc: { views: 1 },
          $push: { viewedBy: { userId: req.user.id, viewedAt: new Date() } },
        });
      }
    }

    const total = await Post.countDocuments(query);

    res.json({
      posts: posts.map((p) => shapePost(p, req.user.id)),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("getAllPosts error:", err);
    res.status(500).json({ message: "Failed to fetch posts." });
  }
};

// GET /api/posts/:id - Get single post with full details
exports.getSinglePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!id || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    
    const post = await Post.findById(id)
      .populate('userId', 'name username avatarUrl role department')
      .populate('comments.userId', 'name username avatarUrl role department')
      .populate('reactions.userId', 'name username avatarUrl')
      .lean();
    
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    
    // Check department access for students
    const currentUser = await User.findById(req.user.id).select('department role');
    if (
      currentUser.role === 'student' &&
      !post.departments.includes(currentUser.department) &&
      !post.departments.includes('All')
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    // Track view
    const viewedBy = post.viewedBy || [];
    if (!viewedBy.some((view) => String(view.userId) === String(req.user.id))) {
      await Post.findByIdAndUpdate(post._id, {
        $inc: { views: 1 },
        $push: { viewedBy: { userId: req.user.id, viewedAt: new Date() } }
      });
      post.views = (post.views || 0) + 1;
    }
    
    res.json(shapePost(post, req.user.id));
  } catch (err) {
    console.error('getSinglePost error:', err);
    res.status(500).json({ message: 'Failed to fetch post.' });
  }
};

// GET /api/posts/search
exports.searchPosts = async (req, res) => {
  try {
    const { q, tags, author, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { deletedAt: null };

    // Search by tags
    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      query.tags = { $in: tagArray };
    }

    // Search by content
    if (q) {
      query.content = { $regex: q, $options: "i" };
    }

    // Search by author
    if (author) {
      const user = await User.findOne({
        $or: [
          { name: { $regex: author, $options: "i" } },
          { username: { $regex: author, $options: "i" } },
        ],
      });
      if (user) {
        query.userId = user._id;
      } else {
        return res.json({
          posts: [],
          total: 0,
          page: 1,
          limit: parseInt(limit),
        });
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name username avatarUrl role department")
      .lean();

    const total = await Post.countDocuments(query);

    // Highlight results (simple implementation)
    const highlightedPosts = posts.map((post) => ({
      ...shapePost(post, req.user.id),
      highlightedContent: q
        ? post.content.replace(new RegExp(q, "gi"), `<mark>${q}</mark>`)
        : post.content,
    }));

    res.json({
      posts: highlightedPosts,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("searchPosts error:", err);
    res.status(500).json({ message: "Failed to search posts." });
  }
};

// GET /api/posts/saved
exports.getSavedPosts = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select(
      "department role"
    );
    if (!currentUser) {
      return res.status(404).json({ message: "User not found." });
    }

    let query = {
      deletedAt: null,
      bookmarkedBy: req.user.id,
    };

    // Apply same department filtering to saved posts
    if (currentUser.role === "student") {
      query.departments = { $in: [currentUser.department, "All"] };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name username avatarUrl role department")
      .lean();

    res.json(
      posts.map((p) => ({ ...shapePost(p, req.user.id), isBookmarked: true }))
    );
  } catch (err) {
    console.error("getSavedPosts error:", err);
    res.status(500).json({ message: "Failed to fetch saved posts." });
  }
};

// POST /api/posts
exports.createPost = async (req, res) => {
  try {
    const content = (req.body.content || "").toString();
    const visibility = (req.body.visibility || "public").toString();
    
    // Parse departments from JSON string (FormData sends as string)
    let selectedDepartments = [];
    if (req.body.departments) {
      try {
        selectedDepartments = JSON.parse(req.body.departments);
      } catch (e) {
        selectedDepartments = Array.isArray(req.body.departments)
          ? req.body.departments
          : [req.body.departments];
      }
    }
    // Filter out empty strings
    selectedDepartments = selectedDepartments.filter(d => d && d.trim());
    
    // Parse tags from JSON string (FormData sends as string)
    let tags = [];
    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch (e) {
        tags = Array.isArray(req.body.tags)
          ? req.body.tags
          : [req.body.tags];
      }
    }
    // Filter out empty strings
    tags = tags.filter(t => t && t.trim());

    // Get current user info
    const currentUser = await User.findById(req.user.id).select(
      "role department name"
    );
    if (!currentUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Validate departments based on user role
    let departments = [];
    if (currentUser.role === "student") {
      // Students can't create posts - this should be blocked by middleware
      return res.status(403).json({ message: "Students cannot create posts." });
    } else {
      // Teachers/Alumni can select departments
      if (
        selectedDepartments.includes("All") ||
        selectedDepartments.length === 0
      ) {
        departments = ["All"];
      } else {
        const validDepartments = [
          "CSE",
          "AI-DS",
          "E&TC",
          "Mechanical",
          "Civil",
          "Other",
        ];
        departments = selectedDepartments.filter((dept) =>
          validDepartments.includes(dept)
        );
        if (departments.length === 0) {
          departments = [currentUser.department]; // Default to user's department
        }
      }
    }

    // Build media array from multer (Cloudinary)
    const media = Array.isArray(req.files)
      ? req.files.map((f) => ({
          url: f.path || f.secure_url, // Cloudinary URL
          type: (f.mimetype || "").startsWith("video")
            ? "video"
            : (f.mimetype || "").startsWith("image")
            ? "image"
            : "document",
          public_id: f.filename || f.public_id || null,
          originalName: f.originalname || null,
        }))
      : [];

    if (!content.trim() && media.length === 0) {
      return res.status(400).json({ message: "Content or media is required." });
    }

    // Mentions by @username
    const usernames =
      content.match(/@([a-zA-Z0-9_]+)/g)?.map((m) => m.slice(1)) || [];
    const mentionedUsers = usernames.length
      ? await User.find({ username: { $in: usernames } }).select("_id")
      : [];

    const post = await Post.create({
      userId: req.user.id,
      content,
      media,
      departments,
      authorRole: currentUser.role,
      visibility,
      mentions: mentionedUsers.map((u) => u._id),
      tags,
    });

    // Notify mentions (non-blocking)
    Promise.all(
      mentionedUsers.map((u) =>
        NotificationService.createNotification({
          recipientId: u._id,
          senderId: req.user.id,
          type: "mention",
          content: `${currentUser.name} mentioned you in a post.`,
          relatedId: post._id,
          onModel: "Post",
        })
      )
    ).catch((e) => console.error("notify mentions error:", e));

    const populated = await Post.findById(post._id)
      .populate("userId", "name username avatarUrl role department")
      .lean();

    res.status(201).json(shapePost(populated, req.user.id));
  } catch (err) {
    console.error("createPost error:", err);
    res.status(500).json({ message: "Failed to create post." });
  }
};

// POST /api/posts/:id/react
exports.reactToPost = async (req, res) => {
  try {
    const { type } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Check if user can see this post (department filtering)
    const currentUser = await User.findById(req.user.id).select(
      "department role name"
    );
    if (
      currentUser.role === "student" &&
      !post.departments.includes(currentUser.department) &&
      !post.departments.includes("All")
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const idx = (post.reactions || []).findIndex(
      (r) => String(r.userId) === String(req.user.id)
    );

    let updatedReactions = [...(post.reactions || [])];
    
    if (idx > -1) {
      if (updatedReactions[idx].type === type) {
        // Remove reaction
        updatedReactions.splice(idx, 1);
      } else {
        // Change reaction type
        updatedReactions[idx] = { userId: req.user.id, type };
      }
    } else {
      // Add new reaction
      updatedReactions.push({ userId: req.user.id, type });
      if (String(post.userId) !== String(req.user.id)) {
        NotificationService.createNotification({
          recipientId: post.userId,
          senderId: req.user.id,
          type: "like",
          content: `${currentUser.name} reacted to your post.`,
          relatedId: post._id,
          onModel: "Post",
        }).catch((e) => console.error("notify react error:", e));
      }
    }
    
    // Update post with new reactions
    await Post.findByIdAndUpdate(req.params.id, {
      reactions: updatedReactions
    });

    const reactionCounts = updatedReactions.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
    const userReaction =
      updatedReactions.find((r) => String(r.userId) === String(req.user.id))
        ?.type || null;
    const counts = { ...reactionCounts };
    const hasReacted = updatedReactions.some(
      (r) => String(r.userId) === String(req.user.id)
    );

    // Emit socket.io event
    if (global.io) {
      global.io.to(`post_${post._id}`).emit("post:reaction_updated", {
        postId: post._id,
        reactionCounts,
        userReaction,
        counts,
      });
    }

    res.json({ reactionCounts, counts, userReaction, hasReacted });
  } catch (err) {
    console.error("reactToPost error:", err);
    res.status(500).json({ message: "Failed to react to post." });
  }
};

// GET /api/posts/:id/reactions
exports.getReactions = async (req, res) => {
  try {
    const { type } = req.query;
    const post = await Post.findById(req.params.id).populate(
      "reactions.userId",
      "name username avatarUrl role department"
    );
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    let reactions = post.reactions || [];
    if (type) {
      reactions = reactions.filter((r) => r.type === type);
    }

    const grouped = reactions.reduce((acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r.userId);
      return acc;
    }, {});

    res.json({ reactions: grouped });
  } catch (err) {
    console.error("getReactions error:", err);
    res.status(500).json({ message: "Failed to get reactions." });
  }
};

// POST /api/posts/:id/comment
exports.commentOnPost = async (req, res) => {
  try {
    const { content, parentCommentId, mentions } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required." });
    }

    const post = await Post.findById(req.params.id);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Check if user can see this post (department filtering)
    const currentUser = await User.findById(req.user.id).select(
      "department role name"
    );
    if (
      currentUser.role === "student" &&
      !post.departments.includes(currentUser.department) &&
      !post.departments.includes("All")
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const comment = {
      userId: req.user.id,
      content,
      parentCommentId: parentCommentId || null,
      mentions: mentions || [],
      reactions: [],
    };
    post.comments.push(comment);
    await post.save();

    if (String(post.userId) !== String(req.user.id)) {
      NotificationService.createNotification({
        recipientId: post.userId,
        senderId: req.user.id,
        type: "comment",
        content: `${currentUser.name} commented on your post.`,
        relatedId: post._id,
        onModel: "Post",
      }).catch((e) => console.error("notify comment error:", e));
    }

    // Notify mentions
    if (mentions && mentions.length > 0) {
      Promise.all(
        mentions.map((u) =>
          NotificationService.createNotification({
            recipientId: u,
            senderId: req.user.id,
            type: "mention",
            content: `${currentUser.name} mentioned you in a comment.`,
            relatedId: post._id,
            onModel: "Post",
          })
        )
      ).catch((e) => console.error("notify comment mentions error:", e));
    }

    const populated = await Post.findById(post._id)
      .populate("comments.userId", "name username avatarUrl")
      .lean();

    const newComment = populated.comments[populated.comments.length - 1];

    // Emit socket.io event
    if (global.io) {
      global.io.to(`post_${post._id}`).emit("post:comment_added", {
        postId: post._id,
        comment: newComment,
      });
    }

    res.json(newComment);
  } catch (err) {
    console.error("commentOnPost error:", err);
    res.status(500).json({ message: "Failed to add comment." });
  }
};

// POST /api/posts/comments/:commentId/react
exports.reactToComment = async (req, res) => {
  try {
    const { type } = req.body;
    const post = await Post.findOne({ "comments._id": req.params.commentId });
    if (!post) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const idx = (comment.reactions || []).findIndex(
      (r) => String(r.userId) === String(req.user.id)
    );

    if (idx > -1) {
      if (comment.reactions[idx].type === type) {
        comment.reactions.splice(idx, 1);
      } else {
        comment.reactions[idx].type = type;
      }
    } else {
      comment.reactions.push({ userId: req.user.id, type });
      if (String(comment.userId) !== String(req.user.id)) {
        const currentUser = await User.findById(req.user.id).select("name");
        NotificationService.createNotification({
          recipientId: comment.userId,
          senderId: req.user.id,
          type: "reaction",
          content: `${currentUser.name} reacted to your comment.`,
          relatedId: post._id,
          onModel: "Post",
        }).catch((e) => console.error("notify comment react error:", e));
      }
    }
    await post.save();

    const reactionCounts = (comment.reactions || []).reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    res.json({ reactionCounts });
  } catch (err) {
    console.error("reactToComment error:", err);
    res.status(500).json({ message: "Failed to react to comment." });
  }
};

// POST /api/posts/:id/share
exports.sharePost = async (req, res) => {
  try {
    const { connectionIds, message } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    const currentUser = await User.findById(req.user.id).select(
      "connections name"
    );
    const validConnections = connectionIds.filter((id) =>
      currentUser.connections.some((c) => String(c) === String(id))
    );

    if (validConnections.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid connections selected." });
    }

    // Track share
    post.shares.push({
      userId: req.user.id,
      sharedWith: validConnections,
      sharedAt: new Date(),
      message,
    });
    await post.save();

    // For each recipient connection, ensure a thread exists and send a chat message
    await Promise.all(
      validConnections.map(async (connId) => {
        // 1) Find or create a 1:1 thread between current user and recipient
        let thread = await Thread.findOne({
          participants: { $all: [req.user.id, connId] },
        });
        if (!thread) {
          thread = await Thread.create({
            participants: [req.user.id, connId],
            lastMessageAt: new Date(),
          });
        }

        // 2) Create a chat message with non-null threadId and clientKey
        const link = `/posts/${post._id}`; // frontend can resolve this route
        const preview = (post.content || '').substring(0, 100);
        const composedContent = message
          ? `${message}\n\nShared post: ${preview}...\n${link}`
          : `Shared post: ${preview}...\n${link}`;

        const newMsg = await Message.create({
          threadId: String(thread._id),
          clientKey: `${thread._id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          from: req.user.id,
          to: connId,
          content: composedContent,
          attachments: [link],
          metadata: {
            sharedPost: {
              postId: String(post._id),
              preview,
              imageUrl: Array.isArray(post.media) && post.media.length > 0 ? post.media[0]?.url || null : null,
              link,
            },
          },
        });

        // 3) Update thread metadata
        thread.lastMessage = newMsg._id;
        thread.lastMessageAt = new Date();
        // increment unread count for recipient
        const key = String(connId);
        const currentUnread = thread.unreadCount?.get(key) || 0;
        thread.unreadCount?.set(key, currentUnread + 1);
        await thread.save();

        // 4) Real-time chat event for recipient
        if (global.io) {
          global.io.to(connId.toString()).emit('chat:new_message', {
            threadId: String(thread._id),
            message: {
              id: String(newMsg._id),
              from: String(newMsg.from),
              to: String(newMsg.to),
              content: newMsg.content,
              attachments: newMsg.attachments,
              createdAt: newMsg.createdAt,
            },
          });
        }

        // 5) Also send a notification for share
        NotificationService.createNotification({
          recipientId: connId,
          senderId: req.user.id,
          type: 'share',
          content: `${currentUser.name} shared a post with you.`,
          relatedId: post._id,
          onModel: 'Post',
        }).catch((e) => console.error('notify share error:', e));
      })
    );

    res.json({
      message: `Post shared with ${validConnections.length} connections.`,
    });
  } catch (err) {
    console.error("sharePost error:", err);
    res.status(500).json({ message: "Failed to share post." });
  }
};

// GET /api/posts/my - list posts created by the current user
exports.getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.id, deletedAt: null })
      .select('_id content media createdAt reactions comments shares views tags departments')
      .sort({ createdAt: -1 })
      .lean();
    res.json(posts);
  } catch (err) {
    console.error('getMyPosts error:', err);
    res.status(500).json({ message: 'Failed to fetch your posts.' });
  }
};

// POST /api/posts/:id/report
exports.reportPost = async (req, res) => {
  try {
    const { reason, description } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    await PostReport.create({
      targetType: "post",
      targetId: req.params.id,
      reporter: req.user.id,
      reason,
      description,
    });

    await Post.findByIdAndUpdate(req.params.id, {
      $inc: { reportsCount: 1 },
      isReported: true,
    });

    // Notify admins
    const admins = await User.find({ role: "admin" }).select("_id");
    Promise.all(
      admins.map((admin) =>
        NotificationService.createNotification({
          recipientId: admin._id,
          senderId: req.user.id,
          type: "report",
          content: `A post has been reported.`,
          relatedId: post._id,
          onModel: "Post",
        })
      )
    ).catch((e) => console.error("notify report error:", e));

    res.json({ message: "Post reported." });
  } catch (err) {
    console.error("reportPost error:", err);
    res.status(500).json({ message: "Failed to report post." });
  }
};

// GET /api/posts/user/:userId - Get posts by specific user
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const targetUser = await User.findById(userId).select('role department');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Only Alumni, Teachers, and Admin can have posts
    if (!['alumni', 'teacher', 'admin'].includes(targetUser.role.toLowerCase())) {
      return res.json([]);
    }
    
    const posts = await Post.find({
      userId: userId,
      deletedAt: null
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'name username avatarUrl role department')
      .populate('comments.userId', 'name username avatarUrl')
      .lean();
    
    res.json(posts.map(p => shapePost(p, req.user.id)));
  } catch (err) {
    console.error('getUserPosts error:', err);
    res.status(500).json({ message: 'Failed to fetch user posts.' });
  }
};

// GET /api/posts/my-analytics
exports.getMyAnalytics = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.id, deletedAt: null })
      .select("content views reactions comments shares createdAt")
      .lean();

    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalReactions = posts.reduce(
      (sum, p) => sum + (p.reactions?.length || 0),
      0
    );
    const totalComments = posts.reduce(
      (sum, p) => sum + (p.comments?.length || 0),
      0
    );
    const totalShares = posts.reduce(
      (sum, p) => sum + (p.shares?.length || 0),
      0
    );

    const overview = {
      totalPosts,
      totalViews,
      totalReactions,
      totalComments,
      totalShares,
    };

    const postsData = posts.map((p) => ({
      title: p.content.substring(0, 50),
      views: p.views || 0,
      reactions: p.reactions?.length || 0,
      comments: p.comments?.length || 0,
      shares: p.shares?.length || 0,
      date: p.createdAt,
    }));

    res.json({
      overview,
      posts: postsData,
    });
  } catch (err) {
    console.error("getMyAnalytics error:", err);
    res.status(500).json({ message: "Failed to get analytics." });
  }
};

// GET /api/posts/:id/analytics
exports.getPostAnalytics = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "comments.userId",
      "name"
    );
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (
      String(post.userId) !== String(req.user.id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const views = post.views || 0;
    const reactionBreakdown = (post.reactions || []).reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
    const topCommenters = (post.comments || []).reduce((acc, c) => {
      const key = String(c.userId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topCommentersList = Object.entries(topCommenters)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const shareCount = (post.shares || []).length;
    const viewHistory = (post.viewedBy || []).map((v) => ({
      userId: v.userId,
      viewedAt: v.viewedAt,
    }));

    res.json({
      views,
      reactionBreakdown,
      topCommenters: topCommentersList,
      shareCount,
      viewHistory,
    });
  } catch (err) {
    console.error("getPostAnalytics error:", err);
    res.status(500).json({ message: "Failed to get post analytics." });
  }
};

// DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('userId deletedAt');
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    const isOwner = String(post.userId) === String(req.user.id);
    const isAdmin = (req.user.role || "").toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden." });
    }

    // Use findByIdAndUpdate to avoid validation issues
    await Post.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date()
    });
    
    res.json({ message: "Post deleted." });
  } catch (err) {
    console.error("deletePost error:", err);
    res.status(500).json({ message: "Failed to delete post." });
  }
};

// POST /api/posts/:id/bookmark
exports.toggleBookmark = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Check if user can see this post (department filtering)
    const currentUser = await User.findById(req.user.id).select(
      "department role"
    );
    if (
      currentUser.role === "student" &&
      !post.departments.includes(currentUser.department) &&
      !post.departments.includes("All")
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const bookmarkedBy = post.bookmarkedBy || [];
    const idx = bookmarkedBy.findIndex(
      (u) => String(u) === String(req.user.id)
    );

    let bookmarked;
    let updatedBookmarks = [...bookmarkedBy];
    
    if (idx > -1) {
      updatedBookmarks.splice(idx, 1);
      bookmarked = false;
    } else {
      updatedBookmarks.push(req.user.id);
      bookmarked = true;
    }

    await Post.findByIdAndUpdate(req.params.id, {
      bookmarkedBy: updatedBookmarks
    });
    res.json({ bookmarked, message: bookmarked ? "Saved" : "Unsaved" });
  } catch (err) {
    console.error("toggleBookmark error:", err);
    res.status(500).json({ message: "Failed to toggle bookmark." });
  }
};

// GET /api/posts/tags/popular
exports.getPopularTags = async (req, res) => {
  try {
    const tags = await Post.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json(tags.map((t) => t._id));
  } catch (err) {
    console.error("getPopularTags error:", err);
    res.status(500).json({ message: "Failed to fetch popular tags." });
  }
};

// GET /api/posts/tags/search
exports.searchTags = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const tags = await Post.distinct("tags", {
      tags: { $regex: q, $options: "i" },
      deletedAt: null,
    });
    res.json(tags.slice(0, 10));
  } catch (err) {
    console.error("searchTags error:", err);
    res.status(500).json({ message: "Failed to search tags." });
  }
};

// GET /api/posts/users/search - for mentions
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ],
    })
      .select("_id name username avatarUrl")
      .limit(10)
      .lean();

    res.json(users);
  } catch (err) {
    console.error("searchUsers error:", err);
    res.status(500).json({ message: "Failed to search users." });
  }
};

// DELETE /api/posts/:postId/comments/:commentId
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is comment owner or admin
    const isOwner = String(comment.userId) === String(userId);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Remove the comment using pull
    post.comments.pull(commentId);
    await post.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('deleteComment error:', err);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};