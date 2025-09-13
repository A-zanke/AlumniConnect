import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { unifiedForumAPI } from '../services/unifiedForumAPI';
import UnifiedPostCreator from '../components/forum/UnifiedPostCreator';
import UnifiedPostCard from '../components/forum/UnifiedPostCard';
import {
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiClock,
  FiHeart,
  FiMessageCircle,
  FiRefreshCw,
  FiChevronDown,
  FiX
} from 'react-icons/fi';

const CATEGORIES = [
  'All', 'Career', 'Higher Studies', 'Internships', 'Hackathons', 'Projects', 'Alumni Queries', 'General'
];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Most Recent', icon: FiClock },
  { key: 'popular', label: 'Most Popular', icon: FiHeart },
  { key: 'trending', label: 'Trending', icon: FiTrendingUp }
];

const UnifiedForumPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    category: 'All',
    sort: 'recent',
    page: 1
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    hasNext: false,
    hasPrev: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Set current user ID when user is loaded
  useEffect(() => {
    if (user) {
      console.log('Setting currentUserId:', user._id);
      setCurrentUserId(user._id);
    } else {
      console.log('No user found');
    }
  }, [user]);

  // Fetch posts with comments
  const fetchPosts = useCallback(async (reset = false) => {
    // Only fetch if user is authenticated
    if (!user) {
      return;
    }

    try {
      if (reset) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      setError('');
      
      const params = {
        page: filters.page,
        limit: 10,
        userId: currentUserId
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.category !== 'All') params.category = filters.category;
      if (filters.sort) params.sort = filters.sort;
      
      const response = await unifiedForumAPI.getPosts(params);
      
      if (reset) {
        // Fetch comments for each post
        const postsWithComments = await Promise.all(
          (response.data.data || []).map(async (post) => {
            try {
              const postResponse = await unifiedForumAPI.getPost(post._id, { userId: currentUserId });
              return {
                ...post,
                comments: postResponse.data.data.comments || []
              };
            } catch (error) {
              console.error('Error fetching comments for post:', post._id, error);
              return {
                ...post,
                comments: []
              };
            }
          })
        );
        setPosts(postsWithComments);
      } else {
        // Fetch comments for new posts only
        const newPostsWithComments = await Promise.all(
          (response.data.data || []).map(async (post) => {
            try {
              const postResponse = await unifiedForumAPI.getPost(post._id, { userId: currentUserId });
              return {
                ...post,
                comments: postResponse.data.data.comments || []
              };
            } catch (error) {
              console.error('Error fetching comments for post:', post._id, error);
              return {
                ...post,
                comments: []
              };
            }
          })
        );
        setPosts(prev => [...prev, ...newPostsWithComments]);
      }
      
      setPagination(response.data.pagination || {
        current: 1,
        total: 1,
        hasNext: false,
        hasPrev: false
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, currentUserId, user]);

  // Load posts on mount and when filters change
  useEffect(() => {
    if (currentUserId && user) {
      fetchPosts(true);
    }
  }, [fetchPosts, currentUserId, user]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1 // Reset to page 1 for non-page changes
    }));
  };

  // Handle search
  const handleSearch = (value) => {
    setFilters(prev => ({
      ...prev,
      search: value,
      page: 1
    }));
  };

  // Load more posts
  const loadMorePosts = () => {
    if (pagination.hasNext && !loading) {
      handleFilterChange('page', filters.page + 1);
    }
  };

  // Refresh posts
  const refreshPosts = () => {
    fetchPosts(true);
  };

  // Handle post creation
  const handlePostCreated = () => {
    fetchPosts(true);
  };

  // Handle post update (for real-time updates)
  const handlePostUpdate = (postId) => {
    // Fetch updated post data with comments
    unifiedForumAPI.getPost(postId, { userId: currentUserId })
      .then(response => {
        setPosts(prev => prev.map(post => 
          post._id === postId ? {
            ...response.data.data.post,
            comments: response.data.data.comments || []
          } : post
        ));
      })
      .catch(error => {
        console.error('Error updating post:', error);
      });
  };

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pagination.hasNext, loading]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forum</h1>
          <p className="text-gray-600">Share your thoughts, ask questions, and connect with the community</p>
        </div>

        {/* Post Creator */}
        <div className="mb-6">
          <UnifiedPostCreator onPostCreated={handlePostCreated} />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts, tags, or users..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiFilter className="w-4 h-4" />
              <span>Filters</span>
              <FiChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Refresh Button */}
            <button
              onClick={refreshPosts}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {CATEGORIES.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort By
                      </label>
                      <select
                        value={filters.sort}
                        onChange={(e) => handleFilterChange('sort', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {SORT_OPTIONS.map(option => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Loading posts...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Posts List */}
            <div className="space-y-6">
              <AnimatePresence>
                {posts.map((post, index) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <UnifiedPostCard
                      post={post}
                      onUpdate={() => handlePostUpdate(post._id)}
                      currentUserId={currentUserId}
                      user={user}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Load More Button */}
            {pagination.hasNext && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMorePosts}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More Posts</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* No Posts Message */}
            {posts.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FiMessageCircle className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-600">
                  {filters.search || filters.category !== 'All' 
                    ? 'Try adjusting your filters or search terms.'
                    : 'Be the first to share something with the community!'
                  }
                </p>
              </div>
            )}
          </>
        )}

        {/* Pagination Info */}
        {posts.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            Showing page {pagination.current} of {pagination.total}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedForumPage;
