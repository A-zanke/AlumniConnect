import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiBookmark,
  FiMoreVertical,
  FiTrash2,
  FiFlag
} from 'react-icons/fi';
import ConnectionButton from '../network/ConnectionButton';
import MediaCarousel from './MediaCarousel';
import ReactionListModal from './ReactionListModal';

// LinkedIn-style Professional Reactions
const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: '#0a66c2' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate', color: '#6dae4f' },
  { type: 'clap', emoji: '👏', label: 'Clap', color: '#df704d' },
  { type: 'love', emoji: '❤️', label: 'Love', color: '#df704d' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', color: '#f5c675' },
  { type: 'funny', emoji: '😂', label: 'Funny', color: '#8c5e3c' }
];

const ReactionPicker = ({ post, onReact }) => {
  const [showPicker, setShowPicker] = useState(false);
  const currentReaction = REACTIONS.find(r => r.type === post.userReaction);
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center space-x-0 sm:space-x-2 px-3 sm:px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors ${
          post.userReaction ? 'text-blue-600' : ''
        }`}
      >
        {currentReaction ? (
          <span className="text-2xl">{currentReaction.emoji}</span>
        ) : (
          <>
            <FiHeart className="w-5 h-5" />
            <span className="hidden sm:inline">Like</span>
          </>
        )}
      </button>
      
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex space-x-1 z-10">
          {REACTIONS.map(reaction => (
            <button
              key={reaction.type}
              onClick={() => {
                onReact(reaction.type);
                setShowPicker(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group relative"
              title={reaction.label}
            >
              <span className="text-2xl">{reaction.emoji}</span>
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {reaction.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PostCard = ({
  post,
  currentUser,
  onDelete,
  showCommentSection = false,
  onShare,
  onShowReactions
}) => {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [reactionData, setReactionData] = useState({});

  const handleReaction = async (reactionType) => {
    try {
      const response = await axios.post(`/api/posts/${post._id}/react`, { type: reactionType });
      setLocalPost(prev => ({
        ...prev,
        reactionCounts: response.data.reactionCounts,
        userReaction: response.data.userReaction,
        totalReactions: Object.values(response.data.reactionCounts || {}).reduce((a, b) => a + b, 0)
      }));
    } catch (error) {
      toast.error('Failed to react');
    }
  };

  const handleBookmark = async () => {
    try {
      await axios.post(`/api/posts/${post._id}/bookmark`);
      setLocalPost(prev => ({
        ...prev,
        isBookmarked: !prev.isBookmarked
      }));
      toast.success(localPost.isBookmarked ? 'Bookmark removed' : 'Post bookmarked!');
    } catch (error) {
      toast.error('Failed to bookmark post');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await axios.delete(`/api/posts/${post._id}`);
      toast.success('Post deleted');
      if (onDelete) onDelete();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 w-full overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {(() => {
              const avatarSrc = localPost.user?.avatarUrl || '/default-avatar.png';
              return (
                <img
                  src={avatarSrc}
                  alt={localPost.user?.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover cursor-zoom-in"
                  data-avatar-src={avatarSrc}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-avatar.png';
                    e.target.setAttribute('data-avatar-src', '/default-avatar.png');
                  }}
                />
              );
            })()}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/profile/id/${localPost.user?._id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600"
                >
                  {localPost.user?.name}
                </Link>
                {localPost.user?.role && (
                  <span className="px-2 py-1 text-[11px] font-medium rounded-full bg-blue-100 text-blue-600">
                    {localPost.user?.role}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500">
                {localPost.user?.department && (
                  <span className="truncate max-w-[150px] sm:max-w-none">
                    {localPost.user?.department}
                  </span>
                )}
                <span>•</span>
                <span>{new Date(localPost.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0 self-start">
            {localPost.user?._id !== currentUser?._id && (
              <>
                <div className="sm:hidden">
                  <ConnectionButton
                    userId={localPost.user?._id}
                    variant="icon"
                    hideConnected
                  />
                </div>
                <div className="hidden sm:block">
                  <ConnectionButton
                    userId={localPost.user?._id}
                    variant="compact"
                  />
                </div>
              </>
            )}

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiMoreVertical className="w-5 h-5 text-gray-600" />
              </button>
              
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                  {(localPost.isOwner || currentUser?.role === 'admin') && (
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-red-600"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      <span>Delete Post</span>
                    </button>
                  )}
                  {!localPost.isOwner && (
                    <button
                      onClick={() => {
                        toast.info('Report feature coming soon');
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-gray-700"
                    >
                      <FiFlag className="w-4 h-4" />
                      <span>Report Post</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 sm:p-6">
        <p className="text-gray-800 whitespace-pre-wrap mb-4">
          {localPost.content?.length > 300 && !expanded
            ? localPost.content.substring(0, 300) + '...'
            : localPost.content}
        </p>
        {localPost.content?.length > 300 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-4"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        
        <MediaCarousel media={localPost.media} />
        
        {localPost.tags && localPost.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {localPost.tags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div className="px-4 sm:px-6 py-3 border-t border-b border-gray-100 flex flex-wrap items-center justify-between text-xs sm:text-sm text-gray-600 gap-y-2">
        <div className="flex items-center gap-2">
          {localPost.totalReactions > 0 && (
            <button
              onClick={async () => {
                try {
                  const response = await axios.get(`/api/posts/${post._id}/reactions`);
                  setReactionData(response.data.reactions || {});
                  setShowReactionModal(true);
                } catch (error) {
                  toast.error('Failed to load reactions');
                }
              }}
              className="flex items-center gap-1 hover:underline"
            >
              <span className="flex -space-x-1 text-sm sm:text-base">
                {Object.keys(localPost.reactionCounts || {})
                  .slice(0, 3)
                  .map((type) => {
                    const reaction = REACTIONS.find((r) => r.type === type);
                    return reaction ? (
                      <span key={type}>{reaction.emoji}</span>
                    ) : null;
                  })}
              </span>
              <span>{localPost.totalReactions}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span>{localPost.totalComments || 0} comments</span>
          <span>{localPost.shareCount || 0} shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-2 sm:justify-around text-xs sm:text-sm">
        <ReactionPicker post={localPost} onReact={handleReaction} />

        <button
          onClick={() => navigate(`/posts/${post._id}`)}
          className="flex items-center justify-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiMessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Comment</span>
        </button>

        <button
          onClick={() => {
            if (onShare) {
              onShare(localPost);
            }
          }}
          className="flex items-center justify-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiShare2 className="w-5 h-5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          onClick={handleBookmark}
          className={`flex items-center justify-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors ${
            localPost.isBookmarked ? 'text-blue-600' : ''
          }`}
        >
          <FiBookmark className="w-5 h-5" />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>

      {showCommentSection && (
        <div className="px-6 pb-6">
          {/* Placeholder for in-card comments */}
        </div>
      )}

      <AnimatePresence>
        {showReactionModal && (
          <ReactionListModal
            open={showReactionModal}
            reactions={reactionData}
            onClose={() => {
              setShowReactionModal(false);
              setReactionData({});
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostCard;
