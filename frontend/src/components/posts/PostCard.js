import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiMoreHorizontal,
  FiTrash2,
  FiEdit2,
  FiThumbsUp,
  FiSmile,
  FiTrendingUp,
  FiEye,
  FiSend,
  FiFile,
} from "react-icons/fi";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import "../../styles/PostCard.css";
import ShareModal from "./ShareModal.jsx";

// Shared socket instance to avoid creating a socket per PostCard instance
let __sharedSocket = null;
const getSharedSocket = () => {
  if (!__sharedSocket) {
    const token = localStorage.getItem('token');
    __sharedSocket = io('/', { auth: { token } });
  }
  return __sharedSocket;
};

const PostCard = ({ post, onUpdate, onDelete, onReport }) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Ensure computeCounts is declared before being used
  const computeCounts = (reactionsArr = []) => {
    if (!Array.isArray(reactionsArr)) return {};
    return reactionsArr.reduce((acc, r) => {
      const t = r?.type || 'like';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
  };

  const [reactionCount, setReactionCount] = useState(
    (typeof post?.totalReactions === 'number' ? post.totalReactions : undefined) ??
    (Array.isArray(post?.reactions) ? post.reactions.length : 0)
  );
  const [reactionCounts, setReactionCounts] = useState(() => (
    post?.reactionCounts ?? computeCounts(post?.reactions)
  ));
  const [userReaction, setUserReaction] = useState(post?.userReaction ?? null);
  const [showReactors, setShowReactors] = useState(false);
  const [reactors, setReactors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const commentInputRef = useRef(null);

  const topReactions = useMemo(() => {
    const entries = Object.entries(reactionCounts || {}).filter(([, c]) => c > 0);
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 3);
    const total = entries.reduce((s, [, c]) => s + c, 0);
    const topSum = top.reduce((s, [, c]) => s + c, 0);
    const rest = Math.max(total - topSum, 0);
    return { top, rest, total };
  }, [reactionCounts]);

  const isOwner = user && user.id === post.user?._id;
  const canCreatePosts =
    user && ["teacher", "alumni", "admin"].includes(user.role);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !post?._id) return;
    const s = getSharedSocket();
    try { s.emit('post:join', { postId: post._id }); } catch {}
    const onReactionUpdated = (payload) => {
      if (payload?.postId === post._id) {
        if (payload.reactionCounts) setReactionCounts(payload.reactionCounts);
        if (payload.counts) setReactionCounts(payload.counts);
        const total = payload.counts
          ? Object.values(payload.counts).reduce((a, b) => a + (b || 0), 0)
          : (payload.reactionCounts
              ? Object.values(payload.reactionCounts).reduce((a, b) => a + (b || 0), 0)
              : undefined);
        if (typeof total === 'number') setReactionCount(total);
        if (payload.userReaction) setUserReaction(payload.userReaction);
      }
    };
    s.on('post:reaction_updated', onReactionUpdated);
    (async () => {
      try {
        const res = await axios.get(`/api/posts/${post._id}/reactions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const grouped = res?.data?.reactions || {};
        const counts = Object.fromEntries(
          Object.entries(grouped).map(([k, arr]) => [k, Array.isArray(arr) ? arr.length : 0])
        );
        setReactionCounts(counts);
        setReactionCount(Object.values(counts).reduce((a, b) => a + b, 0));
      } catch {}
    })();
    return () => {
      try { s.emit('post:leave', { postId: post._id }); } catch {}
      try { s.off('post:reaction_updated', onReactionUpdated); } catch {}
    };
  }, [post?._id]);

  const REACTIONS = [
    { key: 'like', label: '👍' },
    { key: 'love', label: '❤️' },
    { key: 'laugh', label: '😂' },
    { key: 'wow', label: '😮' },
    { key: 'sad', label: '😢' },
    { key: 'angry', label: '😡' }
  ];
  const EMOJI_BY_KEY = useMemo(() => Object.fromEntries(REACTIONS.map(r => [r.key, r.label])), []);

  // Handle reaction
  const handleReaction = async (type = 'like') => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await axios.post(
        `/api/posts/${post._id}/react`,
        { type },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const data = res?.data;
      if (data) {
        const counts = data.counts || data.reactionCounts || {};
        setReactionCounts(counts);
        const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
        setReactionCount(total);
        if (typeof data.userReaction !== 'undefined') setUserReaction(data.userReaction);
      }
      onUpdate && onUpdate();
      setShowReactionsPicker(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to react');
    } finally {
      setIsLoading(false);
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
    if (window.confirm("Are you sure you want to delete this post permanently?")) {
      try {
        await axios.delete(`/api/posts/${post._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success("Post deleted permanently");
        onDelete(post._id);
      } catch (error) {
        toast.error("Failed to delete post");
        console.error("Delete error:", error);
      }
    }
  };

  // Handle share - open modal
  const handleShare = () => {
    setShowShareModal(true);
  };

  const openReactors = async () => {
    try {
      const res = await axios.get(`/api/posts/${post._id}/reactions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const grouped = res?.data?.reactions || {};
      const list = Object.entries(grouped).flatMap(([type, users]) =>
        (Array.isArray(users) ? users : []).map((u) => ({ user: u, type }))
      );
      setReactors(list);
      setShowReactors(true);
    } catch (e) {
      console.error('Failed to load reactors', e);
    }
  };

  // Render media with carousel for multiple attachments
  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;

    const media = post.media[currentMediaIndex];
    const hasMultiple = post.media.length > 1;

    return (
      <div className="post-media-container">
        <div className="post-media-item">
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
              <FiFile size={32} />
              <span>{media.originalName || "Document"}</span>
            </div>
          )}
        </div>

        {/* Carousel controls */}
        {hasMultiple && (
          <div className="media-carousel-controls">
            <button
              className="carousel-btn prev"
              onClick={() =>
                setCurrentMediaIndex(
                  (currentMediaIndex - 1 + post.media.length) % post.media.length
                )
              }
            >
              ‹
            </button>
            <div className="carousel-indicators">
              {post.media.map((_, idx) => (
                <button
                  key={idx}
                  className={`indicator ${idx === currentMediaIndex ? "active" : ""}`}
                  onClick={() => setCurrentMediaIndex(idx)}
                />
              ))}
            </div>
            <button
              className="carousel-btn next"
              onClick={() =>
                setCurrentMediaIndex((currentMediaIndex + 1) % post.media.length)
              }
            >
              ›
            </button>
          </div>
        )}
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

        {/* Menu - Delete & Report */}
        <div className="post-menu">
          <button
            className="menu-trigger"
            onClick={() => setShowMenu(!showMenu)}
          >
            <FiMoreHorizontal size={20} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                className="menu-dropdown"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                {isOwner && (
                  <button onClick={handleDelete} className="menu-item danger">
                    <FiTrash2 size={16} />
                    Delete Post
                  </button>
                )}
                {!isOwner && (
                  <button onClick={() => {
                    setShowMenu(false);
                    onReport(post._id);
                  }} className="menu-item">
                    <FiTrash2 size={16} />
                    Report Post
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Post Content */}
      <div className="post-content">
        <div
          className="post-text"
          style={{ color: '#1E293B' }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        {renderMedia()}
      </div>



      {/* Action Buttons - Simplified Like / Comment / Share */}
      <div className="post-actions">
        <div className="flex items-center gap-4 relative">
          {/* Like / Reactions */}
          <button
            onClick={() => setShowReactionsPicker(v => !v)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 text-gray-700"
            title="React"
          >
            {userReaction ? (
              <span className="text-lg" aria-label={userReaction}>{EMOJI_BY_KEY[userReaction] || '👍'}</span>
            ) : (
              <FiHeart />
            )}
            <span onClick={(e) => { e.stopPropagation(); openReactors(); }} className="cursor-pointer" title="View who reacted">
              {reactionCount}
            </span>
          </button>

          {showReactionsPicker && (
            <div className="absolute -top-12 left-0 bg-white border border-gray-200 rounded-full shadow p-2 flex gap-2 z-10">
              {REACTIONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleReaction(r.key)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 text-lg"
                  title={r.key}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {/* Comment */}
          <button
            onClick={() => {
              setShowComments(!showComments);
              if (!showComments) setTimeout(() => commentInputRef.current?.focus(), 100);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 text-gray-700"
            title="Comment"
          >
            <FiMessageCircle />
            <span>{post.comments?.length || 0}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 text-gray-700"
            title="Share"
          >
            <FiShare2 />
          </button>
        </div>
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
                    <div className="comment-actions">
                      <button className="comment-action-btn" title="Like comment">
                        👍
                      </button>
                      <button className="comment-action-btn" title="Reply to comment">
                        Reply
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reactors Modal */}
      {showReactors && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowReactors(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-gray-900">Reactions</div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowReactors(false)}>Close</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {reactors.length === 0 && <div className="text-sm text-gray-500">No reactions yet</div>}
              {reactors.map((r, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-lg">
                    {r.type === 'like' ? '👍' : r.type === 'love' ? '❤️' : r.type === 'laugh' ? '😂' : r.type === 'wow' ? '😮' : r.type === 'sad' ? '😢' : '😡'}
                  </span>
                  <img src={r.user?.avatarUrl || '/default-avatar.png.jpg'} alt={r.user?.name} className="w-8 h-8 rounded-full object-cover" />
                  <div className="font-medium text-gray-900">{r.user?.name || 'User'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          post={post}
          onClose={() => setShowShareModal(false)}
          onShared={onUpdate}
        />
      )}
    </motion.article>
  );
};

// Action Button Component
const ActionButton = ({ icon: Icon, active, onClick, color, title, size = 20 }) => (
  <button
    className={`action-btn ${active ? "active" : ""}`}
    onClick={onClick}
    style={active && color ? { color } : {}}
    title={title}
  >
    <Icon size={size} />
  </button>
);

export default PostCard;
