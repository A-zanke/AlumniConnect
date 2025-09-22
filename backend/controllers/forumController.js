const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment');
const ForumReport = require('../models/ForumReport');
const Notification = require('../models/Notification');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

const selectUserPublic = 'name username avatarUrl role department year industry current_job_title';

exports.createPost = async (req, res) => {
  try {
    const { title, content, category, tags, isAnonymous, mentions, pollQuestion, pollOptions, mediaLinks } = req.body;

    const post = new ForumPost({
      author: isAnonymous ? undefined : req.user._id,
      isAnonymous: Boolean(isAnonymous),
      title,
      content,
      category,
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : []),
      mentions: Array.isArray(mentions) ? mentions : []
    });

    // Handle multiple files
    if (req.files && req.files.length > 0) {
      post.media = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
        filename: file.filename
      }));
    }

    // Handle media links
    if (mediaLinks && Array.isArray(mediaLinks)) {
      const linkMedia = mediaLinks.map(link => ({
        url: link,
        type: 'link'
      }));
      post.media = [...(post.media || []), ...linkMedia];
    }

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
        content: `You were mentioned in a forum post: ${post.title}`,
        metadata: { postId: post._id }
      })));
    }

    const populatedPost = await ForumPost.findById(post._id)
      .populate('author', selectUserPublic);

    res.status(201).json({ data: populatedPost });
  } catch (err) {
    console.error('createPost error:', err);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

exports.listPosts = async (req, res) => {
  try {
    const { q, author, category, sort, filter, userId } = req.query;
    const currentUserId = req.user._id;

    const query = { isDeleted: { $ne: true } };
    
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }
    if (author) query.author = author;
    if (category) query.category = category;
    if (userId === 'me') query.author = currentUserId;

    let sortSpec = { createdAt: -1 };
    if (sort === 'upvoted') {
      sortSpec = { upvotesCount: -1, createdAt: -1 };
    }

    const pipeline = [
      { $match: query },
      { 
        $addFields: { 
          upvotesCount: { $size: { $ifNull: ['$upvotes', []] } },
          reactionsCount: { $size: { $ifNull: ['$reactions', []] } },
          hasUserReacted: {
            $in: [currentUserId, { $ifNull: ['$reactions.user', []] }]
          },
          hasUserUpvoted: {
            $in: [currentUserId, { $ifNull: ['$upvotes', []] }]
          },
          hasUserBookmarked: {
            $in: [currentUserId, { $ifNull: ['$bookmarks', []] }]
          }
        } 
      }
    ];

    if (filter === 'unanswered') {
      pipeline.push({
        $match: { commentCount: { $eq: 0 } }
      });
    }

    pipeline.push({ $sort: sortSpec });

    const posts = await ForumPost.aggregate(pipeline);
    const ids = posts.map(p => p._id);
    const hydrated = await ForumPost.find({ _id: { $in: ids } })
      .select('-__v')
      .populate('author', selectUserPublic);

    const map = new Map(hydrated.map(h => [String(h._id), h]));
    const ordered = posts.map(p => {
      const doc = map.get(String(p._id));
      return {
        ...doc.toObject(),
        upvotesCount: p.upvotesCount,
        reactionsCount: p.reactionsCount,
        hasUserReacted: p.hasUserReacted,
        hasUserUpvoted: p.hasUserUpvoted,
        hasUserBookmarked: p.hasUserBookmarked
      };
    });

    res.json({ data: ordered });
  } catch (err) {
    console.error('listPosts error:', err);
    res.status(500).json({ message: 'Failed to list posts' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('author', selectUserPublic)
      .populate('mentions', 'name username')
      .populate('reactions.user', selectUserPublic);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comments = await ForumComment.find({ post: post._id })
      .sort({ createdAt: 1 })
      .populate('author', selectUserPublic);

    const currentUserId = req.user._id;
    const postData = {
      ...post.toObject(),
      hasUserReacted: post.reactions.some(r => r.user._id.toString() === currentUserId.toString()),
      hasUserUpvoted: post.upvotes.some(id => id.toString() === currentUserId.toString()),
      hasUserBookmarked: post.bookmarks.some(id => id.toString() === currentUserId.toString()),
      hasUserVoted: post.poll ? post.poll.voters.some(id => id.toString() === currentUserId.toString()) : false,
      canDelete: post.author && post.author._id.toString() === currentUserId.toString()
    };

    res.json({ data: { post: postData, comments } });
  } catch (err) {
    console.error('getPost error:', err);
    res.status(500).json({ message: 'Failed to get post' });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { reactionType = 'like' } = req.body;
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const uid = req.user._id;
    const existingReactionIndex = post.reactions.findIndex(r => 
      r.user.toString() === uid.toString()
    );

    if (existingReactionIndex > -1) {
      // Remove existing reaction
      post.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add new reaction
      post.reactions.push({ user: uid, type: reactionType });
      
      // Notify author unless anonymous or self
      if (post.author && post.author.toString() !== uid.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: uid,
          type: 'reaction',
          content: `${req.user.name} reacted to your forum post: ${post.title}`,
          metadata: { postId: post._id, reactionType }
        });
      }
    }

    await post.save();
    
    const hasReacted = existingReactionIndex === -1;
    res.json({ 
      data: { 
        reactions: post.reactions.length, 
        hasReacted,
        reactionType: hasReacted ? reactionType : null
      } 
    });
  } catch (err) {
    console.error('addReaction error:', err);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
};

exports.toggleUpvotePost = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const uid = req.user._id;
    const has = post.upvotes.some(id => id.toString() === uid.toString());
    if (has) {
      post.upvotes = post.upvotes.filter(id => id.toString() !== uid.toString());
    } else {
      post.upvotes.push(uid);
      if (post.author && post.author.toString() !== uid.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: uid,
          type: 'upvote',
          content: `${req.user.name} upvoted your forum post: ${post.title}`,
          metadata: { postId: post._id }
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

exports.sharePost = async (req, res) => {
  try {
    const { connectionIds, message } = req.body;
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const uid = req.user._id;
    
    // Verify all connectionIds are actual connections
    const user = await User.findById(uid).populate('connections', '_id');
    const validConnections = connectionIds.filter(id => 
      user.connections.some(conn => conn._id.toString() === id)
    );

    if (validConnections.length === 0) {
      return res.status(400).json({ message: 'No valid connections selected' });
    }

    // Add to post shares
    post.shares.push({
      user: uid,
      sharedWith: validConnections,
      sharedAt: new Date()
    });
    await post.save();

    // Notify shared connections
    await Promise.all(validConnections.map(connId => 
      Notification.create({
        recipient: connId,
        sender: uid,
        type: 'share',
        content: `${req.user.name} shared a forum post with you: ${post.title}`,
        metadata: { postId: post._id, message }
      })
    ));

    res.json({ 
      data: { 
        sharedCount: validConnections.length,
        message: `Post shared with ${validConnections.length} connection(s)` 
      } 
    });
  } catch (err) {
    console.error('sharePost error:', err);
    res.status(500).json({ message: 'Failed to share post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Check if user owns the post
    if (!post.author || post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    // Soft delete
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('deletePost error:', err);
    res.status(500).json({ message: 'Failed to delete post' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { content, parentComment, mentions, isAnonymous } = req.body;

    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await ForumComment.create({
      post: post._id,
      parentComment: parentComment || null,
      author: isAnonymous ? undefined : req.user._id,
      isAnonymous: Boolean(isAnonymous),
      content,
      mentions: Array.isArray(mentions) ? mentions : []
    });

    // Update post comment count
    await post.updateCommentCount();

    if (post.author && String(post.author) !== String(req.user._id)) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        content: `${req.user.name} commented on your forum post: ${post.title}`,
        metadata: { postId: post._id, commentId: comment._id }
      });
    }

    if (comment.mentions && comment.mentions.length > 0) {
      await Promise.all(comment.mentions.map(uid => Notification.create({
        recipient: uid,
        sender: req.user._id,
        type: 'mention',
        content: `${req.user.name} mentioned you in a forum comment`,
        metadata: { postId: post._id, commentId: comment._id }
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
      if (comment.author && comment.author.toString() !== uid.toString()) {
        await Notification.create({
          recipient: comment.author,
          sender: uid,
          type: 'upvote',
          content: `${req.user.name} upvoted your comment`,
          metadata: { commentId: comment._id }
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
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post || !post.poll) return res.status(404).json({ message: 'Poll not found' });

    const uid = req.user._id.toString();
    if (post.poll.voters.some(v => v.toString() === uid)) {
      return res.status(400).json({ message: 'You have already voted in this poll' });
    }

    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    post.poll.options[optionIndex].votes.push(req.user._id);
    post.poll.voters.push(req.user._id);
    await post.save();

    const totalVotes = post.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    const results = post.poll.options.map((opt, idx) => ({
      index: idx,
      text: opt.text,
      votes: opt.votes.length,
      percentage: totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0
    }));

    res.json({ data: { results, totalVotes, hasVoted: true } });
  } catch (err) {
    console.error('votePoll error:', err);
    res.status(500).json({ message: 'Failed to vote' });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
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

exports.getUserConnections = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('connections', 'name username avatarUrl role department')
      .select('connections');
    
    res.json({ data: user.connections || [] });
  } catch (err) {
    console.error('getUserConnections error:', err);
    res.status(500).json({ message: 'Failed to get connections' });
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
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const postAgg = await ForumPost.aggregate([
      { $match: { createdAt: { $gte: since }, author: { $ne: null }, isDeleted: { $ne: true } } },
      { $project: { 
        author: 1, 
        upvotesCount: { $size: { $ifNull: ['$upvotes', []] } },
        reactionsCount: { $size: { $ifNull: ['$reactions', []] } }
      } },
      { $group: { 
        _id: '$author', 
        postScore: { $sum: { $add: ['$upvotesCount', '$reactionsCount'] } }
      } }
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
      if (total >= 20) badges.push('MIT Legend');
      return { user: u, score: total, badges };
    }).sort((a, b) => b.score - a.score).slice(0, 20);

    res.json({ data: merged });
  } catch (err) {
    console.error('leaderboard error:', err);
    res.status(500).json({ message: 'Failed to load leaderboard' });
  }
};