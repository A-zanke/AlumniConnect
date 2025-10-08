import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiThumbsUp, 
  FiHeart, 
  FiAward, 
  FiTrendingUp, 
  FiZap, 
  FiHelpCircle,
  FiMessageCircle, 
  FiShare2, 
  FiBookmark, 
  FiMoreVertical,
  FiTrash2, 
  FiEdit3,
  FiX,
  FiSend,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiEye,
  FiUsers
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { getAvatarUrl } from '../utils/helpers';
import { formatPostContent, formatTimeAgo } from '../../utils/textFormatter';
import ShareModal from './ShareModal';

// LinkedIn-style reaction types
const REACTIONS = [
  { type: "like", icon: FiThumbsUp, label: "Like", color: "text-blue-600" },
  { type: "love", icon: FiHeart, label: "Love", color: "text-red-600" },
  { type: "celebrate", icon: FiAward, label: "Celebrate", color: "text-green-600" },
  { type: "support", icon: FiTrendingUp, label: "Support", color: "text-purple-600" },
  { type: "insightful", icon: FiZap, label: "Insightful", color: "text-yellow-600" },
  { type: "curious", icon: FiHelpCircle, label: "Curious", color: "text-cyan-600" },
];

const EnhancedPostCard = ({ 
  post, 
  currentUser, 
  onDelete, 
  onUpdate,
  onEdit,
  showFullContent = false 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(post.comments || []);
  const [reactions, setReactions] = useState(post.reactions || []);
  const [userReaction, setUserReaction] = useState(
    post.reactions?.find((r) => r.userId === currentUser?._id)?.type || null
  );
  const [isBookmarked, setIsBookmarked] = useState(
    post.bookmarks?.includes(currentUser?._id) || false
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Update state when post changes
  useEffect(() => {
    setComments(post.comments || []);
    setReactions(post.reactions || []);
    setUserReaction(
      post.reactions?.find((r) => r.userId === currentUser?._id)?.type || null
    );
    setIsBookmarked(post.bookmarks?.includes(currentUser?._id) || false);
  }, [post, currentUser]);

  const isOwner = currentUser?._id === post.userId?._id;

  // Calculate reaction counts
  const reactionCounts = {};
  REACTIONS.forEach((r) => {
    reactionCounts[r.type] = reactions.filter(
      (reaction) => reaction.type === r.type
    ).length;
  });
  const totalReactions = reactions.length;

  const handleReaction = async (reactionType) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`/api/posts/${post._id}/react`, {
        reactionType,
      });

      setReactions(response.data.reactions);
      setUserReaction(response.data.userReaction);
      setShowReactions(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error reacting to post:", error);
      toast.error("Failed to react to post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookmark = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`/api/posts/${post._id}/bookmark`);
      
      setIsBookmarked(response.data.isBookmarked);
      if (onUpdate) onUpdate();
      toast.success(response.data.isBookmarked ? 'Post bookmarked!' : 'Bookmark removed');
    } catch (error) {
      console.error("Error bookmarking post:", error);
      toast.error("Failed to bookmark post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    try {
      setIsLoading(true);
      const response = await axios.post(`/api/posts/${post._id}/comments`, {
        content: comment,
      });

      setComments([...comments, response.data]);
      setComment("");
      toast.success("Comment added!");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error commenting:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await axios.delete(`/api/posts/${post._id}`);
      toast.success("Post deleted successfully");
      if (onDelete) onDelete(post._id);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(post);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % (post.media?.length || 1));
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + (post.media?.length || 1)) % (post.media?.length || 1));
  };

  const getUserReactionIcon = () => {
    if (!userReaction) return null;
    const reaction = REACTIONS.find((r) => r.type === userReaction);
    return reaction ? { icon: reaction.icon, color: reaction.color } : null;
  };

  const reactionIcon = getUserReactionIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className="p-6">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={
                post.userId?.avatarUrl
                  ? getAvatarUrl(post.userId.avatarUrl)
                  : "/default-avatar.png"
              }
              alt={post.userId?.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100"
            />
            <div>
              <h3 className="font-semibold text-slate-800">
                {post.userId?.name}
              </h3>
              <p className="text-sm text-slate-500 capitalize">
                {post.userId?.role} • {formatTimeAgo(post.createdAt)}
              </p>
            </div>
          </div>

          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <FiMoreVertical size={20} />
              </button>

              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border z-10"
                >
                  <button
                    onClick={() => {
                      handleEdit();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <FiEdit3 size={18} />
                    <span>Edit Post</span>
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <FiTrash2 size={18} />
                    <span>Delete Post</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="text-slate-700 mb-4 whitespace-pre-wrap leading-relaxed">
          {formatPostContent(post.content)}
        </div>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.hashtags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-200 cursor-pointer transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Post Media */}
        {post.media && post.media.length > 0 && (
          <div className="mb-4 relative">
            <div className="relative overflow-hidden rounded-xl">
              {post.media[currentImageIndex]?.type === 'image' && (
                <img
                  src={post.media[currentImageIndex].url}
                  alt="Post media"
                  className="w-full h-96 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => window.open(post.media[currentImageIndex].url, "_blank")}
                />
              )}
              {post.media[currentImageIndex]?.type === 'video' && (
                <video
                  src={post.media[currentImageIndex].url}
                  controls
                  className="w-full h-96 object-cover"
                />
              )}
              {post.media[currentImageIndex]?.type === 'link' && (
                <a
                  href={post.media[currentImageIndex].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FiExternalLink size={24} className="text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">
                        {post.media[currentImageIndex].title || 'External Link'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {post.media[currentImageIndex].url}
                      </div>
                    </div>
                  </div>
                </a>
              )}
              
              {post.media.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    <FiChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {post.media.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Post Stats */}
        <div className="flex items-center justify-between text-sm text-slate-500 mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            {totalReactions > 0 && (
              <>
                <div className="flex -space-x-1">
                  {Object.entries(reactionCounts)
                    .filter(([_, count]) => count > 0)
                    .slice(0, 3)
                    .map(([type, _]) => {
                      const reaction = REACTIONS.find((r) => r.type === type);
                      const Icon = reaction.icon;
                      return (
                        <div
                          key={type}
                          className={`w-5 h-5 rounded-full bg-white flex items-center justify-center ${reaction.color}`}
                        >
                          <Icon size={12} />
                        </div>
                      );
                    })}
                </div>
                <span>{totalReactions}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {comments.length > 0 && <span>{comments.length} comments</span>}
            {post.shares > 0 && <span>{post.shares} shares</span>}
            {post.viewCount > 0 && (
              <span className="flex items-center gap-1">
                <FiEye size={14} />
                {post.viewCount} views
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() =>
                setTimeout(() => setShowReactions(false), 200)
              }
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 ${
                userReaction
                  ? `${reactionIcon?.color} bg-opacity-10`
                  : "text-slate-600 hover:bg-slate-50"
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {reactionIcon ? (
                <>
                  <reactionIcon.icon size={20} />
                  <span className="capitalize">{userReaction}</span>
                </>
              ) : (
                <>
                  <FiThumbsUp size={20} />
                  <span>Like</span>
                </>
              )}
            </button>

            {/* Reaction Picker */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                  className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-2xl border p-2 flex gap-1 z-20"
                >
                  {REACTIONS.map((reaction) => {
                    const Icon = reaction.icon;
                    return (
                      <motion.button
                        key={reaction.type}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(reaction.type)}
                        className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${reaction.color}`}
                        title={reaction.label}
                      >
                        <Icon size={20} />
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-300"
          >
            <FiMessageCircle size={20} />
            <span>Comment</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-300"
          >
            <FiShare2 size={20} />
            <span>Share</span>
          </button>

          <button
            onClick={handleBookmark}
            disabled={isLoading}
            className={`p-3 rounded-xl transition-all duration-300 ${
              isBookmarked
                ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                : 'text-slate-600 hover:bg-slate-50'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FiBookmark size={20} className={isBookmarked ? 'fill-current' : ''} />
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t"
            >
              {/* Comment Input */}
              <div className="flex gap-3 mb-4">
                <img
                  src={
                    currentUser?.avatarUrl
                      ? getAvatarUrl(currentUser.avatarUrl)
                      : "/default-avatar.png"
                  }
                  alt={currentUser?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleComment()}
                    placeholder="Write a comment..."
                    className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-full focus:border-indigo-500 focus:outline-none"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!comment.trim() || isLoading}
                    className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiSend size={20} />
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((c) => (
                  <CommentItem
                    key={c._id}
                    comment={c}
                    postId={post._id}
                    currentUser={currentUser}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          post={post}
          onClose={() => setShowShareModal(false)}
          onShared={onUpdate}
        />
      )}
    </motion.div>
  );
};

// Comment Item Component with Replies
const CommentItem = ({ comment, postId, currentUser, onUpdate }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState(comment.replies || []);
  const [isLoading, setIsLoading] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      setIsLoading(true);
      const response = await axios.post(
        `/api/posts/${postId}/comments/${comment._id}/reply`,
        { content: replyText }
      );

      setReplies([...replies, response.data]);
      setReplyText("");
      setShowReplyInput(false);
      toast.success("Reply added!");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error replying:", error);
      toast.error("Failed to add reply");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <img
          src={
            comment.userId?.avatarUrl
              ? getAvatarUrl(comment.userId.avatarUrl)
              : "/default-avatar.png"
          }
          alt={comment.userId?.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="bg-slate-50 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-slate-800 text-sm">
                {comment.userId?.name}
              </p>
              <span className="text-xs text-slate-400">
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>
            <div className="text-slate-700 text-sm">
              {formatPostContent(comment.content)}
            </div>
          </div>
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="text-sm text-slate-500 hover:text-indigo-600 font-semibold mt-1 ml-4"
          >
            Reply
          </button>

          {/* Reply Input */}
          {showReplyInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex gap-2 mt-3 ml-4"
            >
              <img
                src={
                  currentUser?.avatarUrl
                    ? getAvatarUrl(currentUser.avatarUrl)
                    : "/default-avatar.png"
                }
                alt={currentUser?.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleReply()}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-full focus:border-indigo-500 focus:outline-none"
                  autoFocus
                  disabled={isLoading}
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || isLoading}
                  className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiSend size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Replies List */}
          {replies.length > 0 && (
            <div className="mt-3 ml-4 space-y-3">
              {replies.map((reply) => (
                <div key={reply._id} className="flex gap-2">
                  <img
                    src={
                      reply.userId?.avatarUrl
                        ? getAvatarUrl(reply.userId.avatarUrl)
                        : "/default-avatar.png"
                    }
                    alt={reply.userId?.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="bg-slate-50 rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800 text-xs">
                          {reply.userId?.name}
                        </p>
                        <span className="text-xs text-slate-400">
                          {formatTimeAgo(reply.createdAt)}
                        </span>
                      </div>
                      <div className="text-slate-700 text-sm">
                        {formatPostContent(reply.content)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedPostCard;