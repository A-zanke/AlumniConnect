import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  FiImage,
  FiSend,
  FiMessageCircle,
  FiShare2,
  FiMoreVertical,
  FiTrash2,
  FiX,
  FiPlus,
  FiThumbsUp,
  FiHeart,
  FiAward,
  FiTrendingUp,
  FiZap,
  FiHelpCircle,
  FiInfo,
  FiBookmark,
  FiEdit,
} from "react-icons/fi";
import { getAvatarUrl } from "../components/utils/helpers";
import axios from "axios";
import { toast } from "react-hot-toast";
import { formatPostContent, formatTimeAgo } from "../utils/textFormatter";
import DOMPurify from "dompurify";

// LinkedIn-style reaction types
const REACTIONS = [
  { type: "like", icon: FiThumbsUp, label: "Like", color: "text-blue-600" },
  { type: "love", icon: FiHeart, label: "Love", color: "text-red-600" },
  { type: "celebrate", icon: FiAward, label: "Celebrate", color: "text-green-600" },
  { type: "support", icon: FiTrendingUp, label: "Support", color: "text-purple-600" },
  { type: "insightful", icon: FiZap, label: "Insightful", color: "text-yellow-600" },
  { type: "curious", icon: FiHelpCircle, label: "Curious", color: "text-cyan-600" },
];

const PostsPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [sortBy, setSortBy] = useState("recent"); // recent or popular

  const canCreatePost = user?.role === "teacher" || user?.role === "alumni";

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/posts");
      let fetchedPosts = response.data;
      
      // Apply sorting
      if (sortBy === "popular") {
        fetchedPosts = fetchedPosts.sort((a, b) => {
          const aReactions = (a.reactions?.length || 0) + (a.comments?.length || 0);
          const bReactions = (b.reactions?.length || 0) + (b.comments?.length || 0);
          return bReactions - aReactions;
        });
      }
      
      setPosts(fetchedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await axios.delete(`/api/posts/${postId}`);
      toast.success("Post deleted successfully");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Posts
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mt-1">
                Discover insights from teachers and alumni
              </p>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 sm:px-4 py-2 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none text-sm sm:text-base"
              >
                <option value="recent">Recent</option>
                <option value="popular">Most Reactions</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Create Post Button (FAB for Mobile, Inline for Desktop) */}
        {canCreatePost && (
          <>
            {/* Mobile FAB */}
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCreatePost(true)}
              className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center"
            >
              <FiPlus size={24} />
            </motion.button>

            {/* Desktop Create Post Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden md:block bg-white rounded-2xl shadow-sm p-4 mb-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowCreatePost(true)}
            >
              <div className="flex items-center gap-3">
                <img
                  src={user.avatarUrl ? getAvatarUrl(user.avatarUrl) : "/default-avatar.png"}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 px-4 py-3 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                  Start a post...
                </div>
                <button className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                  <FiImage size={24} />
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Create Post Modal */}
        <CreatePostModal
          show={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={fetchPosts}
          user={user}
        />

        {/* Posts Feed */}
        <div className="space-y-3 sm:space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : posts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-white rounded-2xl shadow-sm"
            >
              <FiMessageCircle className="mx-auto text-slate-300 mb-4" size={64} />
              <p className="text-slate-500 text-lg">No posts available yet</p>
              <p className="text-slate-400 text-sm mt-2">
                {canCreatePost ? "Be the first to share something!" : "Check back soon for updates!"}
              </p>
            </motion.div>
          ) : (
            posts.map((post, index) => (
              <PostCard
                key={post._id}
                post={post}
                index={index}
                currentUser={user}
                onDelete={handleDeletePost}
                onUpdate={fetchPosts}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Create Post Modal Component
const CreatePostModal = ({ show, onClose, onPostCreated, user }) => {
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState("");
  const textareaRef = useRef(null);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + postImages.length > 5) {
      toast.error("You can upload maximum 5 images");
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 5MB`);
        return false;
      }
      return true;
    });

    setPostImages([...postImages, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setPostImages(postImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && postImages.length === 0) {
      toast.error("Please add some content or images");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("content", postContent);
      if (link) formData.append("link", link);
      postImages.forEach((image) => {
        formData.append("media", image);
      });

      await axios.post("/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Post created successfully!");
      setPostContent("");
      setPostImages([]);
      setImagePreviews([]);
      setLink("");
      onClose();
      onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(error.response?.data?.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10 rounded-t-3xl sm:rounded-t-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Create Post</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src={user.avatarUrl ? getAvatarUrl(user.avatarUrl) : "/default-avatar.png"}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100"
              />
              <div>
                <p className="font-semibold text-slate-800">{user.name}</p>
                <p className="text-sm text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>

            {/* Content Input */}
            <textarea
              value={postContent}
              ref={textareaRef}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What do you want to share?"
              className="w-full min-h-[150px] p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none resize-none text-slate-800 placeholder-slate-400"
            />

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 sm:h-48 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Link input */}
            <div className="mt-3">
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Paste link for preview (optional)"
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-sm sm:text-base"
              />
            </div>

            {/* Media Options */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <label className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 cursor-pointer transition-colors">
                <FiImage size={20} />
                <span className="font-semibold text-sm sm:text-base">Add Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              <span className="text-xs sm:text-sm text-slate-500">
                {postImages.length}/5 images
              </span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCreatePost}
              disabled={submitting || (!postContent.trim() && postImages.length === 0)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Post Card Component (LinkedIn-style with responsive design)
const PostCard = ({ post, index, currentUser, onDelete, onUpdate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(post.comments || []);
  const [reactions, setReactions] = useState(post.reactions || []);
  const [userReaction, setUserReaction] = useState(
    post.reactions?.find((r) => r.userId === currentUser?._id)?.type || null
  );
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setComments(post.comments || []);
    setReactions(post.reactions || []);
    setUserReaction(
      post.reactions?.find((r) => r.userId === currentUser?._id)?.type || null
    );
    setBookmarked(Boolean(post.bookmarked));
  }, [post, currentUser]);

  const isOwner = currentUser?._id === post.user?._id || currentUser?._id === post.userId?._id;

  // Calculate reaction counts
  const reactionCounts = {};
  REACTIONS.forEach((r) => {
    reactionCounts[r.type] = reactions.filter((reaction) => reaction.type === r.type).length;
  });
  const totalReactions = reactions.length;

  const handleReaction = async (reactionType) => {
    try {
      const response = await axios.post(`/api/posts/${post._id}/react`, {
        reactionType,
      });

      setReactions(response.data.reactions);
      setUserReaction(response.data.userReaction);
      setShowReactions(false);
      onUpdate();
    } catch (error) {
      console.error("Error reacting to post:", error);
      toast.error("Failed to react to post");
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    try {
      const response = await axios.post(`/api/posts/${post._id}/comment`, {
        content: comment,
      });

      setComments([...comments, response.data]);
      setComment("");
      toast.success("Comment added!");
      onUpdate();
    } catch (error) {
      console.error("Error commenting:", error);
      toast.error("Failed to add comment");
    }
  };

  const toggleBookmark = async () => {
    try {
      const res = await axios.post(`/api/posts/${post._id}/bookmark`);
      setBookmarked(res.data.bookmarked);
      toast.success(res.data.bookmarked ? "Saved" : "Removed from saved");
    } catch (e) {
      toast.error("Failed to update bookmark");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post._id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.user?.name || post.userId?.name}`,
          text: post.content,
          url: url,
        });
        toast.success("Post shared!");
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return postDate.toLocaleDateString();
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
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className="p-4 sm:p-6">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={
                post.user?.avatarUrl || post.userId?.avatarUrl
                  ? getAvatarUrl(post.user?.avatarUrl || post.userId?.avatarUrl)
                  : "/default-avatar.png"
              }
              alt={post.user?.name || post.userId?.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-slate-100"
            />
            <div>
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
                {post.user?.name || post.userId?.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 capitalize">
                {post.user?.role || post.userId?.role} • {formatTime(post.createdAt)}
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
                      onDelete(post._id);
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
        <div className="text-slate-700 mb-4 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
          {formatPostContent(post.content)}
        </div>

        {/* Link Preview */}
        {post.linkPreview?.url && (
          <a
            href={post.linkPreview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-4 border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
          >
            {post.linkPreview.image && (
              <img
                src={post.linkPreview.image}
                alt="Link preview"
                className="w-full h-40 sm:h-48 object-cover"
              />
            )}
            <div className="p-3 sm:p-4">
              <div className="font-semibold text-slate-800 line-clamp-1 text-sm sm:text-base">
                {post.linkPreview.title || post.linkPreview.url}
              </div>
              {post.linkPreview.description && (
                <div className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-1">
                  {post.linkPreview.description}
                </div>
              )}
            </div>
          </a>
        )}

        {/* Post Media */}
        {post.media && post.media.length > 0 && (
          <div className={`mb-4 grid gap-2 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.media.slice(0, 4).map((media, idx) => (
              <img
                key={idx}
                src={media.url}
                alt={`Post media ${idx + 1}`}
                className="w-full h-48 sm:h-64 object-cover rounded-xl"
              />
            ))}
          </div>
        )}

        {/* Reaction Summary */}
        {totalReactions > 0 && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b">
            <div className="flex -space-x-1">
              {REACTIONS.filter((r) => reactionCounts[r.type] > 0)
                .slice(0, 3)
                .map((r) => {
                  const Icon = r.icon;
                  return (
                    <div
                      key={r.type}
                      className={`w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-white ${r.color}`}
                    >
                      <Icon size={14} />
                    </div>
                  );
                })}
            </div>
            <span className="text-sm text-slate-600">{totalReactions}</span>
            <span className="text-sm text-slate-400">•</span>
            <span className="text-sm text-slate-600">{comments.length} comments</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <div className="relative flex-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors ${
                userReaction ? (reactionIcon?.color || "text-blue-600") : "text-slate-600"
              }`}
            >
              {reactionIcon ? (
                <>
                  <reactionIcon.icon size={20} />
                  <span className="hidden sm:inline text-sm font-medium capitalize">{userReaction}</span>
                </>
              ) : (
                <>
                  <FiThumbsUp size={20} />
                  <span className="hidden sm:inline text-sm font-medium">Like</span>
                </>
              )}
            </button>

            {/* Reactions Picker */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl border-2 flex items-center gap-1 p-2 z-20"
                >
                  {REACTIONS.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.type}
                        onClick={() => handleReaction(r.type)}
                        className={`p-2 rounded-full hover:bg-slate-100 transition-all hover:scale-125 ${r.color}`}
                        title={r.label}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <FiMessageCircle size={20} />
            <span className="hidden sm:inline text-sm font-medium">Comment</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <FiShare2 size={20} />
            <span className="hidden sm:inline text-sm font-medium">Share</span>
          </button>

          <button
            onClick={toggleBookmark}
            className={`p-2 rounded-lg transition-colors ${
              bookmarked ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiBookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t space-y-3"
            >
              {/* Comment Input */}
              <div className="flex gap-2 items-start">
                <img
                  src={currentUser.avatarUrl ? getAvatarUrl(currentUser.avatarUrl) : "/default-avatar.png"}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleComment()}
                    placeholder="Write a comment..."
                    className="flex-1 px-4 py-2 bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={handleComment}
                    disabled={!comment.trim()}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiSend size={20} />
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {comments.length > 0 && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {comments.map((c, idx) => (
                    <div key={idx} className="flex gap-2">
                      <img
                        src={
                          c.user?.avatarUrl
                            ? getAvatarUrl(c.user.avatarUrl)
                            : "/default-avatar.png"
                        }
                        alt={c.user?.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="bg-slate-100 rounded-2xl px-4 py-2">
                          <p className="font-semibold text-sm text-slate-800">
                            {c.user?.name}
                          </p>
                          <p className="text-sm text-slate-700">{c.content}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-4">
                          {formatTime(c.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PostsPage;