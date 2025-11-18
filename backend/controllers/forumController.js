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
    const { title, content, category, tags, mentions, pollQuestion, pollOptions, mediaLinks } = req.body;

    const post = new ForumPost({
      author: req.user._id,
      isAnonymous: false,
      title,
      content,
      category,
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : []),
      mentions: []
    });

    // Handle multiple files (Cloudinary URLs)
    if (req.files && req.files.length > 0) {
      post.media = req.files.map(file => {
        const url = file.path || file.secure_url;
        const lower = (file.mimetype || '').toLowerCase();
        const type = lower.startsWith('image/')
          ? 'image'
          : lower.startsWith('video/')
          ? 'video'
          : lower.startsWith('audio/')
          ? 'audio'
          : 'document';
        return { url, type };
      });
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

    // Resolve mentions from explicit array and content text (@username or ObjectId)
    try {
      const set = new Set();
      if (Array.isArray(mentions)) {
        for (const m of mentions) {
          if (!m) continue;
          const s = String(m).trim();
          if (/^[0-9a-fA-F]{24}$/.test(s)) set.add(s);
          else set.add(s.replace(/^@/, ''));
        }
      }
      const contentMatches = String(content || '').match(/@([a-zA-Z0-9_]+)/g) || [];
      contentMatches.forEach(m => set.add(m.replace('@', '')));
      const raw = Array.from(set);
      const ids = raw.filter(x => /^[0-9a-fA-F]{24}$/.test(x));
      const usernames = raw.filter(x => !/^[0-9a-fA-F]{24}$/.test(x));
      let users = [];
      if (usernames.length > 0) {
        users = await User.find({ username: { $in: usernames } }).select('_id');
      }
      post.mentions = [...ids, ...users.map(u => u._id)];
    } catch (e) {
      post.mentions = [];
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
          reactionCounts: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$reactions.type'] },
                as: 'type',
                in: {
                  k: '$$type',
                  v: {
                    $size: {
                      $filter: {
                        input: '$reactions',
                        cond: { $eq: ['$$this.type', '$$type'] }
                      }
                    }
                  }
                }
              }
            }
          },
          userReaction: {
            $let: {
              vars: {
                userReactionObj: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$reactions',
                        cond: { $eq: ['$$this.user', currentUserId] }
                      }
                    },
                    0
                  ]
                }
              },
              in: { $ifNull: ['$$userReactionObj.type', null] }
            }
          },
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
        reactionCounts: p.reactionCounts || {},
        userReaction: p.userReaction,
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
    const reactionCounts = (post.reactions || []).reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
    const userReaction = post.reactions.find(r => r.user._id.toString() === currentUserId.toString())?.type || null;
    const postData = {
      ...post.toObject(),
      reactionCounts,
      userReaction,
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
    // Ensure reactions array exists
    if (!Array.isArray(post.reactions)) post.reactions = [];
    const existingReactionIndex = post.reactions.findIndex(r => r && r.user && r.user.toString() === uid.toString());

    if (existingReactionIndex > -1) {
      const currentType = post.reactions[existingReactionIndex].type;
      if (currentType === reactionType) {
        // Toggle off same reaction
        post.reactions.splice(existingReactionIndex, 1);
      } else {
        // Switch to a different reaction type (no duplicate by same user)
        post.reactions[existingReactionIndex].type = reactionType;
      }
    } else {
      // Add new reaction
      post.reactions.push({ user: uid, type: reactionType });
      // Notify author unless self
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

    // Sanitize any legacy reaction types to avoid validation errors
    const allowedReactions = new Set(['like', 'love', 'laugh', 'wow', 'sad', 'angry']);
    post.reactions = (post.reactions || []).map(r => ({
      user: r.user,
      type: allowedReactions.has(r.type) ? r.type : 'like'
    }));

    // Persist safely
    await post.save();

    // Compute per-type counts and ensure all keys exist for frontend mapping
    const counts = (post.reactions || []).reduce((acc, r) => {
      const t = (r && r.type) ? r.type : 'like';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    // Emit real-time reaction update with breakdown
    try {
      if (global.io) {
        global.io.to(`forum_post_${post._id}`).emit('forum:reaction_updated', {
          postId: post._id.toString(),
          total: post.reactions.length,
          counts,
          userReaction: hasReacted ? reactionType : null
        });
      }
    } catch (e) {
      console.error('addReaction emit error:', e);
    }

    const hasReacted = (post.reactions || []).some(r => r && r.user && r.user.toString() === uid.toString());
    res.json({ 
      data: { 
        total: post.reactions.length,
        counts,
        hasReacted,
        reactionType: hasReacted ? reactionType : null
      } 
    });
  } catch (err) {
    console.error('addReaction error:', err);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
};

// Get reaction summary for a post (total, per-type counts, and current user's reaction)
exports.getReactionSummary = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const counts = (post.reactions || []).reduce((acc, r) => {
      const t = r.type || 'like';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const userReaction = (post.reactions || []).find(r => String(r.user) === String(req.user._id))?.type || null;

    res.json({ data: { total: post.reactions?.length || 0, counts, userReaction } });
  } catch (err) {
    console.error('getReactionSummary error:', err);
    res.status(500).json({ message: 'Failed to get reactions' });
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
    const { connectionIds = [], message } = req.body;
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const uid = req.user._id;

    // Verify all connectionIds are actual connections
    const user = await User.findById(uid).select('connections').populate('connections', '_id');
    const myConnections = Array.isArray(user?.connections) ? user.connections : [];
    const incoming = Array.isArray(connectionIds) ? connectionIds : [];
    const validConnections = incoming.filter(id => myConnections.some(conn => conn._id.toString() === id));

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

    // Notify shared connections and create chat message per recipient
    const Message = require('../models/Message');
    const { v4: uuidv4 } = require('uuid');
    await Promise.all(validConnections.map(async (connId) => {
      await Notification.create({
        recipient: connId,
        sender: uid,
        type: 'share',
        content: `${req.user.name} shared a forum post with you: ${post.title}`,
        metadata: { postId: post._id, message }
      });
      
      // Generate threadId for this conversation
      const participants = [String(uid), String(connId)].sort();
      const threadId = `${participants[0]}_${participants[1]}`;
      
      // Create chat message with metadata for forum post
      // Include the forum link in content as fallback for rendering
      const forumLink = `/forum/${post._id}`;
      const messageContent = message 
        ? `${message}\n\n${post.title}\n${forumLink}` 
        : `${post.title}\n${forumLink}`;
      
      const chat = await Message.create({
        from: uid,
        to: connId,
        content: messageContent,
        threadId: threadId,
        clientKey: uuidv4(),
        metadata: {
          sharedPost: {
            postId: post._id,
            preview: post.content ? post.content.substring(0, 100) : post.title,
            imageUrl: post.media && post.media.length > 0 ? post.media[0].url : null,
            postType: 'forum'
          }
        }
      });
      
      // Emit chat event to recipient
      try {
        if (global.io) {
          global.io.to(String(connId)).emit('new_message', {
            id: chat._id,
            senderId: String(uid),
            receiverId: String(connId),
            content: chat.content,
            threadId: threadId,
            metadata: chat.metadata,
            timestamp: chat.createdAt,
            status: 'sent'
          });
        }
      } catch (e) {
        console.error('Socket emit error:', e);
      }
    }));

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
    const { content, parentComment, mentions } = req.body;

    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Resolve mentions
    let mentionIds = [];
    try {
      const set = new Set();
      if (Array.isArray(mentions)) {
        for (const m of mentions) {
          if (!m) continue; const s = String(m).trim();
          if (/^[0-9a-fA-F]{24}$/.test(s)) set.add(s); else set.add(s.replace(/^@/, ''));
        }
      }
      const matches = String(content || '').match(/@([a-zA-Z0-9_]+)/g) || [];
      matches.forEach(m => set.add(m.replace('@', '')));
      const raw = Array.from(set);
      const ids = raw.filter(x => /^[0-9a-fA-F]{24}$/.test(x));
      const usernames = raw.filter(x => !/^[0-9a-fA-F]{24}$/.test(x));
      let users = [];
      if (usernames.length > 0) users = await User.find({ username: { $in: usernames } }).select('_id');
      mentionIds = [...ids, ...users.map(u => u._id)];
    } catch (e) { mentionIds = []; }

    const comment = await ForumComment.create({
      post: post._id,
      parentComment: parentComment || null,
      author: req.user._id,
      isAnonymous: false,
      content,
      mentions: mentionIds
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
    if (!Array.isArray(comment.upvotes)) comment.upvotes = [];
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
    res.status(500).json({ message: 'Failed to toggle upvote', error: String(err && err.message ? err.message : err) });
  }
};

// Toggle/Switch emoji reaction on a comment
exports.reactToComment = async (req, res) => {
  try {
    const { type = 'like' } = req.body; // one of ['like','love','laugh','wow','sad','angry']
    const comment = await ForumComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const uid = req.user._id;
    if (!Array.isArray(comment.reactions)) comment.reactions = [];
    const idx = comment.reactions.findIndex(r => r.user.toString() === uid.toString());
    if (idx > -1) {
      if (comment.reactions[idx].type === type) {
        // Toggle off
        comment.reactions.splice(idx, 1);
      } else {
        // Switch type
        comment.reactions[idx].type = type;
      }
    } else {
      comment.reactions.push({ user: uid, type });
    }

    await comment.save();

    const counts = (comment.reactions || []).reduce((acc, r) => {
      const t = r.type || 'like';
      acc[t] = (acc[t] || 0) + 1; return acc;
    }, {});

    res.json({ data: { total: comment.reactions.length, counts } });
  } catch (err) {
    console.error('reactToComment error:', err);
    res.status(500).json({ message: 'Failed to react to comment', error: String(err && err.message ? err.message : err) });
  }
};

exports.votePoll = async (req, res) => {
  try {
    const post = await ForumPost.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post || !post.poll) return res.status(404).json({ message: 'Poll not found' });

    const uid = req.user._id.toString();
    // Treat allowMultipleVotes as true by default if undefined
    const allowMultiple = post.poll.allowMultipleVotes !== false;

    const { optionIndex } = req.body;
    const indices = Array.isArray(optionIndex) ? optionIndex : [optionIndex];

    // Validate indices
    if (!indices.every(i => typeof i === 'number' && i >= 0 && i < post.poll.options.length)) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    if (!allowMultiple) {
      // Single-vote: block if already voted anywhere
      if (post.poll.voters.some(v => v.toString() === uid)) {
        return res.status(400).json({ message: 'You have already voted in this poll' });
      }
      // Record single vote (first index only)
      const i = indices[0];
      post.poll.options[i].votes.push(req.user._id);
      post.poll.voters.push(req.user._id);
    } else {
      // Multi-select: allow voting for multiple options; avoid duplicates
      let votedAtLeastOne = false;
      indices.forEach(i => {
        const already = post.poll.options[i].votes.some(v => v.toString() === uid);
        if (!already) {
          post.poll.options[i].votes.push(req.user._id);
          votedAtLeastOne = true;
        }
      });
      if (votedAtLeastOne && !post.poll.voters.some(v => v.toString() === uid)) {
        post.poll.voters.push(req.user._id);
      }
    }

    await post.save();

    const totalVotes = post.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    const results = post.poll.options.map((opt, idx) => ({
      index: idx,
      text: opt.text,
      votes: opt.votes.length,
      percentage: totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0
    }));

    // Emit real-time update to all viewers of this post
    try {
      if (global.io) {
        global.io.to(`forum_post_${post._id}`).emit('forum:poll_updated', {
          postId: post._id.toString(),
          results,
          totalVotes
        });
      }
    } catch (e) {
      console.error('votePoll emit error:', e);
    }

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
    
    // Filter to show only student connections (alumni and teachers can't access forum)
    const studentConnections = (user.connections || []).filter(conn => conn.role === 'student');
    
    res.json({ data: studentConnections });
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

// Get voters for a specific poll option
exports.getPollOptionVoters = async (req, res) => {
  try {
    const { id, index } = req.params;
    const post = await ForumPost.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!post || !post.poll) return res.status(404).json({ message: 'Poll not found' });
    const optionIndex = parseInt(index, 10);
    if (Number.isNaN(optionIndex) || optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }
    const voterIds = post.poll.options[optionIndex].votes || [];
    const voters = await User.find({ _id: { $in: voterIds } }).select(selectUserPublic);
    res.json({ data: voters });
  } catch (err) {
    console.error('getPollOptionVoters error:', err);
    res.status(500).json({ message: 'Failed to load voters' });
  }
};