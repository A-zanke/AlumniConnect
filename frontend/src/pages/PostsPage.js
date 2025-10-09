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
} from "react-icons/fi";
import { getAvatarUrl } from "../components/utils/helpers";
import axios from "axios";
import { toast } from "react-hot-toast";
import { formatPostContent, formatTimeAgo } from "../utils/textFormatter";
import { postsAPI } from "../components/utils/api";
import DOMPurify from "dompurify";
import { FiBookmark } from "react-icons/fi";

// LinkedIn-style reaction types
const REACTIONS = [
  { type: "like", icon: FiThumbsUp, label: "Like", color: "text-blue-600" },
  { type: "love", icon: FiHeart, label: "Love", color: "text-red-600" },
  {
    type: "celebrate",
    icon: FiAward,
    label: "Celebrate",
    color: "text-green-600",
  },
  {
    type: "support",
    icon: FiTrendingUp,
    label: "Support",
    color: "text-purple-600",
  },
  {
    type: "insightful",
    icon: FiZap,
    label: "Insightful",
    color: "text-yellow-600",
  },
  {
    type: "curious",
    icon: FiHelpCircle,
    label: "Curious",
    color: "text-cyan-600",
  },
];

const PostsPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const canCreatePost = user?.role === "teacher" || user?.role === "alumni";
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  // Basic mention search (debounced)
  useEffect(() => {
    let timer;
    if (showMentions && mentionQuery.length >= 2) {
      timer = setTimeout(async () => {
        try {
          const res = await axios.get(`/api/search/users`, {
            params: { q: mentionQuery },
          });
          setMentionResults(res.data || []);
        } catch (e) {
          setMentionResults([]);
        }
      }, 250);
    } else {
      setMentionResults([]);
    }
    return () => clearTimeout(timer);
  }, [mentionQuery, showMentions]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/posts");
      setPosts(response.data);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Posts
          </h1>
          <p className="text-slate-600">
            Discover insights and experiences from our community
          </p>
        </motion.div>

        {/* Create Post Button (Floating Action Button for Alumni/Teachers) */}
        {canCreatePost && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCreatePost(true)}
            className="fixed bottom-20 sm:bottom-16 md:bottom-12 right-6 sm:right-8 z-50 w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:shadow-indigo-500/50 transition-all duration-300"
          >
            <FiPlus size={28} />
          </motion.button>
        )}

        {/* Create Post Modal */}
        <CreatePostModal
          show={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={fetchPosts}
          user={user}
        />

        {/* Posts Feed */}
        <div className="space-y-4">
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
              <FiMessageCircle
                className="mx-auto text-slate-300 mb-4"
                size={64}
              />
              <p className="text-slate-500 text-lg">No posts available yet</p>
              <p className="text-slate-400 text-sm mt-2">
                Be the first to share something!
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
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
            <h2 className="text-2xl font-bold text-slate-800">Create Post</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src={
                  user.avatarUrl
                    ? getAvatarUrl(user.avatarUrl)
                    : "/default-avatar.png"
                }
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100"
              />
              <div>
                <p className="font-semibold text-slate-800">{user.name}</p>
                <p className="text-sm text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>

            {/* Content Input with mentions */}
            <textarea
              value={postContent}
              ref={textareaRef}
              onChange={(e) => {
                const val = e.target.value;
                setPostContent(val);
                const mentionMatch = /@([a-zA-Z0-9_.-]{2,})$/.exec(val.slice(0, e.target.selectionStart));
                if (mentionMatch) {
                  setMentionQuery(mentionMatch[1]);
                  setShowMentions(true);
                } else {
                  setShowMentions(false);
                  setMentionQuery("");
                }
              }}
              placeholder="What do you want to share? 
Use **bold**, *italic*, @mentions, #hashtags, and paste links!"
              className="w-full min-h-[150px] p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none resize-none text-slate-800 placeholder-slate-400"
            />

            {/* Mentions dropdown */}
            {showMentions && mentionResults.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto border rounded-xl bg-white shadow-lg">
                {mentionResults.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => {
                      // replace the @query at the caret with @username
                      const el = textareaRef.current;
                      const cursor = el.selectionStart;
                      const before = postContent.slice(0, cursor).replace(/@([a-zA-Z0-9_.-]{2,})$/, `@${u.username}`);
                      const after = postContent.slice(cursor);
                      const next = `${before} ${after}`;
                      setPostContent(next);
                      setShowMentions(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50"
                  >
                    @{u.username} — {u.name}
                  </button>
                ))}
              </div>
            )}

            {/* Formatting Help */}
            <div className="mt-2 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
              <FiInfo size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Formatting tips:</span>{" "}
                **bold**, *italic*, @username for mentions, #hashtag for tags,
                paste URLs for links
              </div>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
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
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Media Options */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t">
              <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 cursor-pointer transition-colors">
                <FiImage size={20} />
                <span className="font-semibold">Add Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-slate-500">
                {postImages.length}/5 images
              </span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCreatePost}
              disabled={
                submitting || (!postContent.trim() && postImages.length === 0)
              }
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

// Post Card Component (LinkedIn-style)
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

  // Update comments and reactions when post changes
  useEffect(() => {
    setComments(post.comments || []);
    setReactions(post.reactions || []);
    setUserReaction(
      post.reactions?.find((r) => r.userId === currentUser?._id)?.type || null
    );
    setBookmarked(Boolean(post.bookmarked));
  }, [post, currentUser]);

  const isOwner =
    currentUser?._id === post.user?._id ||
    currentUser?._id === post.userId?._id;

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
    try {
      await axios.post(`/api/posts/${post._id}/share`, { connectionIds: [] });
      const url = `${window.location.origin}/posts/${post._id}`;
      navigator.clipboard.writeText(url);
      toast.success("Post link copied. You can also share via messages.");
    } catch (e) {
      const url = `${window.location.origin}/posts/${post._id}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
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
      <div className="p-6">
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
              className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100"
            />
            <div>
              <h3 className="font-semibold text-slate-800">
                {post.user?.name || post.userId?.name}
              </h3>
              <p className="text-sm text-slate-500 capitalize">
                {post.user?.role || post.userId?.role} •{" "}
                {formatTime(post.createdAt)}
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
        <div className="text-slate-700 mb-4 whitespace-pre-wrap leading-relaxed">
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
              <img src={post.linkPreview.image} alt="Link preview" className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              <div className="font-semibold text-slate-800 line-clamp-1">{post.linkPreview.title || post.linkPreview.url}</div>
              {post.linkPreview.description && (
                <div className="text-sm text-slate-600 line-clamp-2">{post.linkPreview.description}</div>
              )}
            </div>
          </a>
        )}

        {/* Post Media */}
        {post.media && post.media.length > 0 && (
          <div
            className={`mb-4 ${
              post.media.length === 1
                ? ""
                : post.media.length === 2
                ? "grid grid-cols-2 gap-2"
                : post.media.length === 3
                ? "grid grid-cols-3 gap-2"
                : "grid grid-cols-2 gap-2"
            }`}
          >
            {post.media.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl overflow-hidden ${
                  post.media.length === 1
                    ? "max-h-[500px]"
                    : post.media.length === 3 && idx === 0
                    ? "col-span-3"
                    : ""
                }`}
              >
                {item.type === "image" && (
                  <img
                    src={item.url}
                    alt="Post media"
                    className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(item.url, "_blank")}
                  />
                )}
                {item.type === "video" && (
                  <video
                    src={item.url}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
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
            {typeof post.shares === 'number' && post.shares > 0 && (
              <span>{post.shares} shares</span>
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
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 ${
                userReaction
                  ? `${reactionIcon?.color} bg-opacity-10`
                  : "text-slate-600 hover:bg-slate-50"
              }`}
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
            onClick={toggleBookmark}
            className={`px-3 py-3 rounded-xl font-semibold transition-all duration-300 ${bookmarked ? "text-amber-600" : "text-slate-600 hover:bg-slate-50"}`}
            title={bookmarked ? "Saved" : "Save"}
          >
            <FiBookmark size={20} />
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
                    currentUser.avatarUrl
                      ? getAvatarUrl(currentUser.avatarUrl)
                      : "/default-avatar.png"
                  }
                  alt={currentUser.name}
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
                  />
                  <button
                    onClick={handleComment}
                    disabled={!comment.trim()}
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
    </motion.div>
  );
};

// Comment Item Component with Replies
const CommentItem = ({ comment, postId, currentUser, onUpdate }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState(comment.replies || []);

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      const response = await axios.post(
        `/api/posts/${postId}/comment/${comment._id}/reply`,
        { content: replyText }
      );

      setReplies([...replies, response.data]);
      setReplyText("");
      setShowReplyInput(false);
      toast.success("Reply added!");
      onUpdate();
    } catch (error) {
      console.error("Error replying:", error);
      toast.error("Failed to add reply");
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now - commentDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <img
          src={
            comment.user?.avatarUrl
              ? getAvatarUrl(comment.user.avatarUrl)
              : "/default-avatar.png"
          }
          alt={comment.user?.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="bg-slate-50 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-slate-800 text-sm">
                {comment.user?.name}
              </p>
              <span className="text-xs text-slate-400">
                {formatTime(comment.createdAt)}
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
                  currentUser.avatarUrl
                    ? getAvatarUrl(currentUser.avatarUrl)
                    : "/default-avatar.png"
                }
                alt={currentUser.name}
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
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
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
                      reply.user?.avatarUrl
                        ? getAvatarUrl(reply.user.avatarUrl)
                        : "/default-avatar.png"
                    }
                    alt={reply.user?.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="bg-slate-50 rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800 text-xs">
                          {reply.user?.name}
                        </p>
                        <span className="text-xs text-slate-400">
                          {formatTime(reply.createdAt)}
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

export default PostsPage;
