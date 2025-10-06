import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forumAPI } from '../utils/forumApi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageSquare, FiHeart, FiShare2, FiBookmark, FiMoreHorizontal,
  FiChevronLeft, FiChevronRight, FiTrash2, FiFlag, FiExternalLink
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import ShareModal from './ShareModal';
import Poll from './Poll';

const MAX_PREVIEW = 200;

const PostCard = ({ post, onChanged, full = false, currentUser }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const preview = useMemo(() => {
    if (full) return post.content;
    if (!post?.content) return '';
    if (post.content.length <= MAX_PREVIEW) return post.content;
    return post.content.slice(0, MAX_PREVIEW) + '...';
  }, [post, full]);

  const images = useMemo(() => {
    return post.media?.filter(m => m.type === 'image') || [];
  }, [post.media]);

  const links = useMemo(() => {
    return post.media?.filter(m => m.type === 'link') || [];
  }, [post.media]);

  const documents = useMemo(() => {
    return post.media?.filter(m => m.type === 'pdf') || [];
  }, [post.media]);

  const handleReaction = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await forumAPI.addReaction(post._id, 'like');
      onChanged && onChanged();
      toast.success('Reaction added!');
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await forumAPI.upvotePost(post._id);
      onChanged && onChanged();
    } catch (error) {
      console.error('Error upvoting:', error);
      toast.error('Failed to upvote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await forumAPI.bookmarkPost(post._id);
      onChanged && onChanged();
      toast.success(post.hasUserBookmarked ? 'Bookmark removed' : 'Post bookmarked!');
    } catch (error) {
      console.error('Error bookmarking:', error);
      toast.error('Failed to bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await forumAPI.deletePost(post._id);
      onChanged && onChanged();
      toast.success('Post deleted successfully');
      if (full) navigate('/forum');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsLoading(false);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const Author = () => {
    if (post.isAnonymous || !post.author) {
      return <span className="text-gray-500 font-medium">Anonymous</span>;
    }
    return (
      <Link 
        to={`/profile/${post.author.username || post.author._id}`} 
        className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
      >
        {post.author.name}
      </Link>
    );
  };

  const canDelete = post.author && currentUser && post.author._id === currentUser._id;

  return (
    <motion.div 
      layout
      className={`bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden ${
        full ? '' : 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300'
      }`}
    >
      {/* Category Header */}
      <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide">{post.category}</span>
          {(canDelete || full) && (
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <FiMoreHorizontal />
              </button>
              <AnimatePresence>
                {showOptions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px] z-10"
                  >
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <FiTrash2 className="text-sm" />
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => {/* Report functionality */}}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiFlag className="text-sm" />
                      Report
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Title */}
        <Link to={`/forum/${post._id}`} className="block mb-3">
          <h3 className="text-xl font-bold text-gray-900 hover:text-blue-700 transition-colors">
            {post.title}
          </h3>
        </Link>

        {/* Content */}
        <div className="mb-4 text-gray-700 whitespace-pre-wrap leading-relaxed">
          {preview}
          {!full && post.content?.length > MAX_PREVIEW && (
            <Link 
              to={`/forum/${post._id}`} 
              className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Read more
            </Link>
          )}
        </div>

        {/* Images Carousel */}
        {images.length > 0 && (
          <div className="mb-4 relative">
            <div className="relative overflow-hidden rounded-xl">
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex].url}
                alt={`Media ${currentImageIndex + 1}`}
                className="w-full h-64 object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    <FiChevronLeft />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    <FiChevronRight />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Links */}
        {links.length > 0 && (
          <div className="mb-4 space-y-2">
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <FiExternalLink />
                <span className="truncate">{link.url}</span>
              </a>
            ))}
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div className="mb-4 space-y-2">
            {documents.map((doc, idx) => (
              <a
                key={idx}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>📄</span>
                <span className="truncate">{doc.filename || 'Document'}</span>
              </a>
            ))}
          </div>
        )}

        {/* Poll */}
        {post.poll && (
          <div className="mb-4">
            <Poll post={post} onVoted={onChanged} />
          </div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.map((tag, idx) => (
              <motion.span
                key={idx}
                whileHover={{ scale: 1.05 }}
                className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700 font-medium"
              >
                #{tag}
              </motion.span>
            ))}
          </div>
        )}

        {/* Author and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              By <Author />
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Reaction Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleReaction}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                post.hasUserReacted
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <FiHeart className={post.hasUserReacted ? 'fill-current' : ''} />
              <span>{post.reactionsCount || 0}</span>
            </motion.button>

            {/* Upvote Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleUpvote}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                post.hasUserUpvoted
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <span>▲</span>
              <span>{post.upvotesCount || 0}</span>
            </motion.button>

            {/* Comment Button */}
            <Link
              to={`/forum/${post._id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-medium bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <FiMessageSquare />
              <span>{post.commentCount || 0}</span>
            </Link>

            {/* Share Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-medium bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-600 transition-all"
            >
              <FiShare2 />
            </motion.button>

            {/* Bookmark Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleBookmark}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all ${
                post.hasUserBookmarked
                  ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                  : 'bg-gray-50 text-gray-700 hover:bg-yellow-50 hover:text-yellow-600'
              }`}
            >
              <FiBookmark className={post.hasUserBookmarked ? 'fill-current' : ''} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          post={post}
          onClose={() => setShowShareModal(false)}
          onShared={onChanged}
        />
      )}
    </motion.div>
  );
};

export default PostCard;