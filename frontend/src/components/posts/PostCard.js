import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiBookmark,
  FiMoreHorizontal,
  FiTrash2,
  FiEdit2,
  FiThumbsUp,
  FiSmile,
  FiTrendingUp,
  FiEye,
  FiSend,
  FiFile ,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import "../../styles/PostCard.css";

const PostCard = ({ post, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const commentInputRef = useRef(null);

  const isOwner = user && user.id === post.user?._id;
  const canCreatePosts =
    user && ["teacher", "alumni", "admin"].includes(user.role);

  // Reaction types with icons
  const reactionTypes = {
    like: { icon: FiThumbsUp, label: "Like", color: "#0066cc" },
    love: { icon: FiHeart, label: "Love", color: "#e74c3c" },
    celebrate: { icon: FiSmile, label: "Celebrate", color: "#f39c12" },
    support: { icon: FiTrendingUp, label: "Support", color: "#27ae60" },
    insightful: { icon: FiEye, label: "Insightful", color: "#9b59b6" },
    curious: { icon: "🤔", label: "Curious", color: "#34495e" },
  };

  // Handle reaction
  const handleReaction = async (type) => {
    const originalPost = { ...post };
    const existingReaction = post.userReaction;
    let updatedReactions = [...(post.reactions || [])];
    let updatedPost;

    if (existingReaction && existingReaction.type === type) {
      // Remove reaction
      updatedReactions = updatedReactions.filter(
        (r) => String(r.userId) !== String(user.id)
      );
      updatedPost = {
        ...post,
        reactions: updatedReactions,
        userReaction: null,
      };
    } else if (existingReaction) {
      // Change reaction
      updatedReactions = updatedReactions.map((r) =>
        String(r.userId) === String(user.id) ? { ...r, type } : r
      );
      updatedPost = {
        ...post,
        reactions: updatedReactions,
        userReaction: { ...existingReaction, type },
      };
    } else {
      // New reaction
      const reaction = { userId: user.id, type };
      updatedReactions.push(reaction);
      updatedPost = {
        ...post,
        reactions: updatedReactions,
        userReaction: reaction,
      };
    }

    onUpdate(updatedPost);

    try {
      const response = await axios.post(
        `/api/posts/${post._id}/react`,
        { type },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      onUpdate(response.data);
    } catch (error) {
      toast.error("Failed to react");
      onUpdate(originalPost);
    }
  };

  // Handle bookmark
  const handleBookmark = async () => {
    const originalPost = { ...post };
    const updatedPost = { ...post, isBookmarked: !post.isBookmarked };
    onUpdate(updatedPost);

    try {
      const response = await axios.post(
        `/api/posts/${post._id}/bookmark`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(response.data.message);
    } catch (error) {
      toast.error("Failed to bookmark");
      onUpdate(originalPost);
    }
  };

  // Handle comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsCommenting(true);
    try {
      const response = await axios.post(
        `/api/posts/${post._id}/comment`,
        { content: newComment },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      const updatedPost = {
        ...post,
        comments: [...(post.comments || []), response.data],
      };
      onUpdate(updatedPost);
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await axios.delete(`/api/posts/${post._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success("Post deleted");
        onDelete(post._id);
      } catch (error) {
        toast.error("Failed to delete post");
      }
    }
  };

  // Handle share (copy link)
  const handleShare = () => {
    const url = `${window.location.origin}/posts/${post._id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard");
    });
  };

  // Get reaction summary
  const getReactionSummary = () => {
    const reactions = post.reactions || [];
    const counts = {};
    reactions.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  // Render media
  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;

    return (
      <div className="post-media-container">
        {post.media.map((media, index) => (
          <div key={index} className="post-media-item">
            {media.type === "image" ? (
              <img
                src={media.url}
                alt="Post media"
                className="post-media-image"
                loading="lazy"
              />
            ) : media.type === "video" ? (
              <video
                src={media.url}
                controls
                className="post-media-video"
                preload="metadata"
              />
            ) : (
              <div className="post-media-file">
                <FiFile />
                <span>{media.originalName || "Document"}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.article
      className="post-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      {/* Post Header */}
      <header className="post-header">
        <div className="post-author-info">
          <img
            src={
              post.user?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${post.user?.name}&background=random`
            }
            alt={post.user?.name}
            className="post-author-avatar"
          />
          <div className="post-author-details">
            <h4 className="post-author-name">
              {post.user?.name || "Unknown User"}
            </h4>
            <div className="post-meta">
              <span className="post-author-role">{post.user?.role}</span>
              <span className="post-separator">•</span>
              <span className="post-department">{post.user?.department}</span>
              <span className="post-separator">•</span>
              <time className="post-time">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </time>
            </div>
          </div>
        </div>

        {/* Department badges */}
        <div className="post-departments">
          {post.departments?.map((dept) => (
            <span key={dept} className="department-badge">
              {dept}
            </span>
          ))}
        </div>

        {/* Menu */}
        {isOwner && (
          <div className="post-menu">
            <button
              className="menu-trigger"
              onClick={() => setShowMenu(!showMenu)}
            >
              <FiMoreHorizontal />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  className="menu-dropdown"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <button onClick={handleDelete} className="menu-item danger">
                    <FiTrash2 />
                    Delete Post
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      {/* Post Content */}
      <div className="post-content">
        <div
          className="post-text"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        {renderMedia()}
      </div>

      {/* Reaction Summary */}
      {post.reactions && post.reactions.length > 0 && (
        <div className="reaction-summary">
          <div className="reaction-icons">
            {getReactionSummary().map(([type]) => {
              const ReactionIcon = reactionTypes[type]?.icon || FiThumbsUp;
              return (
                <div
                  key={type}
                  className="reaction-icon"
                  style={{ color: reactionTypes[type]?.color }}
                >
                  <ReactionIcon size={16} />
                </div>
              );
            })}
          </div>
          <span className="reaction-count">
            {post.reactions.length}{" "}
            {post.reactions.length === 1 ? "reaction" : "reactions"}
          </span>
          <span className="comment-count">
            {post.comments?.length || 0}{" "}
            {(post.comments?.length || 0) === 1 ? "comment" : "comments"}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="post-actions">
        <div className="primary-actions">
          <ActionButton
            icon={reactionTypes[post.userReaction?.type]?.icon || FiThumbsUp}
            label="Like"
            active={!!post.userReaction}
            onClick={() => handleReaction("like")}
            color={
              post.userReaction
                ? reactionTypes[post.userReaction.type]?.color
                : undefined
            }
          />
          <ActionButton
            icon={FiMessageCircle}
            label="Comment"
            onClick={() => {
              setShowComments(!showComments);
              if (!showComments) {
                setTimeout(() => commentInputRef.current?.focus(), 100);
              }
            }}
          />
          <ActionButton icon={FiShare2} label="Share" onClick={handleShare} />
        </div>
        <ActionButton
          icon={FiBookmark}
          label="Save"
          active={post.isBookmarked}
          onClick={handleBookmark}
        />
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            className="comments-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="comment-form">
              <img
                src={
                  user?.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                }
                alt={user?.name}
                className="comment-avatar"
              />
              <div className="comment-input-container">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="comment-input"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isCommenting}
                  className="comment-submit"
                >
                  <FiSend />
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="comments-list">
              {post.comments?.map((comment) => (
                <motion.div
                  key={comment._id}
                  className="comment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <img
                    src={
                      comment.userId?.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${comment.userId?.name}&background=random`
                    }
                    alt={comment.userId?.name}
                    className="comment-avatar"
                  />
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">
                        {comment.userId?.name}
                      </span>
                      <time className="comment-time">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </time>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};

// Action Button Component
const ActionButton = ({ icon: Icon, label, active, onClick, color }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    className={`action-btn ${active ? "active" : ""}`}
    onClick={onClick}
    style={active && color ? { color } : {}}
  >
    <Icon size={18} />
    <span>{label}</span>
  </motion.button>
);

export default PostCard;
