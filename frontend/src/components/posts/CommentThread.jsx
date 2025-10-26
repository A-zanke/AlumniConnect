import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSend,
  FiReply,
  FiEdit,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiMoreHorizontal,
} from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../../context/AuthContext"; // Singular 'context'
import { socket } from "../../context/SocketContext"; // Assuming socket.io client is available here

const reactionTypes = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate" },
  { type: "support", emoji: "💪", label: "Support" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "curious", emoji: "🤔", label: "Curious" },
];

const CommentThread = ({ postId, comments = [], onCommentAdded }) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);

  // Fetch mention suggestions
  useEffect(() => {
    if (mentionQuery.length > 1) {
      axios
        .get(`/api/posts/users/search?q=${mentionQuery}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => setMentionSuggestions(res.data))
        .catch(console.error);
    } else {
      setMentionSuggestions([]);
    }
  }, [mentionQuery]);

  // Real-time updates: Join post room and listen for comment events
  useEffect(() => {
    socket.emit("post:join", { postId });
    socket.on("post:comment_added", (data) => {
      if (data.postId === postId) {
        onCommentAdded && onCommentAdded();
      }
    });
    return () => {
      socket.emit("post:leave", { postId });
      socket.off("post:comment_added");
    };
  }, [postId, onCommentAdded]);

  const handleSubmitComment = async (e, parentCommentId = null) => {
    e.preventDefault();
    if (!newComment.trim() || loading) return;

    try {
      setLoading(true);
      await axios.post(
        `/api/posts/${postId}/comment`,
        { content: newComment, parentCommentId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setNewComment("");
      setReplyTo(null);
      onCommentAdded && onCommentAdded();
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      await axios.put(
        `/api/posts/comments/${commentId}`,
        { content: editContent },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setEditingComment(null);
      setEditContent("");
      onCommentAdded && onCommentAdded();
    } catch (error) {
      console.error("Failed to edit comment:", error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      await axios.delete(`/api/posts/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      onCommentAdded && onCommentAdded();
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleReactToComment = async (commentId, reactionType) => {
    try {
      await axios.post(
        `/api/posts/comments/${commentId}/react`,
        { type: reactionType },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      onCommentAdded && onCommentAdded();
    } catch (error) {
      console.error("Failed to react to comment:", error);
    }
  };

  const handleMentionSelect = (user) => {
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const before = newComment.substring(0, cursorPos);
    const after = newComment.substring(cursorPos);
    const mention = `@${user.username} `;
    setNewComment(before + mention + after);
    setMentionQuery("");
    setShowMentions(false);
    textarea.focus();
    textarea.setSelectionRange(
      cursorPos + mention.length,
      cursorPos + mention.length
    );
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setNewComment(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setMentionQuery("");
      setShowMentions(false);
    }
  };

  const renderMentions = (content) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.substring(1);
        return (
          <span
            key={index}
            style={{
              color: "#0A66C2",
              backgroundColor: "rgba(10, 102, 194, 0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={() => {
              /* Navigate to user profile */
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const Comment = ({ comment, depth = 0, maxDepth = 3 }) => {
    const [showReplies, setShowReplies] = useState(depth < 2); // Show first 2 levels expanded
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const isOwner = user && comment.author._id === user._id;
    const canReply = depth < maxDepth;

    const reactionCounts =
      comment.reactions?.reduce((acc, reaction) => {
        acc[reaction.type] = (acc[reaction.type] || 0) + 1;
        return acc;
      }, {}) || {};

    const userReaction = comment.reactions?.find(
      (r) => r.userId === user?._id
    )?.type;

    // Determine connecting line color based on depth
    const lineColor =
      depth === 1
        ? "#6366F1"
        : depth === 2
        ? "#8B5CF6"
        : depth === 3
        ? "#EC4899"
        : "#64748B";
    const fadeOpacity = depth > 2 ? 0.7 : 1;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative ${depth > 0 ? "ml-8 mt-2" : "mb-4"}`}
        style={{ opacity: fadeOpacity }}
        whileHover={{
          scale: 1.02,
          boxShadow: "0 4px 12px rgba(10, 102, 194, 0.1)",
        }}
        transition={{ duration: 0.3 }}
      >
        {depth > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 w-px ml-4"
            style={{ backgroundColor: lineColor }}
          />
        )}

        <div
          className="rounded-xl p-4"
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)",
          }}
        >
          <div className="flex items-start gap-3">
            {comment.author?.avatarUrl ? (
              <img
                src={comment.author.avatarUrl}
                alt={comment.author.name}
                className="w-8 h-8 rounded-full object-cover cursor-pointer"
                onClick={() => {
                  /* Navigate to profile */
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center cursor-pointer">
                <span className="text-white text-sm font-semibold">
                  {comment.author?.name?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-medium text-gray-900 cursor-pointer hover:underline"
                  onClick={() => {
                    /* Navigate to profile */
                  }}
                >
                  {comment.author?.name || "Unknown"}
                </span>
                {comment.author?.role && (
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {comment.author.role}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>

              {editingComment === comment._id ? (
                <div className="mb-2">
                  <textarea
                    ref={editTextareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEditComment(comment._id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingComment(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 mb-2">
                  {renderMentions(comment.content)}
                </p>
              )}

              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                    className={`flex items-center gap-1 text-sm transition ${
                      userReaction
                        ? "text-blue-600"
                        : "text-gray-600 hover:text-blue-600"
                    }`}
                  >
                    {userReaction
                      ? reactionTypes.find((r) => r.type === userReaction)
                          ?.emoji
                      : "👍"}
                    {Object.keys(reactionCounts).length > 0 && (
                      <span>
                        {Object.values(reactionCounts).reduce(
                          (a, b) => a + b,
                          0
                        )}
                      </span>
                    )}
                  </button>

                  {showReactionPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute bottom-full mb-2 rounded-lg p-2 shadow-lg z-10"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.98) 100%)",
                        border: "2px solid rgba(10, 102, 194, 0.2)",
                        boxShadow: "0 10px 40px rgba(10, 102, 194, 0.2)",
                      }}
                    >
                      <div className="flex gap-1">
                        {reactionTypes.map((reaction) => (
                          <motion.button
                            key={reaction.type}
                            onClick={() => {
                              handleReactToComment(comment._id, reaction.type);
                              setShowReactionPicker(false);
                            }}
                            className="p-2 rounded transition"
                            title={reaction.label}
                            whileHover={{
                              scale: 1.3,
                              background:
                                "linear-gradient(135deg, #0A66C2 0%, #6366F1 100%)",
                            }}
                            style={{
                              transition:
                                "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            }}
                          >
                            {reaction.emoji}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {canReply && (
                  <button
                    onClick={() =>
                      setReplyTo({
                        id: comment._id,
                        author: comment.author?.name,
                      })
                    }
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition"
                  >
                    <FiReply className="w-4 h-4" />
                    Reply
                  </button>
                )}

                {isOwner && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <FiMoreHorizontal className="w-4 h-4" />
                    </button>

                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                      >
                        <button
                          onClick={() => {
                            setEditingComment(comment._id);
                            setEditContent(comment.content);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 w-full text-left"
                        >
                          <FiEdit className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteComment(comment._id);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-100 text-red-600 w-full text-left"
                        >
                          <FiTrash2 className="w-4 h-4" /> Delete
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Reaction summary */}
              {Object.keys(reactionCounts).length > 0 && (
                <div className="flex gap-1 mt-2">
                  {Object.entries(reactionCounts)
                    .slice(0, 3)
                    .map(([type, count]) => (
                      <span
                        key={type}
                        className="text-sm bg-gray-200 px-2 py-1 rounded"
                      >
                        {reactionTypes.find((r) => r.type === type)?.emoji}{" "}
                        {count}
                      </span>
                    ))}
                  {Object.keys(reactionCounts).length > 3 && (
                    <span className="text-sm text-gray-500">
                      +{Object.keys(reactionCounts).length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {showReplies ? (
                <button
                  onClick={() => setShowReplies(false)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 mb-2"
                >
                  <FiChevronUp className="w-4 h-4" />
                  Hide replies ({comment.replies.length})
                </button>
              ) : (
                <button
                  onClick={() => setShowReplies(true)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 mb-2"
                >
                  <FiChevronDown className="w-4 h-4" />
                  Show replies ({comment.replies.length})
                </button>
              )}

              <AnimatePresence>
                {showReplies &&
                  comment.replies.map((reply) => (
                    <Comment
                      key={reply._id}
                      comment={reply}
                      depth={depth + 1}
                      maxDepth={maxDepth}
                    />
                  ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        💬 Comments ({comments.length})
      </h4>

      {/* Comment Form */}
      <form
        onSubmit={(e) => handleSubmitComment(e, replyTo?.id)}
        className="mb-6"
      >
        {replyTo && (
          <div className="mb-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
            Replying to {replyTo.author}
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="ml-2 text-blue-500 hover:text-blue-700"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaChange}
            placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none resize-none"
            rows={3}
            disabled={loading}
          />

          {showMentions && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto z-10">
              {mentionSuggestions.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleMentionSelect(user)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left"
                >
                  <img
                    src={user.avatarUrl || "/default-avatar.png"}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span>
                    {user.name} (@{user.username})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!newComment.trim() || loading}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              newComment.trim() && !loading
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-lg"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <FiSend className="w-4 h-4" />
            )}
            {replyTo ? "Reply" : "Comment"}
          </motion.button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        <AnimatePresence>
          {comments.map((comment) => (
            <Comment key={comment._id} comment={comment} />
          ))}
        </AnimatePresence>

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💭</div>
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentThread;
