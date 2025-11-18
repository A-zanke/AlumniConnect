import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import PostCard from '../components/posts/PostCard';
import ReactionListModal from '../components/posts/ReactionListModal';
import ShareModal from '../components/posts/ShareModal';
import ConnectionButton from '../components/network/ConnectionButton';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiSearch, FiHeart, FiMessageCircle, FiShare2,
  FiBookmark, FiMoreVertical, FiChevronLeft, FiChevronRight,
  FiX, FiSend, FiImage, FiFile, FiTrash2, FiFlag, FiEye,
  FiUpload, FiVideo, FiCheck, FiArrowLeft
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// LinkedIn-style Professional Reactions
const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: '#0a66c2' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate', color: '#6dae4f' },
  { type: 'clap', emoji: '👏', label: 'Clap', color: '#df704d' },
  { type: 'love', emoji: '❤️', label: 'Love', color: '#df704d' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', color: '#f5c675' },
  { type: 'funny', emoji: '😂', label: 'Funny', color: '#8c5e3c' }
];

const PostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isDetailView = !!id && id !== 'saved';
  const isSavedView = location.pathname === '/posts/saved';
  
  const [posts, setPosts] = useState([]);
  const [singlePost, setSinglePost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [sortOption, setSortOption] = useState('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [reactionUsers, setReactionUsers] = useState({});
  const [showMoreMenu, setShowMoreMenu] = useState(null);
  
  // Create post form
  const [postContent, setPostContent] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Comment and interaction states
  const [commentInputs, setCommentInputs] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [socket, setSocket] = useState(null);
  
  const canCreatePost = ['teacher', 'alumni', 'admin'].includes(user?.role);
  const departments = ['CSE', 'AI-DS', 'E&TC', 'Mechanical', 'Civil', 'Other', 'All'];
  
  const availableDepartments = useMemo(() => {
    if (user?.role === 'student') {
      return [user.department, 'All'];
    }
    return departments;
  }, [user]);
  
  useEffect(() => {
    const newSocket = io(API_URL, {
      auth: { token: localStorage.getItem('token') }
    });
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);
  
  useEffect(() => {
    if (user) {
      fetchPosts();
      
      // Set up socket connection if not already established
      if (!window.socket) {
        window.socket = io(API_URL, { withCredentials: true });
      }
      
      // Listen for connection updates
      const handleConnectionUpdate = (data) => {
        // If the current user removed someone or was removed by someone
        if ((data.userId === user._id || data.targetUserId === user._id) && data.status === 'removed') {
          // Refresh posts to update connection status
          fetchPosts();
          
          // If viewing a single post, refresh that specifically
          if (singlePost && (singlePost.userId._id === data.targetUserId || singlePost.userId._id === data.userId)) {
            fetchSinglePost();
          }
        }
      };
      
      window.socket.on('connection:updated', handleConnectionUpdate);
      
      // Clean up event listener on component unmount
      return () => {
        if (window.socket) {
          window.socket.off('connection:updated', handleConnectionUpdate);
        }
      };
    }
    // eslint-disable-next-line
  }, [user, page, departmentFilter, sortOption, searchQuery]);
  
  useEffect(() => {
    if (!isDetailView) {
      fetchPosts();
    }
  }, [isDetailView, searchQuery, departmentFilter, sortOption, page]);
  
  useEffect(() => {
    if (isDetailView) {
      fetchSinglePost();
    }
  }, [isDetailView, id]);
  
  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // If "My Posts" is selected, fetch user's posts
      let endpoint = isSavedView ? '/api/posts/saved' : '/api/posts';
      if (sortOption === 'my-posts' && user?._id) {
        endpoint = `/api/posts/user/${user._id}`;
      }
      
      const response = await axios.get(endpoint, {
        params: (isSavedView || sortOption === 'my-posts') ? {} : {
          q: searchQuery,
          filter: departmentFilter !== 'All' ? 'by-department' : undefined,
          sort: sortOption,
          page,
          limit: 10
        }
      });
      
      const postsData = Array.isArray(response.data) ? response.data : (response.data.posts || response.data.data || []);
      
      if (page === 1) {
        setPosts(postsData);
      } else {
        setPosts(prev => [...prev, ...postsData]);
      }
      
      setHasMore(!isSavedView && sortOption !== 'my-posts' && postsData.length === 10);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSinglePost = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/posts/${id}`);
      setSinglePost(response.data);
    } catch (error) {
      toast.error('Failed to load post');
      navigate('/posts');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReaction = async (postId, reactionType) => {
    try {
      const response = await axios.post(`/api/posts/${postId}/react`, { type: reactionType });
      if (isDetailView) {
        setSinglePost(prev => ({
          ...prev,
          reactionCounts: response.data.reactionCounts,
          userReaction: response.data.userReaction
        }));
      } else {
        setPosts(prev => prev.map(post =>
          post._id === postId ? { ...post, ...response.data } : post
        ));
      }
    } catch (error) {
      toast.error('Failed to react');
    }
  };
  
  const handleComment = async (postId, content, parentCommentId = null) => {
    if (!content?.trim()) return;
    
    try {
      await axios.post(`/api/posts/${postId}/comment`, { 
        content,
        parentCommentId 
      });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setReplyTo(null);
      toast.success('Comment added!');
      if (isDetailView) fetchSinglePost();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };
  
  const handleCommentReaction = async (postId, commentId, type) => {
    try {
      await axios.post(`/api/posts/comments/${commentId}/react`, { type });
      if (isDetailView) fetchSinglePost();
    } catch (error) {
      toast.error('Failed to react to comment');
    }
  };
  
  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    
    try {
      await axios.delete(`/api/posts/${postId}/comments/${commentId}`);
      toast.success('Comment deleted');
      if (isDetailView) fetchSinglePost();
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };
  
  const handleBookmark = async (postId) => {
    try {
      const response = await axios.post(`/api/posts/${postId}/bookmark`);
      if (isDetailView) {
        setSinglePost(prev => ({ ...prev, isBookmarked: response.data.bookmarked }));
      } else {
        setPosts(prev => prev.map(post =>
          post._id === postId ? { ...post, isBookmarked: response.data.bookmarked } : post
        ));
      }
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Failed to bookmark');
    }
  };
  
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && mediaFiles.length === 0) {
      toast.error('Please add content or media');
      return;
    }
    
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('content', postContent);
      formData.append('departments', JSON.stringify(selectedDepartments.length > 0 ? selectedDepartments : ['All']));
      formData.append('tags', JSON.stringify(tags));
      
      mediaFiles.forEach(file => {
        formData.append('media', file);
      });
      
      await axios.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Post created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      setPage(1);
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };
  
  const resetCreateForm = () => {
    setPostContent('');
    setSelectedDepartments([]);
    setMediaFiles([]);
    setMediaPreviews([]);
    setTags([]);
    setTagInput('');
  };
  
  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + mediaFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    
    setMediaFiles(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviews(prev => [...prev, { url: reader.result, type: file.type, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  };
  
  const toggleDepartment = (dept) => {
    if (dept === 'All') {
      setSelectedDepartments(['All']);
    } else {
      setSelectedDepartments(prev => {
        const filtered = prev.filter(d => d !== 'All');
        if (filtered.includes(dept)) {
          return filtered.filter(d => d !== dept);
        } else {
          return [...filtered, dept];
        }
      });
    }
  };
  
  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await axios.delete(`/api/posts/${postId}`);
      toast.success('Post deleted');
      if (isDetailView) {
        navigate('/posts');
      } else {
        setPosts(prev => prev.filter(post => post._id !== postId));
      }
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };
  
  const toggleExpanded = (postId) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };
  
  const renderPostCard = (post) => (
    <motion.div
      key={post._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 mb-6"
    >
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={post.user?.avatarUrl || '/default-avatar.png'}
              alt={post.user?.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <Link
                  to={`/profile/id/${post.user?._id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600 leading-tight"
                >
                  {post.user?.name}
                </Link>
                {post.user?.role && (
                  <span className="inline-flex w-max px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600">
                    {post.user?.role}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{post.user?.department}</span>
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            {post.user?._id !== user?._id && (
              <>
                <div className="sm:hidden">
                  <ConnectionButton
                    userId={post.user?._id}
                    variant="icon"
                    hideConnected
                  />
                </div>
                <div className="hidden sm:block">
                  <ConnectionButton
                    userId={post.user?._id}
                    variant="compact"
                  />
                </div>
              </>
            )}
            
            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(showMoreMenu === post._id ? null : post._id)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiMoreVertical className="w-5 h-5 text-gray-600" />
              </button>
              
              {showMoreMenu === post._id && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                  {(post.isOwner || user?.role === 'admin') && (
                    <button
                      onClick={() => {
                        handleDelete(post._id);
                        setShowMoreMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-red-600"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      <span>Delete Post</span>
                    </button>
                  )}
                  {!post.isOwner && (
                    <button
                      onClick={() => {
                        setSelectedPost(post);
                        setShowReportModal(true);
                        setShowMoreMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-gray-700"
                    >
                      <FiFlag className="w-4 h-4" />
                      <span>Report Post</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <p className="text-gray-800 whitespace-pre-wrap mb-4">
          {post.content?.length > 300 && !expandedPosts[post._id] && !isDetailView
            ? post.content.substring(0, 300) + '...'
            : post.content}
        </p>
        {post.content?.length > 300 && !isDetailView && (
          <button
            onClick={() => toggleExpanded(post._id)}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-4"
          >
            {expandedPosts[post._id] ? 'Show less' : 'Read more'}
          </button>
        )}
        
        <MediaCarousel media={post.media} />
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="px-4 sm:px-6 py-3 border-t border-b border-gray-100 flex flex-wrap items-center justify-between text-xs sm:text-sm text-gray-600 gap-y-2">
        <div className="flex items-center gap-3">
          {post.totalReactions > 0 && (
            <button
              onClick={async () => {
                try {
                  const response = await axios.get(`/api/posts/${post._id}/reactions`);
                  setReactionUsers(response.data.reactions);
                  setSelectedPost(post);
                  setShowReactionModal(true);
                } catch (error) {
                  toast.error('Failed to load reactions');
                }
              }}
              className="flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <span className="flex -space-x-1">
                {Object.keys(post.reactionCounts || {}).slice(0, 3).map(type => {
                  const reaction = REACTIONS.find(r => r.type === type);
                  return reaction ? <span key={type} className="text-xl">{reaction.emoji}</span> : null;
                })}
              </span>
              <span>{post.totalReactions}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>{post.totalComments || 0} comments</span>
          <span>{post.shareCount || 0} shares</span>
        </div>
      </div>
      
      <div className="p-3 sm:p-4 flex items-center justify-between sm:justify-around gap-2 text-xs sm:text-sm">
        <ReactionPicker
          post={post}
          onReact={(type) => handleReaction(post._id, type)}
        />
        
        <button
          onClick={() => isDetailView ? null : navigate(`/posts/${post._id}`)}
          className="flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 sm:px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiMessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Comment</span>
        </button>
        
        <button
          onClick={() => {
            setSelectedPost(post);
            setShowShareModal(true);
          }}
          className="flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 sm:px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiShare2 className="w-5 h-5" />
          <span className="hidden sm:inline">Share</span>
        </button>
        
        <button
          onClick={() => handleBookmark(post._id)}
          className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 sm:px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors ${
            post.isBookmarked ? 'text-blue-600' : ''
          }`}
        >
          <FiBookmark className="w-5 h-5" />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>
      
      {isDetailView && (
        <CommentSection
          post={post}
          currentUser={user}
          onAddComment={handleComment}
          onReactToComment={handleCommentReaction}
          onDeleteComment={handleDeleteComment}
        />
      )}
    </motion.div>
  );
  
  if (loading && (!posts.length && !singlePost)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!isDetailView && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                {isSavedView && (
                  <button
                    onClick={() => navigate('/posts')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <FiArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h1 className="text-3xl font-bold text-gray-900">
                  {isSavedView ? 'Saved Posts' : sortOption === 'my-posts' ? 'My Posts' : 'Posts'}
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                {!isSavedView && (
                  <button
                    onClick={() => navigate('/posts/saved')}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FiBookmark className="w-5 h-5" />
                    <span>Saved</span>
                  </button>
                )}
                {canCreatePost && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    <FiPlus className="w-5 h-5" />
                    <span>Create Post</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="recent">Latest</option>
                  <option value="popular">Popular</option>
                  <option value="most-commented">Most Commented</option>
                  {canCreatePost && <option value="my-posts">My Posts</option>}
                </select>
              </div>
            </div>
          </div>
        )}
        
        {isDetailView && (
          <button onClick={() => navigate('/posts')} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6">
            <FiChevronLeft className="w-5 h-5" />
            <span>Back to Posts</span>
          </button>
        )}
        
        <AnimatePresence>
          {isDetailView ? (
            singlePost && renderPostCard(singlePost)
          ) : (
            posts.map(post => renderPostCard(post))
          )}
        </AnimatePresence>
        
        {!isDetailView && hasMore && !loading && (
          <div className="text-center mt-8">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <CreatePostModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        content={postContent}
        setContent={setPostContent}
        selectedDepartments={selectedDepartments}
        toggleDepartment={toggleDepartment}
        departments={departments}
        mediaFiles={mediaFiles}
        handleMediaUpload={handleMediaUpload}
        removeMedia={removeMedia}
        mediaPreviews={mediaPreviews}
        tags={tags}
        tagInput={tagInput}
        setTagInput={setTagInput}
        addTag={addTag}
        removeTag={removeTag}
        submitting={submitting}
      />
      
      <ReactionListModal
        open={showReactionModal}
        reactions={reactionUsers}
        onClose={() => {
          setShowReactionModal(false);
          setReactionUsers({});
        }}
      />
      
      <ShareModal
        show={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSelectedPost(null);
        }}
        post={selectedPost}
        onShared={fetchPosts}
      />
      
      <ReportModal
        show={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedPost(null);
        }}
        onReport={(reason, description) => {
          if (selectedPost) {
            axios.post(`/api/posts/${selectedPost._id}/report`, { reason, description })
              .then(() => {
                toast.success('Post reported. Admins will review it.');
                setShowReportModal(false);
                setSelectedPost(null);
              })
              .catch(() => toast.error('Failed to report post'));
          }
        }}
      />
    </div>
  );
};

// Sub-components

const ReactionPicker = ({ post, onReact }) => {
  const [showPicker, setShowPicker] = useState(false);
  
  const currentReaction = REACTIONS.find(r => r.type === post.userReaction);
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors ${
          post.userReaction ? 'text-blue-600' : ''
        }`}
      >
        {currentReaction ? (
          <span className="text-2xl">{currentReaction.emoji}</span>
        ) : (
          <>
            <FiHeart className="w-5 h-5" />
            <span className="hidden sm:inline">Like</span>
          </>
        )}
      </button>
      
      {showPicker && (
        <>
          {/* Backdrop to close picker */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-full shadow-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 flex space-x-2 sm:space-x-3 z-20"
          >
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.type}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact(reaction.type);
                  setShowPicker(false);
                }}
                className="text-3xl hover:scale-125 transition-transform hover:bg-gray-50 rounded-full p-1"
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
};

const MediaCarousel = ({ media }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  if (!media || media.length === 0) return null;
  
  const currentMedia = media[currentIndex];
  
  const FullScreenViewer = () => (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <button
        onClick={() => setShowFullScreen(false)}
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors z-10"
      >
        <FiX className="w-6 h-6 text-white" />
      </button>
      
      {currentMedia.type === 'video' ? (
        <video
          src={currentMedia.url}
          controls
          className="max-w-full max-h-full"
          autoPlay
        />
      ) : (
        <img
          src={currentMedia.url}
          alt="Full size"
          className="max-w-full max-h-full object-contain"
        />
      )}
      
      {media.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((currentIndex - 1 + media.length) % media.length)}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
          >
            <FiChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setCurrentIndex((currentIndex + 1) % media.length)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
          >
            <FiChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm">
        {currentIndex + 1} / {media.length}
      </div>
    </div>
  );
  
  return (
    <>
      <div className="relative bg-black rounded-lg overflow-hidden cursor-pointer group">
        {currentMedia.type === 'video' ? (
          <video
            src={currentMedia.url}
            controls
            className="w-full max-h-[500px] object-contain"
          />
        ) : (
          <img
            src={currentMedia.url}
            alt="Post media"
            onClick={() => setShowFullScreen(true)}
            className="w-full max-h-[500px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
          />
        )}
        
        {media.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((currentIndex - 1 + media.length) % media.length);
              }}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full transition-colors z-10"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((currentIndex + 1) % media.length);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full transition-colors z-10"
            >
              <FiChevronRight className="w-6 h-6" />
            </button>
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      {showFullScreen && <FullScreenViewer />}
    </>
  );
};

const CreatePostModal = ({ show, onClose, onSubmit, content, setContent, selectedDepartments, toggleDepartment, departments, mediaFiles, handleMediaUpload, removeMedia, mediaPreviews, tags, tagInput, setTagInput, addTag, removeTag, submitting }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's on your mind?
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="6"
            />
          </div>
          
          {/* Departments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Departments
            </label>
            <div className="flex flex-wrap gap-2">
              {departments.map(dept => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDepartment(dept)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedDepartments.includes(dept)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                  }`}
                >
                  {dept}
                  {selectedDepartments.includes(dept) && (
                    <FiCheck className="inline ml-2 w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Media (Max 5 files)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleMediaUpload}
                className="hidden"
                id="media-upload"
              />
              <label
                htmlFor="media-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <FiUpload className="w-12 h-12 text-gray-400" />
                <span className="text-gray-600">Click to upload or drag and drop</span>
                <span className="text-sm text-gray-500">Images, Videos, PDFs, Documents</span>
              </label>
            </div>
            
            {mediaPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {mediaPreviews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    {preview.type.startsWith('image') ? (
                      <img src={preview.url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    ) : preview.type.startsWith('video') ? (
                      <video src={preview.url} className="w-full h-32 object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <FiFile className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center space-x-2"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-900"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const CommentSection = ({ post, currentUser, onAddComment, onReactToComment, onDeleteComment }) => {
  const [commentText, setCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const commentRef = useRef(null);
  const replyRefs = useRef({});
  
  useEffect(() => {
    if (replyTo && replyRefs.current[replyTo]) {
      replyRefs.current[replyTo].focus();
      const len = (replyTexts[replyTo] || '').length;
      replyRefs.current[replyTo].setSelectionRange(len, len);
    }
  }, [replyTo, replyTexts]);
  
  const handleSubmit = () => {
    const textToSubmit = replyTo ? (replyTexts[replyTo] || '') : commentText;
    if (!textToSubmit.trim()) return;
    onAddComment(post._id, textToSubmit, replyTo);
    setCommentText('');
    setReplyTexts(prev => {
      const newState = { ...prev };
      delete newState[replyTo];
      return newState;
    });
    setReplyTo(null);
  };

  const handleCommentChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCommentText(newValue);
    requestAnimationFrame(() => {
      if (commentRef.current) {
        commentRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const handleReplyChange = (commentId, e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setReplyTexts(prev => ({ ...prev, [commentId]: newValue }));
    requestAnimationFrame(() => {
      if (replyRefs.current[commentId]) {
        replyRefs.current[commentId].setSelectionRange(cursorPos, cursorPos);
      }
    });
  };
  
  const Comment = ({ comment, isNested = false }) => {
    const isOwner = comment.userId?._id === currentUser?._id;
    const isAdmin = currentUser?.role === 'admin';
    const canDelete = isOwner || isAdmin;
    const userReaction = comment.reactions?.find(r => r.userId === currentUser?._id)?.type;
    
    return (
      <div className={`flex items-start space-x-3 ${isNested ? 'ml-12 mt-3' : ''}`}>
        <Link to={`/profile/id/${comment.userId?._id}`}>
          <img 
            src={comment.userId?.avatarUrl || '/default-avatar.png'} 
            alt={comment.userId?.name} 
            className="w-8 h-8 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Link to={`/profile/id/${comment.userId?._id}`} className="font-semibold text-sm hover:text-blue-600">
                {comment.userId?.name}
              </Link>
              {canDelete && (
                <button
                  onClick={() => onDeleteComment(post._id, comment._id)}
                  className="text-gray-400 hover:text-red-600"
                  title={isAdmin && !isOwner ? 'Delete as admin' : 'Delete comment'}
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-gray-800 text-sm mt-1">{comment.content}</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>{new Date(comment.createdAt).toLocaleString()}</span>
            
            {/* Reaction Button */}
            <div className="relative">
              <button
                onClick={() => setShowReactionPicker(showReactionPicker === comment._id ? null : comment._id)}
                className={`hover:text-blue-600 ${userReaction ? 'text-blue-600 font-semibold' : ''}`}
              >
                {userReaction ? REACTIONS.find(r => r.type === userReaction)?.label : 'Like'}
              </button>
              
              {showReactionPicker === comment._id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowReactionPicker(null)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl border border-gray-200 px-4 py-3 flex space-x-3 z-20">
                    {REACTIONS.map((reaction) => (
                      <button
                        key={reaction.type}
                        onClick={() => {
                          onReactToComment(post._id, comment._id, reaction.type);
                          setShowReactionPicker(null);
                        }}
                        className="text-2xl hover:scale-125 transition-transform hover:bg-gray-50 rounded-full p-1"
                        title={reaction.label}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {!isNested && (
              <button
                onClick={() => setReplyTo(comment._id)}
                className="hover:text-blue-600"
              >
                Reply
              </button>
            )}
            
            {comment.reactions && comment.reactions.length > 0 && (
              <span className="flex items-center space-x-1">
                {Object.entries(
                  comment.reactions.reduce((acc, r) => {
                    acc[r.type] = (acc[r.type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => {
                  const reaction = REACTIONS.find(r => r.type === type);
                  return reaction ? (
                    <span key={type} className="text-sm">
                      {reaction.emoji} {count}
                    </span>
                  ) : null;
                })}
              </span>
            )}
          </div>
          
          {/* Nested Replies */}
          {!isNested && post.comments?.filter(c => c.parentCommentId === comment._id).map(reply => (
            <Comment key={reply._id} comment={reply} isNested={true} />
          ))}
          
          {/* Reply Input */}
          {replyTo === comment._id && (
            <div className="mt-3 flex items-start space-x-2">
              <img 
                src={currentUser?.avatarUrl || '/default-avatar.png'} 
                alt={currentUser?.name} 
                className="w-6 h-6 rounded-full object-cover"
              />
              <div className="flex-1">
                <textarea
                  ref={(el) => replyRefs.current[comment._id] = el}
                  key={`reply-${comment._id}`}
                  value={replyTexts[comment._id] || ''}
                  onChange={(e) => handleReplyChange(comment._id, e)}
                  placeholder={`Reply to ${comment.userId?.name}...`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none force-ltr"
                  rows="3"
                  autoFocus
                  dir="ltr"
                  style={{ direction: 'ltr', unicodeBidi: 'normal', textAlign: 'left' }}
                />
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={handleSubmit}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyTo(null);
                      setReplyTexts(prev => {
                        const newState = { ...prev };
                        delete newState[comment._id];
                        return newState;
                      });
                    }}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Get top-level comments (no parent)
  const topLevelComments = post.comments?.filter(c => !c.parentCommentId) || [];
  
  return (
    <div className="p-6 border-t border-gray-100">
      <h3 className="font-semibold text-lg mb-4">
        Comments ({post.totalComments || 0})
      </h3>
      
      {/* Add Comment */}
      <div className="flex items-start space-x-3 mb-6">
        <img 
          src={currentUser?.avatarUrl || '/default-avatar.png'} 
          alt={currentUser?.name} 
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <textarea
            ref={commentRef}
            value={commentText}
            onChange={handleCommentChange}
            placeholder="Write a comment..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none force-ltr"
            rows="3"
            dir="ltr"
            style={{ direction: 'ltr', unicodeBidi: 'normal', textAlign: 'left' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!commentText.trim()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend className="w-4 h-4" />
            <span>Post</span>
          </button>
        </div>
      </div>
      
      {/* Comments List */}
      <div className="space-y-4">
        {topLevelComments.map((comment) => (
          <Comment key={comment._id} comment={comment} />
        ))}
        
        {topLevelComments.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
};

const ReportModal = ({ show, onClose, onReport }) => {
  const [reason, setReason] = useState('Inappropriate');
  const [description, setDescription] = useState('');
  
  if (!show) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onReport(reason, description);
    setReason('Inappropriate');
    setDescription('');
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Report Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Inappropriate">Inappropriate Content</option>
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment</option>
              <option value="False Information">False Information</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide more details..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="4"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Submit Report
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default PostPage;
