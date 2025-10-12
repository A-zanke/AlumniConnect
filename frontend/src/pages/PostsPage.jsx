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
  FiEdit,
  FiBookmark,
  FiSmile,
} from "react-icons/fi";
import { getAvatarUrl } from "../components/utils/helpers";
import { postsAPI } from "../components/utils/api";
import PostComposer from "../components/posts/PostComposer";
import PostCardComp from "../components/posts/PostCard";
import { toast } from "react-hot-toast";
// import CreatePost from "../components/CreatePost.jsx";

// LinkedIn-style reaction types
const REACTIONS = [
  {
    type: "like",
    icon: FiThumbsUp,
    label: "Like",
    color: "text-blue-600 hover:bg-blue-50",
  },
  {
    type: "love",
    icon: FiHeart,
    label: "Love",
    color: "text-red-600 hover:bg-red-50",
  },
  {
    type: "celebrate",
    icon: FiAward,
    label: "Celebrate",
    color: "text-green-600 hover:bg-green-50",
  },
  {
    type: "support",
    icon: FiTrendingUp,
    label: "Support",
    color: "text-purple-600 hover:bg-purple-50",
  },
  {
    type: "insightful",
    icon: FiZap,
    label: "Insightful",
    color: "text-yellow-600 hover:bg-yellow-50",
  },
  {
    type: "curious",
    icon: FiHelpCircle,
    label: "Curious",
    color: "text-cyan-600 hover:bg-cyan-50",
  },
];

const PostsPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [showSaved, setShowSaved] = useState(false);

  // 🔧 FIX: Only Alumni/Teacher/Admin can create posts
  const canCreatePost = ["alumni", "teacher", "admin"].includes(
    String(user?.role || "").toLowerCase()
  );

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (sortBy && !showSaved) {
      fetchPosts();
    }
  }, [sortBy]);

  // 🔧 FIX: Enhanced fetchPosts with proper error handling
  const fetchPosts = async () => {
    try {
      console.log("🔄 Fetching posts...");
      setLoading(true);

      const response = await postsAPI.getPosts();

      console.log("📡 Raw posts response:", response.data);

      let fetchedPosts = Array.isArray(response.data) ? response.data : [];

      // Apply sorting
      if (sortBy === "popular") {
        fetchedPosts = fetchedPosts.sort((a, b) => {
          const aScore =
            (a.likesCount || 0) +
            (a.commentsCount || 0) +
            (a.reactionsCount || 0);
          const bScore =
            (b.likesCount || 0) +
            (b.commentsCount || 0) +
            (b.reactionsCount || 0);
          return bScore - aScore;
        });
      } else {
        fetchedPosts = fetchedPosts.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      }

      console.log(`✅ Processed ${fetchedPosts.length} posts`);
      setPosts(fetchedPosts);
    } catch (error) {
      console.error("❌ Error fetching posts:", error);
      if (error.response?.status === 404) {
        toast.error("Posts API not found. Please check backend routes.");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please check backend connection.");
      } else if (error.code === "ECONNABORTED") {
        toast.error("Request timeout. Please try again.");
      } else {
        toast.error("Failed to load posts. Please refresh the page.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FIX: Enhanced saved posts fetching
  const fetchSavedPosts = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getSavedPosts?.() || await postsAPI.getPosts();
      setSavedPosts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching saved posts:", error);
      toast.error("Failed to load saved posts");
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FIX: Proper post creation handler
  const handleCreatePost = async (newPost) => {
    try {
      console.log("✅ Post created successfully:", newPost);

      // Immediately add to posts state
      setPosts((prevPosts) => {
        const updatedPosts = [newPost, ...prevPosts];
        console.log(`📊 Total posts now: ${updatedPosts.length}`);
        return updatedPosts;
      });

      // Refetch after 1 second to ensure consistency
      setTimeout(() => {
        console.log("🔄 Refetching posts for consistency...");
        fetchPosts();
      }, 1000);

      toast.success("Post created successfully!");
      setShowCreatePost(false);
    } catch (error) {
      console.error("❌ Error handling post creation:", error);
      toast.error("Failed to handle post creation");
      // Still refetch to see if post was actually created
      fetchPosts();
    }
  };

  // 🔧 FIX: LinkedIn-style reaction handler
  const handleReaction = async (postId, reactionType) => {
    try {
      const response = await postsAPI.reactToPost?.(postId, reactionType) || await fetch(`/api/posts/${postId}/react`, {
        type: reactionType,
      });

      // Update the specific post in state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                reactions: response.data.reactions || [],
                reactionsCount: response.data.reactionsCount || 0,
                userReaction: response.data.userReaction,
              }
            : post
        )
      );
    } catch (error) {
      console.error("Error reacting to post:", error);
      toast.error("Failed to add reaction");
    }
  };

  // 🔧 FIX: Like post functionality (backward compatibility)
  const handleLikePost = async (postId) => {
    try {
      const response = await postsAPI.likePost?.(postId) || await fetch(`/api/posts/${postId}/like`, { method: 'PUT' });

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: response.data.likes || [],
                likesCount: response.data.likesCount || 0,
                userLiked: response.data.liked,
              }
            : post
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
      toast.error("Failed to like post");
    }
  };

  // 🔧 FIX: Comment on post functionality
  const handleCommentPost = async (postId, commentContent) => {
    try {
      if (!commentContent.trim()) return;

      const response = await postsAPI.commentOnPost?.(postId, commentContent) || await fetch(`/api/posts/${postId}/comment`, {
        content: commentContent.trim(),
      });

      // Add new comment to the specific post
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                comments: [...(post.comments || []), response.data],
                commentsCount: (post.comments || []).length + 1,
              }
            : post
        )
      );

      toast.success("Comment added!");
    } catch (error) {
      console.error("Error commenting on post:", error);
      toast.error("Failed to add comment");
    }
  };

  // 🔧 FIX: Share post functionality
  const handleSharePost = async (postId) => {
    try {
      const response = await postsAPI.sharePost?.(postId, {}) || await fetch(`/api/posts/${postId}/share`, {
        message: "",
        connectionIds: [],
      });

      toast.success("Post shared successfully!");

      // Update shares count
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? { ...post, sharesCount: response.data.sharesCount || 0 }
            : post
        )
      );
    } catch (error) {
      console.error("Error sharing post:", error);
      toast.error("Failed to share post");
    }
  };

  // 🔧 FIX: Save/bookmark post functionality
  const handleSavePost = async (postId) => {
    try {
      const response = await postsAPI.toggleBookmark?.(postId) || await fetch(`/api/posts/${postId}/bookmark`, { method: 'POST' });

      toast.success(response.data.message || "Post saved!");

      // Update UI to show saved state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? { ...post, isBookmarked: response.data.bookmarked }
            : post
        )
      );

      // If we're viewing saved posts, refetch
      if (showSaved) {
        fetchSavedPosts();
      }
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Failed to save post");
    }
  };

  // 🔧 FIX: Delete post functionality
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await postsAPI.deletePost?.(postId);
      toast.success("Post deleted successfully");

      // Remove from current posts
      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  // 🔧 FIX: Update post functionality
  const handlePostUpdate = async (postId, updatedData) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === postId ? { ...post, ...updatedData } : post
      )
    );
  };

  // Format time function
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString();
    } catch (error) {
      return new Date(dateString).toLocaleDateString();
    }
  };

  // 🔧 ENHANCED: LinkedIn-style PostCard component
  const PostCard = ({ post }) => {
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [showReactions, setShowReactions] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleCommentSubmit = (e) => {
      e.preventDefault();
      if (commentText.trim()) {
        handleCommentPost(post._id, commentText);
        setCommentText("");
        setShowCommentInput(false);
      }
    };

    const userReaction = post.reactions?.find((r) => r.userId === user?._id);
    const isLiked = post.likes?.includes(user?._id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden"
      >
        <div className="p-6">
          {/* Post header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <img
                src={getAvatarUrl(post.user)}
                alt={post.user?.name}
                className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-gray-100"
              />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {post.user?.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {post.user?.role} • {formatTime(post.createdAt)}
                  {post.isEdited && (
                    <span className="text-gray-400 ml-1">(edited)</span>
                  )}
                </p>
              </div>
            </div>

            {/* 🔧 FIX: Professional 3-dots menu like LinkedIn */}
            {user?._id === post.user?._id && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                  title="More options"
                >
                  <FiMoreVertical size={20} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        // Add edit functionality here
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <FiEdit size={16} /> Edit post
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        handleDeletePost(post._id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <FiTrash2 size={16} /> Delete post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Post content */}
          <div className="mb-4">
            {post.content && (
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            )}

            {/* Media */}
            {post.media && post.media.length > 0 && (
              <div className="mt-4 grid gap-3">
                {post.media.map((media, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg overflow-hidden"
                  >
                    {media.type === "image" ? (
                      <img
                        src={media.url}
                        alt="Post media"
                        className="w-full max-h-96 object-cover"
                      />
                    ) : (
                      <video
                        src={media.url}
                        controls
                        className="w-full max-h-96 object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post stats */}
          <div className="flex items-center justify-between mb-4 text-sm text-gray-600 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-4">
              {(post.likesCount > 0 || post.reactionsCount > 0) && (
                <span>
                  {(post.likesCount || 0) + (post.reactionsCount || 0)}{" "}
                  reactions
                </span>
              )}
              {post.commentsCount > 0 && (
                <span>{post.commentsCount} comments</span>
              )}
              {post.sharesCount > 0 && <span>{post.sharesCount} shares</span>}
            </div>
          </div>

          {/* 🔧 ENHANCED: LinkedIn-style action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Reaction button with dropdown */}
              <div className="relative">
                <button
                  onClick={() =>
                    !showReactions ? handleLikePost(post._id) : null
                  }
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isLiked || userReaction
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {userReaction ? (
                    REACTIONS.find((r) => r.type === userReaction.type)
                      ?.icon ? (
                      React.createElement(
                        REACTIONS.find((r) => r.type === userReaction.type)
                          .icon,
                        { size: 18 }
                      )
                    ) : (
                      <FiThumbsUp size={18} />
                    )
                  ) : (
                    <FiThumbsUp size={18} />
                  )}
                  <span className="font-medium">
                    {userReaction
                      ? REACTIONS.find((r) => r.type === userReaction.type)
                          ?.label || "Like"
                      : "Like"}
                  </span>
                </button>

                {/* Reaction picker */}
                {showReactions && (
                  <div
                    className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-full shadow-lg p-2 flex gap-1 z-20"
                    onMouseEnter={() => setShowReactions(true)}
                    onMouseLeave={() => setShowReactions(false)}
                  >
                    {REACTIONS.map((reaction) => (
                      <button
                        key={reaction.type}
                        onClick={() => {
                          handleReaction(post._id, reaction.type);
                          setShowReactions(false);
                        }}
                        className={`p-2 rounded-full transition-all ${reaction.color} hover:scale-110`}
                        title={reaction.label}
                      >
                        <reaction.icon size={20} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment button */}
              <button
                onClick={() => setShowCommentInput(!showCommentInput)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
              >
                <FiMessageCircle size={18} />
                <span className="font-medium">Comment</span>
              </button>

              {/* Share button */}
              <button
                onClick={() => handleSharePost(post._id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
              >
                <FiShare2 size={18} />
                <span className="font-medium">Share</span>
              </button>
            </div>

            {/* Save button */}
            <button
              onClick={() => handleSavePost(post._id)}
              className={`p-2 rounded-lg transition-all ${
                post.isBookmarked
                  ? "text-yellow-600 bg-yellow-50"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="Save post"
            >
              <FiBookmark size={18} />
            </button>
          </div>

          {/* Comment input */}
          {showCommentInput && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <form onSubmit={handleCommentSubmit} className="flex gap-3">
                <img
                  src={getAvatarUrl(user)}
                  alt={user?.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                />
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Add emoji"
                      >
                        <FiSmile size={16} />
                      </button>
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          commentText.trim()
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Comments section */}
          {post.comments && post.comments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="space-y-4">
                {post.comments.slice(0, 3).map((comment) => (
                  <div key={comment._id} className="flex items-start gap-3">
                    <img
                      src={getAvatarUrl(comment.user)}
                      alt={comment.user?.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <p className="font-medium text-sm text-gray-900">
                        {comment.user?.name}
                      </p>
                      <p className="text-gray-800 mt-1">{comment.content}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTime(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {post.comments.length > 3 && (
                  <button className="text-blue-600 hover:underline text-sm font-medium">
                    View all {post.comments.length} comments
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Posts</h1>
          <p className="text-gray-600">
            Discover insights from our alumni community
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setShowSaved(false);
              if (!posts.length) fetchPosts();
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              !showSaved
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            All Posts
          </button>
          <button
            onClick={() => {
              setShowSaved(true);
              fetchSavedPosts();
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              showSaved
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Saved Posts
          </button>
        </div>

        {/* Create post section */}
        {!showSaved && canCreatePost && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <img
                src={getAvatarUrl(user)}
                alt={user?.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
              />
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex-1 text-left px-6 py-4 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-all font-medium"
              >
                What would you like to share?
              </button>
              <button
                onClick={() => setShowCreatePost(true)}
                className="p-3 text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              >
                <FiPlus size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Sort options (only for all posts) */}
        {!showSaved && (
          <div className="flex items-center gap-4 mb-6">
            <span className="text-gray-700 font-medium">Sort by:</span>
            <button
              onClick={() => setSortBy("recent")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === "recent"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy("popular")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === "popular"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Popular
            </button>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>
            {showSaved ? (
              savedPosts.length > 0 ? (
                savedPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))
              ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-md border border-gray-200">
                  <FiBookmark className="mx-auto h-16 w-16 text-gray-300" />
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">
                    No Saved Posts
                  </h3>
                  <p className="mt-3 text-gray-600 max-w-sm mx-auto">
                    Posts you save will appear here for easy access later
                  </p>
                </div>
              )
            ) : posts.length > 0 ? (
              posts.map((post) => <PostCardComp key={post._id} post={post} />)
            ) : (
              <div className="text-center py-16 bg-white rounded-lg shadow-md border border-gray-200">
                <FiMessageCircle className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-6 text-xl font-semibold text-gray-900">
                  No Posts Yet
                </h3>
                <p className="mt-3 text-gray-600 max-w-sm mx-auto">
                  {canCreatePost
                    ? "Be the first to share something with the community!"
                    : "Check back soon for updates from our community!"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create post modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Create Post</h3>
              <button
                onClick={() => setShowCreatePost(false)}
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="p-4">
              <PostComposer
                onPosted={(newPost) => {
                  handleCreatePost(newPost || {});
                  setShowCreatePost(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsPage;
