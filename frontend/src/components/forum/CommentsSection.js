import React, { useState, useEffect } from 'react';
import { forumAPI } from '../utils/forumApi';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiThumbsUp, FiReply, FiUser } from 'react-icons/fi';

const CommentsSection = ({ postId, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const response = await forumAPI.getPost(postId);
      setComments(response.data?.data?.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || loading) return;

    try {
      setLoading(true);
      await forumAPI.addComment(postId, {
        content: newComment,
        parentComment: replyTo?.id || null
      });
      
      setNewComment('');
      setReplyTo(null);
      fetchComments();
      onCommentAdded && onCommentAdded();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvoteComment = async (commentId) => {
    try {
      await forumAPI.upvoteComment(commentId);
      fetchComments();
    } catch (error) {
      console.error('Failed to upvote comment:', error);
    }
  };

  const Comment = ({ comment, isReply = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-50 rounded-xl p-4 ${isReply ? 'ml-8 mt-2' : 'mb-4'}`}
    >
      <div className="flex items-start gap-3">
        {comment.author?.avatarUrl ? (
          <img
            src={comment.author.avatarUrl}
            alt={comment.author.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
            {comment.author?.name ? (
              <span className="text-white text-xs font-semibold">
                {comment.author.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <FiUser className="text-white text-xs" />
            )}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">
              {comment.isAnonymous ? 'Anonymous' : comment.author?.name || 'Unknown'}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>

          <p className="text-gray-700 mb-2">{comment.content}</p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleUpvoteComment(comment._id)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition"
            >
              <FiThumbsUp className="w-4 h-4" />
              {comment.upvotes?.length || 0}
            </button>

            {!isReply && (
              <button
                onClick={() => setReplyTo({ id: comment._id, author: comment.author?.name })}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition"
              >
                <FiReply className="w-4 h-4" />
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies would go here if implementing full threading */}
    </motion.div>
  );

  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        💬 Comments ({comments.length})
      </h4>

      {/* Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
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
        
        <div className="flex gap-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none resize-none"
            rows={3}
            disabled={loading}
          />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!newComment.trim() || loading}
            className={`px-4 py-3 rounded-xl transition flex items-center gap-2 ${
              newComment.trim() && !loading
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-lg'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <FiSend className="w-4 h-4" />
            )}
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

export default CommentsSection;