import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { unifiedForumAPI } from '../../services/unifiedForumAPI';
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiMoreHorizontal,
  FiSmile,
  FiImage,
  FiPlay,
  FiFile,
  FiTrash2,
  FiEdit,
  FiFlag,
  FiClock,
  FiUsers,
  FiChevronDown,
  FiChevronUp,
  FiCheck
} from 'react-icons/fi';

const EMOJI_REACTIONS = [
  { name: 'like', emoji: '👍', label: 'Like' },
  { name: 'love', emoji: '❤️', label: 'Love' },
  { name: 'laugh', emoji: '😂', label: 'Laugh' },
  { name: 'wow', emoji: '😮', label: 'Wow' },
  { name: 'sad', emoji: '😢', label: 'Sad' },
  { name: 'angry', emoji: '😠', label: 'Angry' }
];

const UnifiedPostCard = ({ post, onUpdate, currentUserId, user }) => {
  console.log('UnifiedPostCard received currentUserId:', currentUserId);
  console.log('UnifiedPostCard received user:', user);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [showPollResults, setShowPollResults] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [postData, setPostData] = useState(post);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditable, setIsEditable] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const commentInputRef = useRef(null);

  // Update post data when prop changes
  useEffect(() => {
    setPostData(post);
    
    // Initialize poll results state based on whether user has voted
    if (post.poll && currentUserId) {
      const hasVoted = post.poll.voters.some(voter => voter.toString() === currentUserId.toString());
      setShowPollResults(hasVoted);
    }

    // Check if post is editable (within 1 minute)
    if (post.editWindowExpires && currentUserId && post.author._id === currentUserId) {
      const now = new Date();
      const expiresAt = new Date(post.editWindowExpires);
      const timeLeft = Math.max(0, expiresAt - now);
      
      setIsEditable(timeLeft > 0);
      setTimeRemaining(Math.ceil(timeLeft / 1000));
      
      // Update time remaining every second
      const timer = setInterval(() => {
        const newTimeLeft = Math.max(0, expiresAt - new Date());
        setTimeRemaining(Math.ceil(newTimeLeft / 1000));
        if (newTimeLeft <= 0) {
          setIsEditable(false);
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setIsEditable(false);
    }
  }, [post, currentUserId]);

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return new Date(date).toLocaleDateString();
  };

  // Handle emoji reaction
  const handleReaction = async (emojiName) => {
    if (isReacting) return;
    
    setIsReacting(true);
    try {
      const response = await unifiedForumAPI.addReaction(postData._id, emojiName);
      // Update local state immediately for real-time feel
      setPostData(prev => ({
        ...prev,
        reactions: response.data.data.reactions,
        userReaction: response.data.data.userReaction,
        totalReactions: response.data.data.totalReactions
      }));
      onUpdate?.();
    } catch (error) {
      console.error('Error adding reaction:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add reaction. Please try again.';
      alert(errorMessage);
    } finally {
      setIsReacting(false);
      setShowReactionPicker(false);
    }
  };

  // Handle poll vote
  const handlePollVote = async (optionIndex) => {
    try {
      const response = await unifiedForumAPI.votePoll(postData._id, optionIndex);
      
      // Update local state with the complete poll data from backend
      setPostData(prev => ({
        ...prev,
        poll: response.data.data.poll
      }));
      
      // Show results if user has voted, hide results if user deselected their vote
      setShowPollResults(response.data.data.userVoted);
      
      // Notify parent component to update
      onUpdate?.();
    } catch (error) {
      console.error('Error voting in poll:', error);
      const errorMessage = error.response?.data?.message || 'Failed to vote. Please try again.';
      alert(errorMessage);
    }
  };

  // Handle edit post
  const handleEditPost = () => {
    setEditTitle(postData.title || '');
    setEditContent(postData.content || '');
    setIsEditing(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      const response = await unifiedForumAPI.updatePost(postData._id, {
        title: editTitle,
        content: editContent
      });
      
      setPostData(response.data.data);
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  // Handle delete post
  const handleDeletePost = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await unifiedForumAPI.deletePost(postData._id);
        onUpdate?.();
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post. Please try again.');
      }
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isCommenting) return;

    setIsCommenting(true);
    try {
      // Create the comment
      await unifiedForumAPI.createComment(postData._id, { 
        content: commentText,
        parentComment: replyingTo?.commentId || null,
        replyTo: replyingTo?.userId || null
      });
      
      // Always consider the comment creation successful
      // Reset form state
      setCommentText('');
      setReplyText('');
      setReplyingTo(null);
      setShowCommentInput(false);
      
      // Refresh the post data through the parent component
      // This ensures we get the latest comments from the server
      onUpdate?.();
      
    } catch (error) {
      console.error('Error creating comment:', error);
      // Only show error for network failures, not for server responses
      if (!error.response) {
        alert('Network error. Please check your connection and try again.');
      } else {
        // Even if there's an error response, still try to refresh
        onUpdate?.();
      }
    } finally {
      setIsCommenting(false);
    }
  };

  // Handle comment reaction
  const handleCommentReaction = async (commentId, emojiName) => {
    try {
      await unifiedForumAPI.addCommentReaction(commentId, emojiName);
      onUpdate?.();
    } catch (error) {
      console.error('Error adding comment reaction:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add reaction. Please try again.';
      alert(errorMessage);
    }
  };

  // Handle share post
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: postData.title || 'Check out this post',
          text: postData.content,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        const postUrl = `${window.location.origin}/forum#post-${postData._id}`;
        await navigator.clipboard.writeText(postUrl);
        alert('Post link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      // Fallback: copy to clipboard
      try {
        const postUrl = `${window.location.origin}/forum#post-${postData._id}`;
        await navigator.clipboard.writeText(postUrl);
        alert('Post link copied to clipboard!');
      } catch (clipboardError) {
        alert('Unable to share post. Please try again.');
      }
    }
  };

  // Toggle comment expansion
  const toggleCommentExpansion = (commentId) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  // Start reply
  const startReply = (comment) => {
    setReplyingTo({
      commentId: comment._id,
      userId: comment.author._id,
      userName: comment.author.name
    });
    setShowCommentInput(true);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  // Get user's current reaction
  const getUserReaction = () => {
    if (!currentUserId) return null;
    for (const reaction of postData.reactions || []) {
      if (reaction.users.some(userId => userId.toString() === currentUserId.toString())) {
        return reaction.emoji;
      }
    }
    return null;
  };

  // Calculate total reactions
  const getTotalReactions = () => {
    return (postData.reactions || []).reduce((total, reaction) => total + reaction.users.length, 0);
  };

  // Get reaction summary
  const getReactionSummary = () => {
    const reactions = postData.reactions || [];
    const summary = [];
    
    reactions.forEach(reaction => {
      if (reaction.users.length > 0) {
        const emojiSymbol = EMOJI_REACTIONS.find(e => e.name === reaction.emoji)?.emoji || '👍';
        summary.push(`${emojiSymbol} ${reaction.users.length}`);
      }
    });
    
    return summary.join(' ');
  };

  const userReaction = getUserReaction();
  const totalReactions = getTotalReactions();
  const reactionSummary = getReactionSummary();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Post Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Link 
              to={`/profile/${postData.author?.username || postData.author?._id}`}
              className="flex-shrink-0"
            >
              <img
                src={postData.author?.avatarUrl || '/default-avatar.png'}
                alt={postData.author?.name}
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = '/default-avatar.png';
                }}
              />
            </Link>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Link 
                  to={`/profile/${postData.author?.username || postData.author?._id}`}
                  className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  {postData.author?.name}
                </Link>
                {postData.author?.role && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                    {postData.author.role}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{formatTimeAgo(postData.createdAt)}</span>
                <span>•</span>
                <span className="capitalize">{postData.visibility}</span>
                {postData.category && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 font-medium">{postData.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditable && (
              <div className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                <FiClock className="w-3 h-3" />
                <span>{timeRemaining}s left to edit</span>
              </div>
            )}
            
            <div className="relative">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FiMoreHorizontal className="w-5 h-5 text-gray-400" />
              </button>
              
              {/* Dropdown menu */}
              {isEditable && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleEditPost}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FiEdit className="w-4 h-4 mr-2" />
                      Edit Post
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <FiTrash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter post title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="What's on your mind?"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <>
            {postData.title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{postData.title}</h3>
            )}
            
            <div className="text-gray-900 whitespace-pre-wrap mb-4">
              {postData.content}
            </div>
          </>
        )}

        {/* Tags */}
        {postData.tags && postData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {postData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Media Attachments */}
        {postData.mediaAttachments && postData.mediaAttachments.length > 0 && (
          <div className="mb-4">
            {postData.mediaAttachments.length === 1 ? (
              // Single media item
              <div>
                {postData.mediaAttachments[0].type === 'image' ? (
                  <img
                    src={postData.mediaAttachments[0].url}
                    alt="Post attachment"
                    className="w-full max-h-96 object-cover rounded-lg"
                  />
                ) : postData.mediaAttachments[0].type === 'video' ? (
                  <div className="relative">
                    <video
                      src={postData.mediaAttachments[0].url}
                      controls
                      className="w-full max-h-96 object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FiFile className="w-8 h-8 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{postData.mediaAttachments[0].filename}</div>
                      <div className="text-sm text-gray-500">
                        {(postData.mediaAttachments[0].size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Multiple media items in grid
              <div className={`grid gap-2 ${
                postData.mediaAttachments.length === 2 ? 'grid-cols-2' :
                postData.mediaAttachments.length === 3 ? 'grid-cols-2' :
                postData.mediaAttachments.length === 4 ? 'grid-cols-2' :
                'grid-cols-2'
              }`}>
                {postData.mediaAttachments.map((media, index) => (
                  <div key={index} className="relative">
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt="Post attachment"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : media.type === 'video' ? (
                      <div className="relative">
                        <video
                          src={media.url}
                          controls
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg h-48">
                        <FiFile className="w-8 h-8 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{media.filename}</div>
                          <div className="text-sm text-gray-500">
                            {(media.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                    )}
                    {postData.mediaAttachments.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold">
                          +{postData.mediaAttachments.length - 4} more
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Poll */}
        {postData.poll && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">{postData.poll.question}</h4>
            
            {!showPollResults && currentUserId && !postData.poll.voters?.some(voter => voter.toString() === currentUserId.toString()) && (!postData.poll.expiresAt || new Date() < new Date(postData.poll.expiresAt)) ? (
              <div className="space-y-2">
                {postData.poll.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handlePollVote(index)}
                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            ) : postData.poll.expiresAt && new Date() >= new Date(postData.poll.expiresAt) ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">This poll has expired</p>
                <div className="space-y-3 mt-4">
                  {postData.poll.options.map((option, index) => {
                    const percentage = postData.poll.voters.length > 0 
                      ? Math.round((option.votes.length / postData.poll.voters.length) * 100)
                      : 0;
                    
                    return (
                      <div key={index} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{option.text}</span>
                          <span className="text-sm text-gray-500">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gray-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{option.votes.length} votes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {postData.poll.options.map((option, index) => {
                  const percentage = postData.poll.voters.length > 0 
                    ? Math.round((option.votes.length / postData.poll.voters.length) * 100)
                    : 0;
                  const hasVoted = postData.poll.voters.some(voter => voter.toString() === currentUserId?.toString());
                  const userVotedForThis = hasVoted && option.votes.some(vote => vote.toString() === currentUserId?.toString());
                  
                  return (
                    <div key={index} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{option.text}</span>
                        <span className="text-sm text-gray-500">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            userVotedForThis ? 'bg-indigo-600' : 'bg-gray-300'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">{option.votes.length} votes</span>
                        {userVotedForThis && (
                          <FiCheck className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-200">
                  <span>{postData.poll.voters.length} total votes</span>
                  {postData.poll.expiresAt && (
                    <span>Expires {formatTimeAgo(postData.poll.expiresAt)}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      {(totalReactions > 0 || postData.commentCount > 0 || postData.shareCount > 0) && (
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              {totalReactions > 0 && (
                <div className="flex items-center space-x-1">
                  <span>{reactionSummary}</span>
                </div>
              )}
              {postData.commentCount > 0 && (
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="hover:text-gray-700 transition-colors"
                >
                  {postData.commentCount} comment{postData.commentCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
            
            {postData.shareCount > 0 && (
              <span>{postData.shareCount} share{postData.shareCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          {/* Reaction Button */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                userReaction 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">
                {userReaction ? EMOJI_REACTIONS.find(e => e.name === userReaction)?.emoji : '👍'}
              </span>
              <span className="font-medium">React</span>
            </button>
            
            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                >
                  <div className="flex space-x-2">
                    {EMOJI_REACTIONS.map(({ name, emoji, label }) => (
                      <button
                        key={name}
                        onClick={() => handleReaction(name)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={label}
                        disabled={isReacting}
                      >
                        <span className="text-xl">{emoji}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comment Button */}
          <button
            onClick={() => {
              setShowComments(!showComments);
              if (!showComments) {
                setTimeout(() => commentInputRef.current?.focus(), 100);
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiMessageCircle className="w-5 h-5" />
            <span className="font-medium">Comment</span>
          </button>

          {/* Share Button */}
          <button 
            onClick={handleShare}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiShare2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-100"
          >
            {/* Comment Input */}
            <div className="p-4">
              <form onSubmit={handleCommentSubmit} className="flex items-start space-x-3">
                <img
                  src={user?.avatarUrl || '/default-avatar.png'}
                  alt="Your avatar"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <textarea
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Write a comment..."}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="2"
                  />
                  {replyingTo && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">
                        Replying to {replyingTo.userName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-end space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCommentText('');
                        setReplyText('');
                        setReplyingTo(null);
                      }}
                      className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isCommenting}
                      className="px-4 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCommenting ? 'Posting...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Comments List */}
            {postData.comments && postData.comments.length > 0 && (
              <div className="px-4 pb-4 space-y-4 max-h-96 overflow-y-auto">
                {postData.comments.map((comment) => (
                  <div key={comment._id} className="flex items-start space-x-3">
                    <img
                      src={comment.author?.avatarUrl || '/default-avatar.png'}
                      alt={comment.author?.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {comment.author?.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{comment.content}</p>
                      </div>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center space-x-4 mt-1 ml-3">
                        <button 
                          onClick={() => handleCommentReaction(comment._id, 'like')}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          👍 Like
                        </button>
                        <button 
                          onClick={() => startReply(comment)}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 ml-4 space-y-2">
                          {comment.replies.map((reply) => (
                            <div key={reply._id} className="flex items-start space-x-2">
                              <img
                                src={reply.author?.avatarUrl || '/default-avatar.png'}
                                alt={reply.author?.name}
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                              />
                              <div className="bg-gray-100 rounded-lg px-3 py-2 flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900 text-xs">
                                    {reply.author?.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatTimeAgo(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-900">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedPostCard;
