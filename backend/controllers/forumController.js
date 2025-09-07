const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment');
const ForumReport = require('../models/ForumReport');
const Notification = require('../models/Notification');
const User = require('../models/User');

const selectUserPublic = 'name username avatarUrl role department year industry current_job_title';

exports.createPost = async (req, res) => {
  try {
    const { title, content, category, tags, isAnonymous, mentions, pollQuestion, pollOptions, mediaType, mediaLink } = req.body;

    const post = new ForumPost({
      author: isAnonymous ? undefined : req.user._id,
      isAnonymous: Boolean(isAnonymous),
      title,
      content,
      category,
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : []),
      mentions: Array.isArray(mentions) ? mentions : [],
      media: mediaType ? {
        url: mediaType === 'link' ? mediaLink : (req.file ? `/uploads/${req.file.filename}` : undefined),
        type: mediaType
      } : {}
    });

    if (pollQuestion && Array.isArray(pollOptions) && pollOptions.length >= 2) {
      post.poll = {
        question: pollQuestion,
        options: pollOptions.map(text => ({ text, votes: [] })),
        voters: []
      };
    }

    await post.save();

    // Notify mentions
    if (post.mentions && post.mentions.length > 0) {
      await Promise.all(post.mentions.map(uid => Notification.create({
        recipient: uid,
        sender: req.user._id,
        type: 'mention',
        content: `You were mentioned in a forum post: ${post.title}`
      })));
    }

    res.status(201).json({ data: post });
  } catch (err) {
    console.error('createPost error:', err);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

exports.listPosts = async (req, res) => {
  try {
    const { q, author, category, sort, filter } = req.query;

    const query = {};
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }
    if (author) query.author = author;
    if (category) query.category = category;

    // Filters
    let sortSpec = { createdAt: -1 };
    if (sort === 'upvoted') {
      sortSpec = { upvotesCount: -1, createdAt: -1 };
    }
    // Build pipeline to compute upvotes count and unanswered (no comments)
    const pipeline = [
      { $match: query },
      { $addFields: { upvotesCount: { $size: { $ifNull: ['$upvotes', []] } } } }
    ];

    if (filter === 'unanswered') {
      pipeline.push({
        $lookup: { from: 'forumcomments', localField: '_id', foreignField: 'post', as: 'comments' }
      });
      pipeline.push({
        $match: { $expr: { $eq: [{ $size: '$comments' }, 0] } }
      });
    }

    pipeline.push({ $sort: sortSpec });

    const posts = await ForumPost.aggregate(pipeline);

    // Populate author data on aggregated docs
    const ids = posts.map(p => p._id);
    const hydrated = await ForumPost.find({ _id: { $in: ids } })
      .select('-__v')
      .populate('author', selectUserPublic);

    // Map back in order of aggregate
    const map = new Map(hydrated.map(h => [String(h._id), h]));
    const ordered = posts.map(p => map.get(String(p._id)));

    res.json({ data: ordered });
  } catch (err) {
    console.error('listPosts error:', err);
    res.status(500).json({ message: 'Failed to list posts' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', selectUserPublic)
      .populate('mentions', 'name username');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Comments threaded
    const comments = await ForumComment.find({ post: post._id })
      .sort({ createdAt: 1 })
      .populate('author', selectUserPublic);

    res.json({ data: { post, comments } });
  } catch (err) {
    console.error('getPost error:', err);
    res.status(500).json({ message: 'Failed to get post' });
  }
};

exports.toggleUpvotePost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const uid = req.user._id;
    const has = post.upvotes.some(id => id.toString() === uid.toString());
    if (has) {
      post.upvotes = post.upvotes.filter(id => id.toString() !== uid.toString());
    } else {
      post.upvotes.push(uid);
      // notify author unless anonymous
      if (post.author) {
        await Notification.create({
          recipient: post.author,
          sender: uid,
          type: 'upvote',
          content: `Your forum post received an upvote`
        });
      }
    }
    await post.save();
    res.json({ data: { upvotes: post.upvotes.length, upvoted: !has } });
  } catch (err) {
    console.error('toggleUpvotePost error:', err);
    res.status(500).json({ message: 'Failed to toggle upvote' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { content, parentComment, mentions, isAnonymous } = req.body;

    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await ForumComment.create({
      post: post._id,
      parentComment: parentComment || null,
      author: isAnonymous ? undefined : req.user._id,
      isAnonymous: Boolean(isAnonymous),
      content,
      mentions: Array.isArray(mentions) ? mentions : []
    });

    // Notify post author on direct comment (not for nested? We notify on all)
    if (post.author && String(post.author) !== String(req.user._id)) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'reply',
        content: `New reply on your forum post: ${post.title}`
      });
    }
    // Notify mentions in comment
    if (comment.mentions && comment.mentions.length > 0) {
      await Promise.all(comment.mentions.map(uid => Notification.create({
        recipient: uid,
        sender: req.user._id,
        type: 'mention',
        content: `You were mentioned in a forum comment`
      })));
    }

    const populated = await ForumComment.findById(comment._id).populate('author', selectUserPublic);
    res.status(201).json({ data: populated });
  } catch (err) {
    console.error('createComment error:', err);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

exports.toggleUpvoteComment = async (req, res) => {
  try {
    const comment = await ForumComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const uid = req.user._id;
    const has = comment.upvotes.some(id => id.toString() === uid.toString());
    if (has) {
      comment.upvotes = comment.upvotes.filter(id => id.toString() !== uid.toString());
    } else {
      comment.upvotes.push(uid);
      if (comment.author) {
        await Notification.create({
          recipient: comment.author,
          sender: uid,
          type: 'upvote',
          content: `Your comment received an upvote`
        });
      }
    }
    await comment.save();
    res.json({ data: { upvotes: comment.upvotes.length, upvoted: !has } });
  } catch (err) {
    console.error('toggleUpvoteComment error:', err);
    res.status(500).json({ message: 'Failed to toggle upvote' });
  }
};

exports.votePoll = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post || !post.poll) return res.status(404).json({ message: 'Poll not found' });

    const uid = req.user._id.toString();
    if (post.poll.voters.some(v => v.toString() === uid)) {
      return res.status(400).json({ message: 'Already voted' });
    }

    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    post.poll.options[optionIndex].votes.push(req.user._id);
    post.poll.voters.push(req.user._id);
    await post.save();

    const results = post.poll.options.map((opt, idx) => ({
      index: idx,
      text: opt.text,
      votes: opt.votes.length
    }));
    res.json({ data: { results } });
  } catch (err) {
    console.error('votePoll error:', err);
    res.status(500).json({ message: 'Failed to vote' });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const uid = req.user._id.toString();
    const has = (post.bookmarks || []).some(b => b.toString() === uid);
    if (has) post.bookmarks = post.bookmarks.filter(b => b.toString() !== uid);
    else post.bookmarks.push(req.user._id);
    await post.save();
    res.json({ data: { bookmarked: !has } });
  } catch (err) {
    console.error('toggleBookmark error:', err);
    res.status(500).json({ message: 'Failed to toggle bookmark' });
  }
};

exports.reportTarget = async (req, res) => {
  try {
    const { targetType, reason } = req.body;
    const { id } = req.params;

    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid target type' });
    }

    await ForumReport.create({
      targetType,
      targetId: id,
      reporter: req.user._id,
      reason: reason || 'Inappropriate'
    });

    if (targetType === 'post') {
      await ForumPost.findByIdAndUpdate(id, { $inc: { reportsCount: 1 }, isReported: true });
    }

    res.json({ message: 'Reported for moderator review' });
  } catch (err) {
    console.error('reportTarget error:', err);
    res.status(500).json({ message: 'Failed to report' });
  }
};

exports.leaderboard = async (req, res) => {
  try {
    // Top contributors by (post upvotes + comment upvotes) in last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const postAgg = await ForumPost.aggregate([
      { $match: { createdAt: { $gte: since }, author: { $ne: null } } },
      { $project: { author: 1, upvotesCount: { $size: { $ifNull: ['$upvotes', []] } } } },
      { $group: { _id: '$author', postScore: { $sum: '$upvotesCount' } } }
    ]);

    const commentAgg = await ForumComment.aggregate([
      { $match: { createdAt: { $gte: since }, author: { $ne: null } } },
      { $project: { author: 1, upvotesCount: { $size: { $ifNull: ['$upvotes', []] } } } },
      { $group: { _id: '$author', commentScore: { $sum: '$upvotesCount' } } }
    ]);

    const scoreMap = new Map();
    postAgg.forEach(p => scoreMap.set(String(p._id), { postScore: p.postScore, commentScore: 0 }));
    commentAgg.forEach(c => {
      const key = String(c._id);
      if (!scoreMap.has(key)) scoreMap.set(key, { postScore: 0, commentScore: c.commentScore });
      else scoreMap.get(key).commentScore = c.commentScore;
    });

    const users = await User.find({ _id: { $in: Array.from(scoreMap.keys()) } }).select(selectUserPublic);
    const merged = users.map(u => {
      const s = scoreMap.get(String(u._id)) || { postScore: 0, commentScore: 0 };
      const total = (s.postScore || 0) + (s.commentScore || 0);
      let badges = [];
      if (s.postScore >= 10) badges.push('Career Advisor');
      if (s.commentScore >= 10) badges.push('Top Helper');
      if (total >= 20) badges.push('Hackathon Guide');
      return { user: u, score: total, badges };
    }).sort((a, b) => b.score - a.score).slice(0, 20);

    res.json({ data: merged });
  } catch (err) {
    console.error('leaderboard error:', err);
    res.status(500).json({ message: 'Failed to load leaderboard' });
  }
};