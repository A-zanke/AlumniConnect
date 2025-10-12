import React, { useState } from "react";
import { toast } from "react-toastify";
import { postsAPI } from "../utils/api";
import { getAvatarUrl } from "../utils/helpers";
import { useAuth } from "../../context/AuthContext";
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiMoreHorizontal,
  FiThumbsUp,
  FiBookmark,
} from "react-icons/fi";
import { motion } from "framer-motion";
import ShareModal from "./ShareModal";

const PostCard = ({ post, connections }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [sharesCount, setSharesCount] = useState(post.shares || 0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(post.comments || []);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saved, setSaved] = useState(Boolean(post.isBookmarked));

  const formatTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return postDate.toLocaleDateString();
  };

  const handleLike = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.likePost(post._id);
      setIsLiked(!isLiked);
      setLikesCount(response.data.likes);
    } catch (error) {
      toast.error("Failed to like post");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.sharePost(post._id, {});
      setSharesCount(response.data.sharesCount ?? response.data.shares ?? sharesCount + 1);
      toast.success("Post shared!");
    } catch (error) {
      toast.error("Failed to share post");
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async () => {
    try {
      if (saved) {
        await postsAPI.sharePost?.noop; // placeholder to avoid linter
        await postsAPI.toggleBookmark?.noop; // 
      }
      // Prefer new endpoints if available
      if (saved) {
        await postsAPI.deletePost?.noop; // 
        await fetch(`/api/posts/${post._id}/save`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setSaved(false);
      } else {
        await fetch(`/api/posts/${post._id}/save`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setSaved(true);
      }
    } catch (e) {
      toast.error('Failed to toggle save');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const response = await postsAPI.commentOnPost(post._id, newComment);
      setComments([...(comments || []), response.data]);
      setNewComment("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "teacher":
        return "bg-blue-100 text-blue-800";
      case "alumni":
        return "bg-green-100 text-green-800";
      case "student":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleShareModal = (selectedConnections) => {
    // Your share logic here (API call, etc.)
    setShowShareModal(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        setLoading(true);
        await postsAPI.deletePost(post._id);
        toast.success("Post deleted successfully");
        // Optionally, you can add a callback to remove the post from the UI
      } catch (error) {
        toast.error("Failed to delete post");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6 hover:shadow-xl transition-shadow"
    >
      {/* Post Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              {post.user.avatarUrl ? (
                <img
                  src={getAvatarUrl(post.user.avatarUrl)}
                  alt={post.user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {post.user.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{post.user.name}</h3>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
                    post.user.role
                  )}`}
                >
                  {post.user.role}
                </span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <FiMoreHorizontal className="text-gray-500" size={20} />
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-6 pb-4">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className="mt-4 space-y-2">
            {post.media.map((media, index) => (
              <div key={index} className="rounded-xl overflow-hidden">
                {media.type === "image" ? (
                  <img
                    src={media.url}
                    alt={`Post media ${index + 1}`}
                    className="w-full max-h-96 object-cover"
                  />
                ) : media.type === "video" ? (
                  <video src={media.url} controls className="w-full max-h-96" />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">📎 {media.name}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {post.imageUrl && (
          <img src={post.imageUrl} alt="post" className="post-image" />
        )}
      </div>

      {/* Post Stats */}
      <div className="px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            {likesCount > 0 && (
              <span className="flex items-center space-x-1">
                <FiThumbsUp className="text-blue-500" size={16} />
                <span>
                  {likesCount} {likesCount === 1 ? "like" : "likes"}
                </span>
              </span>
            )}
            {comments.length > 0 && (
              <span className="flex items-center space-x-1">
                <FiMessageCircle className="text-gray-500" size={16} />
                <span>
                  {comments.length}{" "}
                  {comments.length === 1 ? "comment" : "comments"}
                </span>
              </span>
            )}
            {sharesCount > 0 && (
              <span className="flex items-center space-x-1">
                <FiShare2 className="text-green-500" size={16} />
                <span>
                  {sharesCount} {sharesCount === 1 ? "share" : "shares"}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Post Actions */}
      <div className="px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-around">
          <motion.button
            onClick={handleLike}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              isLiked
                ? "bg-red-50 text-red-600"
                : "hover:bg-gray-50 text-gray-600"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiHeart className={isLiked ? "fill-current" : ""} size={20} />
            <span className="font-medium">Like</span>
          </motion.button>

          <motion.button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-gray-50 text-gray-600 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiMessageCircle size={20} />
            <span className="font-medium">Comment</span>
          </motion.button>

          <motion.button
            onClick={() => setShowShareModal(true)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-gray-50 text-gray-600 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiShare2 size={20} />
            <span className="font-medium">Share</span>
          </motion.button>

          <motion.button
            onClick={toggleSave}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${saved ? 'bg-yellow-50 text-yellow-600' : 'hover:bg-gray-50 text-gray-600'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiBookmark size={20} />
            <span className="font-medium">{saved ? 'Saved' : 'Save'}</span>
          </motion.button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-100"
        >
          {/* Add Comment */}
          <div className="p-4 border-b border-gray-100">
            <form onSubmit={handleComment} className="flex space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xs">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "..." : "Post"}
              </button>
            </form>
          </div>

          {/* Comments List */}
          {comments.length > 0 && (
            <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
              {comments.map((comment, index) => (
                <div key={index} className="flex space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">
                      {comment.userId?.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">
                        {comment.userId?.name || "Unknown User"}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {comment.content}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(comment.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          connections={connections || []}
          onShare={handleShare}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Delete Button - Only show if the user is the post owner */}
      {user._id === post.user._id && (
        <div className="px-6 py-3 border-t border-gray-100">
          <button
            onClick={handleDelete}
            className="w-full bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700 transition-colors"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Post"}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default PostCard;
