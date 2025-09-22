const UnifiedPost = require('../models/UnifiedPost');
const UnifiedComment = require('../models/UnifiedComment');
const User = require('../models/User');
const Notification = require('../models/Notification');

const selectUserPublic = 'name username avatarUrl role department year industry current_job_title';

// Helper function to get user reaction
const getUserReaction = (reactions, userId) => {
  if (!userId) return null;
  for (const reaction of reactions || []) {
    if (reaction.users.some(id => id.toString() === userId.toString())) {
      return reaction.emoji;
    }
  }
  return null;
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      category = 'General', 
      tags = [], 
      mentions = [], 
      pollQuestion, 
      pollOptions = [], 
      pollExpiresAt,
      pollAllowMultipleVotes = false,
      visibility = 'public' 
    } = req.body;

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    // Handle media attachments
    const mediaAttachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const attachment = {
          url: `/uploads/${file.filename}`,
          type: file.mimetype.startsWith('image/') ? 'image' : 
                file.mimetype.startsWith('video/') ? 'video' : 'document',
          filename: file.originalname,
          size: file.size
        };
        mediaAttachments.push(attachment);
      });
    }

    // Create post object
    const postData = {
      author: req.user._id,
      title: title?.trim(),
      content: content.trim(),
      category,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      mentions: Array.isArray(mentions) ? mentions : [],
      mediaAttachments,
      visibility
    };

    // Add poll if provided
    if (pollQuestion && pollOptions.length >= 2) {
      postData.poll = {
        question: pollQuestion.trim(),
        options: pollOptions.map(text => ({ 
          text: text.trim(), 
          votes: [] 
        })),
        voters: [],
        expiresAt: pollExpiresAt ? new Date(pollExpiresAt) : null,
        allowMultipleVotes: Boolean(pollAllowMultipleVotes)
      };
    }

    const post = new UnifiedPost(postData);
    await post.save();

    // Populate author information
    await post.populate('author', selectUserPublic);

    // Create notifications for mentions
    if (post.mentions && post.mentions.length > 0) {
      const notificationPromises = post.mentions.map(mentionedUserId => 
        Notification.create({
          recipient: mentionedUserId,
          sender: req.user._id,
          type: 'mention',
          content: `You were mentioned in a post: ${post.title || 'Untitled Post'}`,
          relatedPost: post._id
        })
      );
      await Promise.all(notificationPromises);
    }

    res.status(201).json({ 
      success: true,
      data: post 
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

// Get all posts with pagination and filtering
exports.getPosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      author, 
      search, 
      sort = 'recent',
      userId // For user-specific reactions
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { isDeleted: false };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (author) {
      query.author = author;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort criteria
    let sortCriteria = { createdAt: -1 };
    if (sort === 'popular') {
      sortCriteria = { totalReactions: -1, commentCount: -1, createdAt: -1 };
    } else if (sort === 'trending') {
      // Trending: posts with high engagement in last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: yesterday };
      sortCriteria = { totalReactions: -1, commentCount: -1 };
    }

    // Get posts with pagination
    const posts = await UnifiedPost.find(query)
      .populate('author', selectUserPublic)
      .populate('mentions', 'name username')
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add user-specific data
    const postsWithUserData = posts.map(post => {
      const userReaction = getUserReaction(post.reactions, req.user?._id || userId);
      const totalReactions = (post.reactions || []).reduce((total, reaction) => total + reaction.users.length, 0);
      const hasUserVoted = post.poll && Array.isArray(post.poll.voters)
        ? post.poll.voters.some(v => v.toString() === (req.user?._id?.toString() || ''))
        : false;
      return {
        ...post,
        userReaction,
        totalReactions,
        // Frontend convenience fields
        reactionsCount: totalReactions,
        hasUserReacted: Boolean(userReaction),
        hasUserVoted: hasUserVoted
      };
    });

    // Get total count for pagination
    const total = await UnifiedPost.countDocuments(query);

    res.json({
      success: true,
      data: postsWithUserData,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: skip + posts.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
};

// Get single post with comments
exports.getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    const post = await UnifiedPost.findOne({ _id: id, isDeleted: false })
      .populate('author', selectUserPublic)
      .populate('mentions', 'name username')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Get comments with threading
    const comments = await UnifiedComment.find({ 
      post: id, 
      isDeleted: false 
    })
      .populate('author', selectUserPublic)
      .populate('replyTo', 'name username')
      .sort({ createdAt: 1 })
      .lean();

    // Organize comments into threads
    const commentMap = new Map();
    const rootComments = [];

    comments.forEach(comment => {
      comment.userReaction = getUserReaction(comment.reactions, userId);
      comment.totalReactions = comment.reactions.reduce((total, reaction) => total + reaction.users.length, 0);
      commentMap.set(comment._id.toString(), comment);
    });

    comments.forEach(comment => {
      if (comment.parentComment) {
        const parent = commentMap.get(comment.parentComment.toString());
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    // Increment view count
    await UnifiedPost.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    // Add user-specific data to post
    post.userReaction = getUserReaction(post.reactions, req.user?._id || userId);
    post.totalReactions = (post.reactions || []).reduce((total, reaction) => total + reaction.users.length, 0);
    post.reactionsCount = post.totalReactions;
    post.hasUserReacted = Boolean(post.userReaction);
    post.hasUserVoted = post.poll && Array.isArray(post.poll.voters)
      ? post.poll.voters.some(v => v.toString() === (req.user?._id?.toString() || ''))
      : false;

    res.json({
      success: true,
      data: {
        post,
        comments: rootComments
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Failed to fetch post' });
  }
};

// Add emoji reaction to post
exports.addReaction = async (req, res) => {
  try {
    console.log('Add reaction request:', { params: req.params, body: req.body, user: req.user?._id });
    const { id } = req.params;
    let { emoji } = req.body;
    const userId = req.user._id;

    const validEmojis = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
    // Backward compatibility: support { reactionType: 'like' }
    if (!emoji && req.body.reactionType) {
      emoji = req.body.reactionType;
    }
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji reaction' });
    }

    const post = await UnifiedPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Remove user from all other reactions first
    post.reactions.forEach(reaction => {
      reaction.users = reaction.users.filter(id => id.toString() !== userId.toString());
    });

    // Add to the specified reaction
    let reactionExists = false;
    post.reactions.forEach(reaction => {
      if (reaction.emoji === emoji) {
        reaction.users.push(userId);
        reactionExists = true;
      }
    });

    // If reaction doesn't exist, create it
    if (!reactionExists) {
      post.reactions.push({
        emoji,
        users: [userId]
      });
    }

    await post.save();

    // Notify post author (unless it's their own post)
    if (post.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: userId,
        type: 'reaction',
        content: `Someone reacted ${emoji} to your post`,
        relatedPost: post._id
      });
    }

    // Calculate reaction summary
    const reactionSummary = post.reactions
      .filter(reaction => reaction.users.length > 0)
      .map(reaction => `${getEmojiSymbol(reaction.emoji)} ${reaction.users.length}`)
      .join(' ');

    res.json({
      success: true,
      data: {
        reactions: post.reactions,
        totalReactions: post.reactions.reduce((total, reaction) => total + reaction.users.length, 0),
        userReaction: emoji,
        reactionSummary,
        hasUserReacted: true
      }
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
};

// Create comment
exports.createComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      content, 
      parentComment, 
      replyTo, 
      mentions = [] 
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await UnifiedPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // No authorization check needed here - any authenticated user can comment on any post

    // Handle media attachments for comments
    const mediaAttachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const attachment = {
          url: `/uploads/${file.filename}`,
          type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          filename: file.originalname,
          size: file.size
        };
        mediaAttachments.push(attachment);
      });
    }

    const commentData = {
      post: id,
      author: req.user._id,
      content: content.trim(),
      parentComment: parentComment || null,
      replyTo: replyTo || null,
      mentions: Array.isArray(mentions) ? mentions : [],
      mediaAttachments
    };

    const comment = new UnifiedComment(commentData);
    await comment.save();

    // Populate author information
    await comment.populate('author', selectUserPublic);
    if (replyTo) {
      await comment.populate('replyTo', 'name username');
    }

    // Update comment count on post
    await UnifiedPost.findByIdAndUpdate(id, { $inc: { commentCount: 1 } });

    // Create notifications
    const notifications = [];

    // Notify post author (unless it's their own comment)
    if (post.author.toString() !== req.user._id.toString()) {
      notifications.push(
        Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'comment',
          content: `New comment on your post`,
          relatedPost: post._id,
          relatedComment: comment._id
        })
      );
    }

    // Notify replied-to user
    if (replyTo && replyTo.toString() !== req.user._id.toString()) {
      notifications.push(
        Notification.create({
          recipient: replyTo,
          sender: req.user._id,
          type: 'reply',
          content: `Someone replied to your comment`,
          relatedPost: post._id,
          relatedComment: comment._id
        })
      );
    }

    // Notify mentioned users
    if (mentions.length > 0) {
      mentions.forEach(mentionedUserId => {
        if (mentionedUserId.toString() !== req.user._id.toString()) {
          notifications.push(
            Notification.create({
              recipient: mentionedUserId,
              sender: req.user._id,
              type: 'mention',
              content: `You were mentioned in a comment`,
              relatedPost: post._id,
              relatedComment: comment._id
            })
          );
        }
      });
    }

    await Promise.all(notifications);

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Failed to create comment' });
  }
};

// Add reaction to comment
exports.addCommentReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const validEmojis = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji reaction' });
    }

    const comment = await UnifiedComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Remove user from all other reactions first
    comment.reactions.forEach(reaction => {
      reaction.users = reaction.users.filter(id => id.toString() !== userId.toString());
    });

    // Add to the specified reaction
    let reactionExists = false;
    comment.reactions.forEach(reaction => {
      if (reaction.emoji === emoji) {
        reaction.users.push(userId);
        reactionExists = true;
      }
    });

    // If reaction doesn't exist, create it
    if (!reactionExists) {
      comment.reactions.push({
        emoji,
        users: [userId]
      });
    }

    await comment.save();

    // Notify comment author (unless it's their own reaction)
    if (comment.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: comment.author,
        sender: userId,
        type: 'reaction',
        content: `Someone reacted ${emoji} to your comment`,
        relatedComment: comment._id
      });
    }

    res.json({
      success: true,
      data: {
        reactions: comment.reactions,
        totalReactions: comment.reactions.reduce((total, reaction) => total + reaction.users.length, 0),
        userReaction: emoji
      }
    });
  } catch (error) {
    console.error('Add comment reaction error:', error);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
};

// Vote in poll
exports.votePoll = async (req, res) => {
  try {
    console.log('Vote poll request:', { params: req.params, body: req.body, user: req.user?._id });
    const { id } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user._id;

    const post = await UnifiedPost.findById(id);
    if (!post || !post.poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // No expiry restriction per requirements (remove timer)

    // Check if user has already voted for this specific option
    const hasVotedForThisOption = post.poll.options[optionIndex].votes.some(
      voterId => voterId.toString() === userId.toString()
    );

    // If user already voted for this option, remove the vote (deselection)
    if (hasVotedForThisOption) {
      // Remove user from this option's votes
      post.poll.options[optionIndex].votes = post.poll.options[optionIndex].votes.filter(
        voterId => voterId.toString() !== userId.toString()
      );
      
      // Remove user from voters list
      post.poll.voters = post.poll.voters.filter(
        voterId => voterId.toString() !== userId.toString()
      );
      
      await post.save();
      
      // Calculate results with percentages
      const results = post.poll.options.map((option, index) => ({
        index,
        text: option.text,
        votes: option.votes.length,
        percentage: post.poll.voters.length > 0 ? 
          Math.round((option.votes.length / post.poll.voters.length) * 100) : 0
      }));
      
      return res.json({
        success: true,
        data: {
          poll: post.poll,
          results,
          totalVotes: post.poll.voters.length,
          userVoted: false
        }
      });
    }
    
    // Check if user has already voted for a different option
    const hasVoted = post.poll.voters.some(voterId => voterId.toString() === userId.toString());
    if (hasVoted && !post.poll.allowMultipleVotes) {
      return res.status(400).json({ message: 'You have already voted in this poll' });
    }

    // Validate option index
    if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    // Add vote
    post.poll.options[optionIndex].votes.push(userId);
    post.poll.voters.push(userId);

    await post.save();

    // Calculate results with percentages
    const results = post.poll.options.map((option, index) => ({
      index,
      text: option.text,
      votes: option.votes.length,
      percentage: post.poll.voters.length > 0 ? 
        Math.round((option.votes.length / post.poll.voters.length) * 100) : 0
    }));

    res.json({
      success: true,
      data: {
        poll: post.poll,
        results,
        totalVotes: post.poll.voters.length,
        userVoted: true
      }
    });
  } catch (error) {
    console.error('Vote poll error:', error);
    res.status(500).json({ message: 'Failed to vote in poll' });
  }
};

// Update post disabled per requirements: no edit after publish
exports.updatePost = async (req, res) => {
  return res.status(403).json({ message: 'Editing posts is disabled. You can delete anytime.' });
};

// Delete post (soft delete)
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await UnifiedPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author or admin
    if (post.author.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Soft delete
    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = userId;
    await post.save();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
};

// Delete comment (soft delete)
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await UnifiedComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author or admin
    if (comment.author.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.deletedBy = userId;
    await comment.save();

    // Update comment count on post
    await UnifiedPost.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};

// Helper function to get emoji symbol
const getEmojiSymbol = (emoji) => {
  const emojiMap = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😠'
  };
  return emojiMap[emoji] || emoji;
};
