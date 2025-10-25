const Post = require("../models/Post");
const User = require("../models/User");
const NotificationService = require("../services/NotificationService");

// Helper: shape a post for the client
const shapePost = (post, currentUserId) => ({
  ...post,
  user: post.userId,
  isBookmarked: Array.isArray(post.bookmarkedBy)
    ? post.bookmarkedBy.some((id) => String(id) === String(currentUserId))
    : false,
  userReaction:
    (post.reactions || []).find(
      (r) => String(r.userId) === String(currentUserId)
    ) || null,
});

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
    } else {
      // Teachers/Alumni/Admin can see all posts, but we still apply department filter for consistency
      // They can see posts from any department they have access to
      // For now, let them see all posts - this can be refined based on requirements
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name username avatarUrl role department")
      .populate("comments.userId", "name username avatarUrl")
      .lean();

    res.json(posts.map((p) => shapePost(p, req.user.id)));
  } catch (err) {
    console.error("getAllPosts error:", err);
    res.status(500).json({ message: "Failed to fetch posts." });
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
    const selectedDepartments = req.body.departments
      ? Array.isArray(req.body.departments)
        ? req.body.departments
        : [req.body.departments]
      : [];

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
      "department role"
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

    if (idx > -1) {
      if (post.reactions[idx].type === type) {
        post.reactions.splice(idx, 1);
      } else {
        post.reactions[idx].type = type;
      }
    } else {
      post.reactions.push({ userId: req.user.id, type });
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
    await post.save();

    const updated = await Post.findById(post._id)
      .populate("userId", "name username avatarUrl role department")
      .populate("comments.userId", "name username avatarUrl")
      .lean();

    res.json(shapePost(updated, req.user.id));
  } catch (err) {
    console.error("reactToPost error:", err);
    res.status(500).json({ message: "Failed to react to post." });
  }
};

// POST /api/posts/:id/comment
exports.commentOnPost = async (req, res) => {
  try {
    const { content } = req.body;
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

    const comment = { userId: req.user.id, content };
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

    const populated = await Post.findById(post._id)
      .populate("comments.userId", "name username avatarUrl")
      .lean();

    res.status(201).json(populated.comments[populated.comments.length - 1]);
  } catch (err) {
    console.error("commentOnPost error:", err);
    res.status(500).json({ message: "Failed to add comment." });
  }
};

// DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found." });
    }

    const isOwner = String(post.userId) === String(req.user.id);
    const isAdmin = (req.user.role || "").toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden." });
    }

    post.deletedAt = new Date();
    await post.save();
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

    post.bookmarkedBy = post.bookmarkedBy || [];
    const idx = post.bookmarkedBy.findIndex(
      (u) => String(u) === String(req.user.id)
    );

    let bookmarked;
    if (idx > -1) {
      post.bookmarkedBy.splice(idx, 1);
      bookmarked = false;
    } else {
      post.bookmarkedBy.push(req.user.id);
      bookmarked = true;
    }

    await post.save();
    res.json({ bookmarked, message: bookmarked ? "Saved" : "Unsaved" });
  } catch (err) {
    console.error("toggleBookmark error:", err);
    res.status(500).json({ message: "Failed to toggle bookmark." });
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
