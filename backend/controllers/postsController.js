// In backend/controllers/postsController.js

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

// GET /api/posts
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .populate("userId", "name username avatarUrl role")
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
    const posts = await Post.find({
      deletedAt: null,
      bookmarkedBy: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name username avatarUrl role")
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

    // Build media array from multer (Cloudinary or disk)
    const media = Array.isArray(req.files)
      ? req.files.map((f) => ({
          url: f.path, // Cloudinary path or local uploads path
          type: (f.mimetype || "").startsWith("video") ? "video" : "image",
          public_id: f.filename || f.public_id || null,
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
      visibility,
      mentions: mentionedUsers.map((u) => u._id),
    });

    // Notify mentions (non-blocking)
    Promise.all(
      mentionedUsers.map((u) =>
        NotificationService.create(
          u._id,
          req.user.id,
          "mention",
          `${req.user.name} mentioned you in a post.`,
          post._id,
          "Post"
        )
      )
    ).catch((e) => console.error("notify mentions error:", e));

    const populated = await Post.findById(post._id)
      .populate("userId", "name username avatarUrl role")
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
        NotificationService.create(
          post.userId,
          req.user.id,
          "like",
          `${req.user.name} reacted to your post.`,
          post._id,
          "Post"
        ).catch((e) => console.error("notify react error:", e));
      }
    }
    await post.save();

    const updated = await Post.findById(post._id)
      .populate("userId", "name username avatarUrl role")
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

    const comment = { userId: req.user.id, content };
    post.comments.push(comment);
    await post.save();

    if (String(post.userId) !== String(req.user.id)) {
      NotificationService.create(
        post.userId,
        req.user.id,
        "comment",
        `${req.user.name} commented on your post.`,
        post._id,
        "Post"
      ).catch((e) => console.error("notify comment error:", e));
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
