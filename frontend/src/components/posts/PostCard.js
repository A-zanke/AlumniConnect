import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiHeart, FiMessageCircle, FiShare2, FiBookmark,
  FiMoreVertical, FiTrash2, FiFlag
} from 'react-icons/fi';
import ConnectionButton from '../network/ConnectionButton';

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
        className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors ${
          post.userReaction ? 'text-blue-600' : ''
        }`}
      >
        {currentReaction ? (
          <span className="text-2xl">{currentReaction.emoji}</span>
        ) : (
          <>
            <FiHeart className="w-5 h-5" />
            <span>Like</span>
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

const MediaCarousel = ({ media }) => {
  if (!media || media.length === 0) return null;
  
  return (
    <div className="grid grid-cols-1 gap-2 mt-4">
      {media.map((item, idx) => (
        <div key={idx} className="relative rounded-lg overflow-hidden">
          {item.type === 'image' ? (
            <img
              src={item.url}
              alt="Post media"
              className="w-full h-auto object-cover"
            />
          ) : item.type === 'video' ? (
            <video
              src={item.url}
              controls
              className="w-full h-auto"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
};

const PostCard = ({ post, currentUser, onDelete, showCommentSection = false }) => {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [localPost, setLocalPost] = useState(post);

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
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={localPost.user?.avatarUrl || '/default-avatar.png'}
              alt={localPost.user?.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <div className="flex items-center space-x-2">
                <Link
                  to={`/profile/id/${localPost.user?._id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600"
                >
                  {localPost.user?.name}
                </Link>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600">
                  {localPost.user?.role}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{localPost.user?.department}</span>
                <span>•</span>
                <span>{new Date(localPost.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {localPost.user?._id !== currentUser?._id && (
              <ConnectionButton userId={localPost.user?._id} />
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
      <div className="p-6">
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
      <div className="px-6 py-3 border-t border-b border-gray-100 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          {localPost.totalReactions > 0 && (
            <div className="flex items-center space-x-1">
              <span className="flex -space-x-1">
                {Object.keys(localPost.reactionCounts || {}).slice(0, 3).map(type => {
                  const reaction = REACTIONS.find(r => r.type === type);
                  return reaction ? <span key={type} className="text-xl">{reaction.emoji}</span> : null;
                })}
              </span>
              <span>{localPost.totalReactions}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>{localPost.totalComments || 0} comments</span>
          <span>{localPost.shareCount || 0} shares</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-4 flex items-center justify-around">
        <ReactionPicker
          post={localPost}
          onReact={handleReaction}
        />
        
        <button
          onClick={() => navigate(`/posts/${post._id}`)}
          className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiMessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>
        
        <button
          onClick={() => toast.info('Share feature coming soon')}
          className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiShare2 className="w-5 h-5" />
          <span>Share</span>
        </button>
        
        <button
          onClick={handleBookmark}
          className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors ${
            localPost.isBookmarked ? 'text-blue-600' : ''
          }`}
        >
          <FiBookmark className="w-5 h-5" />
          <span>Save</span>
        </button>
      </div>
    </motion.div>
  );
};

export default PostCard;
