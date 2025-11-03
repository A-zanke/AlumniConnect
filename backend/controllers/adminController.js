const User = require("../models/User");
const Event = require("../models/Event");
const ForumPost = require("../models/ForumPost");
const ForumReport = require("../models/ForumReport");
const Testimonial = require("../models/Testimonial");
const Post = require("../models/Post");
const PostReport = require("../models/PostReport");
const { Parser } = require("json2csv");
const {
  approveEvent: coreApproveEvent,
  rejectEvent: coreRejectEvent,
} = require("./eventsController");

// Helper for counting by key
const countBy = (arr, key) => {
  const map = {};
  arr.forEach((i) => {
    const k = (i?.[key] ?? "Unknown") + "";
    map[k] = (map[k] || 0) + 1;
  });
  return map;
};

// ===================== Analytics =====================
const getAnalytics = async (req, res) => {
  try {
    const [
      students,
      teachers,
      alumni,
      events,
      forumPosts,
      posts,
      reports,
      postReports,
      topPosts,
    ] = await Promise.all([
      User.find({ role: "student" }).select("department year createdAt isOnline lastSeen"),
      User.find({ role: "teacher" }).select("department createdAt isOnline lastSeen"),
      User.find({ role: "alumni" }).select(
        "graduationYear company industry createdAt isOnline lastSeen"
      ),
      Event.find({}).select("createdAt createdBy status"),
      ForumPost.find({ isDeleted: { $ne: true } }).select("createdAt"),
      Post.find({}).populate("userId", "department").select("createdAt"),
      ForumReport.find({}).select("resolved createdAt"),
      PostReport.find({}).select("resolved createdAt"),
      Post.aggregate([
        {
          $project: {
            title: 1,
            content: 1,
            createdAt: 1,
            userId: 1,
            reactionCount: { $size: { $ifNull: ["$reactions", []] } },
            commentCount: { $size: { $ifNull: ["$comments", []] } },
            shareCount: { $size: { $ifNull: ["$shares", []] } },
          },
        },
        {
          $addFields: {
            engagementScore: {
              $add: ["$reactionCount", "$commentCount", "$shareCount"],
            },
          },
        },
        { $sort: { engagementScore: -1, createdAt: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: 1,
            content: 1,
            createdAt: 1,
            engagementScore: 1,
            reactionCount: 1,
            commentCount: 1,
            shareCount: 1,
            "user._id": 1,
            "user.name": 1,
          },
        },
      ]),
    ]);

    // Monthly buckets for last 12 months
    const toMonthKey = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
    };
    const last12Keys = (() => {
      const arr = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
        arr.push(
          `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
        );
      }
      return arr;
    })();
    const last12Weeks = (() => {
      const arr = [];
      const now = new Date();
      // align to Monday of current week
      const d = new Date(now);
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // Monday as start
      d.setDate(d.getDate() + diff);
      for (let i = 11; i >= 0; i--) {
        const wd = new Date(d);
        wd.setDate(d.getDate() - i * 7);
        const y = wd.getFullYear();
        const m = String(wd.getMonth() + 1).padStart(2, "0");
        const dayStr = String(wd.getDate()).padStart(2, "0");
        arr.push(`${y}-${m}-${dayStr}`);
      }
      return arr;
    })();
    const seriesInit = () =>
      last12Keys.reduce((acc, k) => {
        acc[k] = 0;
        return acc;
      }, {});

    const studentSeries = seriesInit();
    students.forEach((s) => {
      studentSeries[toMonthKey(s.createdAt)] =
        (studentSeries[toMonthKey(s.createdAt)] || 0) + 1;
    });
    const teacherSeries = seriesInit();
    teachers.forEach((t) => {
      teacherSeries[toMonthKey(t.createdAt)] =
        (teacherSeries[toMonthKey(t.createdAt)] || 0) + 1;
    });
    const alumniSeries = seriesInit();
    alumni.forEach((a) => {
      alumniSeries[toMonthKey(a.createdAt)] =
        (alumniSeries[toMonthKey(a.createdAt)] || 0) + 1;
    });

    const forumSeries = seriesInit();
    forumPosts.forEach((p) => {
      forumSeries[toMonthKey(p.createdAt)] =
        (forumSeries[toMonthKey(p.createdAt)] || 0) + 1;
    });

    const postSeries = seriesInit();
    posts.forEach((p) => {
      postSeries[toMonthKey(p.createdAt)] =
        (postSeries[toMonthKey(p.createdAt)] || 0) + 1;
    });

    // Reports series by month
    const reportsStatus = last12Keys.reduce((acc, k) => {
      acc[k] = { pending: 0, resolved: 0 };
      return acc;
    }, {});
    const reportsType = last12Keys.reduce((acc, k) => {
      acc[k] = { forum: 0, posts: 0 };
      return acc;
    }, {});
    reports.forEach((r) => {
      const k = toMonthKey(r.createdAt);
      reportsType[k].forum += 1;
      if (r.resolved) reportsStatus[k].resolved += 1;
      else reportsStatus[k].pending += 1;
    });
    postReports.forEach((r) => {
      const k = toMonthKey(r.createdAt);
      reportsType[k].posts += 1;
      if (r.resolved) reportsStatus[k].resolved += 1;
      else reportsStatus[k].pending += 1;
    });

    // Active vs inactive by role (active = lastSeen within 7 days OR isOnline)
    const isActive = (u) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return Boolean(u.isOnline) || (u.lastSeen && new Date(u.lastSeen) >= sevenDaysAgo);
    };
    const activeInactiveByRole = [
      {
        role: "Students",
        active: students.filter(isActive).length,
        inactive: students.length - students.filter(isActive).length,
      },
      {
        role: "Teachers",
        active: teachers.filter(isActive).length,
        inactive: teachers.length - teachers.filter(isActive).length,
      },
      {
        role: "Alumni",
        active: alumni.filter(isActive).length,
        inactive: alumni.length - alumni.filter(isActive).length,
      },
    ];

    // Active users by month (any role) using lastSeen
    const activeByMonth = last12Keys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
    const allUsers = [...students, ...teachers, ...alumni];
    allUsers.forEach((u) => {
      if (!u.lastSeen) return;
      const k = toMonthKey(u.lastSeen);
      if (k in activeByMonth) activeByMonth[k] += 1;
    });

    const eventReqStats = {
      pending: events.filter((e) => e.status === "pending").length,
      active: events.filter((e) => e.status === "active").length,
      rejected: events.filter((e) => e.status === "rejected").length,
    };

    // Post-related stats
    const totalPostReports = postReports.length;
    const unresolvedPostReports = postReports.filter((r) => !r.resolved).length;
    const mostEngagedPosts = topPosts.map((p) => ({
      _id: p._id,
      title: p.title,
      content: p.content,
      createdAt: p.createdAt,
      engagementScore: p.engagementScore,
      reactionCount: p.reactionCount,
      commentCount: p.commentCount,
      shareCount: p.shareCount,
      user: p.user ? { _id: p.user._id, name: p.user.name } : null,
    }));
    const postsByDepartment = countBy(posts, "userId.department");

    const stats = {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalAlumni: alumni.length,
      totalPosts: posts.length,
      totalForumPosts: forumPosts.length,
      totalReports: reports.length,
      unresolvedReports: reports.filter((r) => !r.resolved).length,
      totalPostReports,
      unresolvedPostReports,
      mostEngagedPosts,
      postsByDepartment,
      usersByRole: [
        { name: "Students", value: students.length },
        { name: "Teachers", value: teachers.length },
        { name: "Alumni", value: alumni.length },
      ],
      activeInactiveByRole,
      studentByDepartment: countBy(students, "department"),
      studentByYear: countBy(students, "year"),
      alumniByGraduationYear: countBy(alumni, "graduationYear"),
      alumniByCompany: countBy(alumni, "company"),
      eventsByCreatorRole: events.reduce((acc, e) => {
        const r = (e?.createdBy?.role ?? "unknown").toLowerCase();
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {}),
      eventsPending: eventReqStats.pending,
      eventsActive: eventReqStats.active,
      eventsRejected: eventReqStats.rejected,
      userGrowthSeries: last12Keys.map((k) => ({
        month: k,
        students: studentSeries[k] || 0,
        teachers: teacherSeries[k] || 0,
        alumni: alumniSeries[k] || 0,
      })),
      forumActivitySeries: last12Keys.map((k) => ({
        month: k,
        posts: forumSeries[k] || 0,
      })),
      postActivitySeries: last12Keys.map((k) => ({
        month: k,
        posts: postSeries[k] || 0,
      })),
      reportsStatusSeries: last12Keys.map((k) => ({
        month: k,
        pending: reportsStatus[k].pending,
        resolved: reportsStatus[k].resolved,
      })),
      reportsTypeSeries: last12Keys.map((k) => ({
        month: k,
        forum: reportsType[k].forum,
        posts: reportsType[k].posts,
      })),
      activeUsersSeries: last12Keys.map((k) => ({ month: k, active: activeByMonth[k] || 0 })),
      eventRequestStats: [
        { name: "Pending", value: eventReqStats.pending },
        { name: "Active", value: eventReqStats.active },
        { name: "Rejected", value: eventReqStats.rejected },
      ],
    };

    res.json(stats);
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};

// ===================== Users =====================
const listUsers = async (req, res) => {
  try {
    const { role, q, location, startDate, endDate, verified, online } =
      req.query || {};
    const query = {};
    if (role) query.role = role;
    if (location) query.location = location;
    if (typeof verified !== "undefined")
      query.emailVerified = String(verified) === "true";
    if (typeof online !== "undefined")
      query.isOnline = String(online) === "true";
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(query).select(
      "avatarUrl name email username role department year graduationYear company location emailVerified createdAt"
    );
    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ message: "Failed to list users" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

const exportUsers = async (req, res) => {
  try {
    const q = {};
    const {
      role,
      department,
      year,
      graduationYear,
      location,
      startDate,
      endDate,
      verified,
    } = req.query;
    if (role) q.role = role;
    if (department) q.department = department;
    if (year) q.year = Number(year);
    if (graduationYear) q.graduationYear = Number(graduationYear);
    if (location) q.location = location;
    if (typeof verified !== "undefined")
      q.emailVerified = String(verified) === "true";
    if (startDate || endDate) {
      q.createdAt = {};
      if (startDate) q.createdAt.$gte = new Date(startDate);
      if (endDate) q.createdAt.$lte = new Date(endDate);
    }

    const users = await User.find(q).select(
      "name email username role department year graduationYear company avatarUrl location emailVerified createdAt"
    );
    const parser = new Parser();
    const csv = parser.parse(users.map((u) => u.toObject()));
    res.header("Content-Type", "text/csv");
    res.attachment("users_export.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Export users error:", err);
    res.status(500).json({ message: "Failed to export users" });
  }
};

// ===================== Events =====================
const listAllEvents = async (req, res) => {
  try {
    const events = await Event.find({})
      .populate("organizer", "name role department year graduationYear email")
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error("List events error:", err);
    res.status(500).json({ message: "Failed to list events" });
  }
};

const approveEvent = async (req, res) => {
  try {
    req.params.eventId = req.params.eventId || req.params.id;
    return await coreApproveEvent(req, res);
  } catch (err) {
    console.error("Approve event error:", err);
    res.status(500).json({ message: "Failed to approve" });
  }
};

const rejectEvent = async (req, res) => {
  try {
    req.params.eventId = req.params.eventId || req.params.id;
    return await coreRejectEvent(req, res);
  } catch (err) {
    console.error("Reject event error:", err);
    res.status(500).json({ message: "Failed to reject" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await Event.findByIdAndDelete(id);
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ message: "Failed to delete event" });
  }
};

const exportEvents = async (req, res) => {
  try {
    const q = {};
    const { status, creatorRole, department, year, graduationYear } = req.query;
    if (status) q.status = status;
    if (creatorRole) q["createdBy.role"] = creatorRole;
    if (department) {
      q.$or = [
        { target_teacher_departments: department },
        { target_student_combinations: { $elemMatch: { department } } },
        { target_alumni_combinations: { $elemMatch: { department } } },
      ];
    }
    if (year) {
      q["target_student_combinations"] = { $elemMatch: { year: Number(year) } };
    }
    if (graduationYear) {
      q["target_alumni_combinations"] = {
        $elemMatch: { graduation_year: Number(graduationYear) },
      };
    }

    const events = await Event.find(q).select(
      "title description status createdBy target_roles target_teacher_departments target_student_combinations target_alumni_combinations startAt endAt"
    );

    const parser = new Parser();
    const csv = parser.parse(events.map((e) => e.toObject()));
    res.header("Content-Type", "text/csv");
    res.attachment("events_export.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Export events error:", err);
    res.status(500).json({ message: "Failed to export events" });
  }
};

// ===== Event Requests (pending events, often alumni-submitted) =====
const listEventRequests = async (req, res) => {
  try {
    const { creatorRole } = req.query || {};
    const q = { status: "pending" };
    if (creatorRole) q["createdBy.role"] = creatorRole;
    const pending = await Event.find(q)
      .populate("organizer", "name role email")
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    console.error("List event requests error:", err);
    res.status(500).json({ message: "Failed to list event requests" });
  }
};

// ===================== Posts moderation =====================
const listPendingPosts = async (req, res) => {
  try {
    const posts = await Post.find({ approved: false })
      .populate("userId", "name username role avatarUrl")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("List pending posts error:", err);
    res.status(500).json({ message: "Failed to list pending posts" });
  }
};

const approvePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByIdAndUpdate(
      id,
      { approved: true },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post approved", post });
  } catch (err) {
    console.error("Approve post error:", err);
    res.status(500).json({ message: "Failed to approve post" });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    await Post.findByIdAndDelete(id);
    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

const listAllPosts = async (req, res) => {
  try {
    const {
      q,
      author,
      department,
      startDate,
      endDate,
      reportStatus,
      tags,
      page = 1,
      limit = 10,
    } = req.query;
    const query = {};
    if (q) {
      query.$or = [
        { content: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ];
    }
    if (author) {
      query["userId.name"] = { $regex: author, $options: "i" };
    }
    if (department) {
      query["userId.department"] = department;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (reportStatus === "reported") {
      query.isReported = true;
    }
    if (tags) {
      query.tags = { $in: tags.split(",") };
    }
    const posts = await Post.find(query)
      .populate("userId", "name username role avatarUrl department")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Post.countDocuments(query);
    const postsWithAnalytics = posts.map((post) => ({
      ...post.toObject(),
      views: post.views,
      reactionsCount: post.reactions.length,
      commentsCount: post.comments.length,
      sharesCount: post.shares.length,
    }));
    res.json({
      posts: postsWithAnalytics,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("List posts error:", err);
    res.status(500).json({ message: "Failed to list posts" });
  }
};

// ===================== Forum moderation =====================
const listForumPosts = async (req, res) => {
  try {
    const { q, category } = req.query || {};
    const query = { isDeleted: { $ne: true } };
    if (q)
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ];
    if (category) query.category = category;
    const posts = await ForumPost.find(query)
      .populate("author", "name username role")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("List forum posts error:", err);
    res.status(500).json({ message: "Failed to list forum posts" });
  }
};

const deleteForumPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await ForumPost.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    await ForumPost.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("Delete forum post error:", err);
    res.status(500).json({ message: "Failed to delete forum post" });
  }
};

const exportForum = async (req, res) => {
  try {
    const { category } = req.query || {};
    const query = { isDeleted: { $ne: true } };
    if (category) query.category = category;
    const posts = await ForumPost.find(query)
      .select("title content category createdAt")
      .lean();
    const parser = new Parser();
    const csv = parser.parse(posts);
    res.header("Content-Type", "text/csv");
    res.attachment("forum_posts_export.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Export forum error:", err);
    res.status(500).json({ message: "Failed to export forum posts" });
  }
};

// ===================== Reports Management =====================
const listReports = async (req, res) => {
  try {
    const { resolved } = req.query || {};
    const query = {};
    if (typeof resolved !== "undefined")
      query.resolved = String(resolved) === "true";

    const reports = await ForumReport.find(query)
      .populate("reporter", "name username role email")
      .populate("targetId")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error("List reports error:", err);
    res.status(500).json({ message: "Failed to list reports" });
  }
};

const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderatorNote } = req.body;

    const report = await ForumReport.findByIdAndUpdate(
      id,
      { resolved: true, moderatorNote: moderatorNote || "Resolved by admin" },
      { new: true }
    );

    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json({ message: "Report resolved", report });
  } catch (err) {
    console.error("Resolve report error:", err);
    res.status(500).json({ message: "Failed to resolve report" });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    await ForumReport.findByIdAndDelete(id);
    res.json({ message: "Report deleted" });
  } catch (err) {
    console.error("Delete report error:", err);
    res.status(500).json({ message: "Failed to delete report" });
  }
};

// ===================== Post Reports Management =====================
const listPostReports = async (req, res) => {
  try {
    const { resolved, page = 1, limit = 10 } = req.query;
    const query = {};
    if (typeof resolved !== "undefined") query.resolved = resolved === "true";
    const reports = await PostReport.find(query)
      .populate("reporter", "name username role email")
      .populate({
        path: "targetId",
        populate: { path: "userId", select: "name username" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await PostReport.countDocuments(query);
    res.json({ reports, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("List post reports error:", err);
    res.status(500).json({ message: "Failed to list post reports" });
  }
};

const resolvePostReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderatorNote, action } = req.body;
    const report = await PostReport.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        moderatorNote: moderatorNote || "Resolved by admin",
        action: action || "Dismissed",
      },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: "Report not found" });
    if (action === "ContentRemoved") {
      await Post.findByIdAndUpdate(report.targetId, {
        isDeleted: true,
        deletedAt: new Date(),
      });
    }
    res.json({ message: "Report resolved", report });
  } catch (err) {
    console.error("Resolve post report error:", err);
    res.status(500).json({ message: "Failed to resolve report" });
  }
};

const deletePostReport = async (req, res) => {
  try {
    const { id } = req.params;
    await PostReport.findByIdAndDelete(id);
    res.json({ message: "Report deleted" });
  } catch (err) {
    console.error("Delete post report error:", err);
    res.status(500).json({ message: "Failed to delete report" });
  }
};

// ===================== Post Analytics =====================
const getPostAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id).populate("userId", "name username");
    if (!post) return res.status(404).json({ message: "Post not found" });
    const views = post.views;
    const reactionsCount = post.reactions.length;
    const commentsCount = post.comments.length;
    const sharesCount = post.shares.length;
    const engagementRate =
      views > 0
        ? ((reactionsCount + commentsCount + sharesCount) / views) * 100
        : 0;
    const reactionBreakdown = post.reactions.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
    const topCommenters = post.comments.reduce((acc, c) => {
      const userId = c.userId.toString();
      acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {});
    res.json({
      post: {
        id: post._id,
        content: post.content,
        author: post.userId,
        createdAt: post.createdAt,
      },
      analytics: {
        views,
        reactionsCount,
        commentsCount,
        sharesCount,
        engagementRate,
        reactionBreakdown,
        topCommenters: Object.entries(topCommenters).map(([userId, count]) => ({
          userId,
          count,
        })),
      },
    });
  } catch (err) {
    console.error("Get post analytics error:", err);
    res.status(500).json({ message: "Failed to get post analytics" });
  }
};

// ===================== Bulk Delete Posts =====================
const bulkDeletePosts = async (req, res) => {
  try {
    const { postIds } = req.body;
    if (!Array.isArray(postIds))
      return res.status(400).json({ message: "postIds must be an array" });
    const result = await Post.updateMany(
      { _id: { $in: postIds } },
      { isDeleted: true, deletedAt: new Date() }
    );
    res.json({ message: `${result.modifiedCount} posts soft deleted` });
  } catch (err) {
    console.error("Bulk delete posts error:", err);
    res.status(500).json({ message: "Failed to bulk delete posts" });
  }
};

// ===================== Testimonials Management =====================
const listTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({
      order: 1,
      createdAt: -1,
    });
    res.json(testimonials);
  } catch (err) {
    console.error("List testimonials error:", err);
    res.status(500).json({ message: "Failed to list testimonials" });
  }
};

const createTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    res.status(201).json({ message: "Testimonial created", testimonial });
  } catch (err) {
    console.error("Create testimonial error:", err);
    res.status(500).json({ message: "Failed to create testimonial" });
  }
};

const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!testimonial)
      return res.status(404).json({ message: "Testimonial not found" });
    res.json({ message: "Testimonial updated", testimonial });
  } catch (err) {
    console.error("Update testimonial error:", err);
    res.status(500).json({ message: "Failed to update testimonial" });
  }
};

const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    await Testimonial.findByIdAndDelete(id);
    res.json({ message: "Testimonial deleted" });
  } catch (err) {
    console.error("Delete testimonial error:", err);
    res.status(500).json({ message: "Failed to delete testimonial" });
  }
};

// ===================== Event detail =====================
const getEventByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate(
      "organizer",
      "name email role department year graduationYear"
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error("Get event by id (admin) error:", err);
    res.status(500).json({ message: "Failed to fetch event" });
  }
};

// ===================== Export all functions =====================
module.exports = {
  getAnalytics,
  listUsers,
  deleteUser,
  exportUsers,
  listAllEvents,
  listEventRequests,
  approveEvent,
  rejectEvent,
  deleteEvent,
  exportEvents,
  listPendingPosts,
  approvePost,
  deletePost,
  listAllPosts,
  listForumPosts,
  deleteForumPost,
  exportForum,
  listReports,
  resolveReport,
  deleteReport,
  listPostReports,
  resolvePostReport,
  deletePostReport,
  getPostAnalytics,
  bulkDeletePosts,
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getEventByIdAdmin,
};
