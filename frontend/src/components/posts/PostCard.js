import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FiMessageSquare,
  FiRepeat,
  FiHeart,
  FiBookmark,
  FiMoreHorizontal,
  FiTrash2,
  FiEdit2,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import "./PostCard.css";

const PostCard = ({ post, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const isOwner = user && user.id === post.user?._id;

  const handleReaction = async (type) => {
    // Optimistic update
    const originalPost = { ...post };
    const existingReaction = post.userReaction;
    let updatedReactions = [...post.reactions];
    let updatedPost;

    if (existingReaction && existingReaction.type === type) {
      // Toggling off
      updatedReactions = updatedReactions.filter(
        (r) => !r.userId.equals(user.id)
      );
      updatedPost = {
        ...post,
        reactions: updatedReactions,
        userReaction: null,
      };
    } else if (existingReaction) {
      // Changing reaction
      updatedReactions = updatedReactions.map((r) =>
        r.userId.equals(user.id) ? { ...r, type } : r
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
      toast.error("Failed to react.");
      onUpdate(originalPost); // Revert on failure
    }
  };

  const handleBookmark = async () => {
    const originalPost = { ...post };
    const updatedPost = { ...post, isBookmarked: !post.isBookmarked };
    onUpdate(updatedPost);

    try {
      await axios.post(
        `/api/posts/${post._id}/bookmark`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(updatedPost.isBookmarked ? "Post saved!" : "Post unsaved.");
    } catch (error) {
      toast.error("Could not save post.");
      onUpdate(originalPost);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

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
        comments: [...post.comments, response.data],
      };
      onUpdate(updatedPost);
      setNewComment("");
    } catch (error) {
      toast.error("Failed to add comment.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await axios.delete(`/api/posts/${post._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success("Post deleted.");
        onDelete(post._id);
      } catch (error) {
        toast.error("Failed to delete post.");
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      className="post-card"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      layout
    >
      <div className="post-header">
        <img
          src={
            post.user?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${post.user?.name}&background=random`
          }
          alt={post.user?.name}
          className="post-avatar"
        />
        <div className="post-user-info">
          <span className="post-user-name">
            {post.user?.name || "Unknown User"}
          </span>
          <span className="post-meta">
            {post.user?.role} ·{" "}
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
        </div>
        {isOwner && (
          <div className="post-menu">
            <FiMoreHorizontal />
            <div className="dropdown-content">
              <button onClick={handleDelete}>
                <FiTrash2 /> Delete Post
              </button>
            </div>
          </div>
        )}
      </div>
      <div
        className="post-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {post.media?.length > 0 && (
        <div className="post-media">
          {post.media[0].type === "image" ? (
            <img src={post.media[0].url} alt="Post media" />
          ) : (
            <video src={post.media[0].url} controls />
          )}
        </div>
      )}
      <div className="post-stats">
        <span>{post.reactions?.length || 0} Reactions</span>
        <span>{post.comments?.length || 0} Comments</span>
      </div>
      <div className="post-actions">
        <ActionButton
          icon={<FiHeart />}
          label="React"
          active={!!post.userReaction}
          onClick={() => handleReaction("like")}
        />
        <ActionButton
          icon={<FiMessageSquare />}
          label="Comment"
          onClick={() => setShowComments(!showComments)}
        />
        <ActionButton
          icon={<FiBookmark />}
          label="Save"
          active={post.isBookmarked}
          onClick={handleBookmark}
        />
      </div>
      {showComments && (
        <div className="comment-section">
          <form onSubmit={handleAddComment} className="comment-form">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
            />
            <button type="submit">Post</button>
          </form>
          <div className="comments-list">
            {post.comments.map((comment) => (
              <div key={comment._id} className="comment">
                <img
                  src={
                    comment.userId?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${comment.userId?.name}&background=random`
                  }
                  alt={comment.userId?.name}
                  className="comment-avatar"
                />
                <div className="comment-body">
                  <span className="comment-user">{comment.userId?.name}</span>
                  <p>{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const ActionButton = ({ icon, label, active, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    className={`action-btn ${active ? "active" : ""}`}
    onClick={onClick}
  >
    {icon} <span>{label}</span>
  </motion.button>
);

export default PostCard;
