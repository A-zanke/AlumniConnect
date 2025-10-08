import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiBookmark,
  FiRefreshCw,
  FiX
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import EnhancedPostCard from "../components/posts/EnhancedPostCard";
import EnhancedPostComposer from "../components/posts/EnhancedPostComposer";
import EnhancedShareModal from "../components/posts/EnhancedShareModal";

const PostsPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, my-posts, bookmarked
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  });

  const canCreatePost = user?.role === "teacher" || user?.role === "alumni";

  useEffect(() => {
    fetchPosts();
    fetchTrendingHashtags();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [filter, searchQuery]);

  const fetchPosts = async (page = 1) => {
    try {
      setLoading(page === 1);
      setRefreshing(page > 1);
      
      let endpoint = '/api/posts';
      const params = new URLSearchParams();
      
      if (page > 1) params.append('page', page);
      if (searchQuery) params.append('q', searchQuery);
      
      if (filter === 'my-posts') {
        endpoint = '/api/posts/my-posts';
      } else if (filter === 'bookmarked') {
        endpoint = '/api/posts/bookmarked';
      } else if (searchQuery) {
        endpoint = '/api/posts/search';
      }
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const response = await axios.get(endpoint);
      
      if (response.data.posts) {
        // New paginated response
        setPosts(response.data.posts);
        setPagination(response.data.pagination);
      } else {
        // Legacy response
        setPosts(response.data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTrendingHashtags = async () => {
    try {
      const response = await axios.get('/api/posts/trending/hashtags');
      setTrendingHashtags(response.data);
    } catch (error) {
      console.error("Error fetching trending hashtags:", error);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`/api/posts/${postId}`);
      toast.success("Post deleted successfully");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setShowCreatePost(true);
  };

  const handlePostCreated = () => {
    fetchPosts();
    setShowCreatePost(false);
    setEditingPost(null);
  };

  const handleLoadMore = () => {
    if (pagination.hasNext) {
      fetchPosts(pagination.currentPage + 1);
    }
  };

  const handleHashtagClick = (hashtag) => {
    setSearchQuery(`#${hashtag}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                Posts
              </h1>
              <p className="text-slate-600">
                Discover insights and experiences from our community
              </p>
            </div>
            <button
              onClick={() => fetchPosts()}
              disabled={refreshing}
              className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <FiRefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search posts, hashtags, or @mentions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All Posts', icon: FiTrendingUp },
                  { key: 'my-posts', label: 'My Posts', icon: FiFilter },
                  { key: 'bookmarked', label: 'Bookmarked', icon: FiBookmark }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                        filter === tab.key
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trending Hashtags */}
            {trendingHashtags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="text-sm font-medium text-slate-600 mb-2">Trending:</div>
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.slice(0, 8).map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => handleHashtagClick(tag._id)}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >
                      #{tag._id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Create Post Button (Floating Action Button for Alumni/Teachers) */}
        {canCreatePost && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCreatePost(true)}
            className="fixed bottom-8 right-8 z-40 w-16 h-16 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:shadow-indigo-500/50 transition-all duration-300"
          >
            <FiPlus size={28} />
          </motion.button>
        )}

        {/* Create/Edit Post Modal */}
        <AnimatePresence>
          {showCreatePost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowCreatePost(false);
                setEditingPost(null);
              }}
            >
              <EnhancedPostComposer
                onPostCreated={handlePostCreated}
                user={user}
                onClose={() => {
                  setShowCreatePost(false);
                  setEditingPost(null);
                }}
                initialContent={editingPost?.content || ""}
                isEdit={!!editingPost}
                postId={editingPost?._id}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts Feed */}
        <div className="space-y-6">
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
              <div className="text-6xl mb-4">📝</div>
              <p className="text-slate-500 text-lg">
                {filter === 'my-posts' 
                  ? "You haven't created any posts yet"
                  : filter === 'bookmarked'
                  ? "You haven't bookmarked any posts yet"
                  : searchQuery
                  ? "No posts found matching your search"
                  : "No posts available yet"
                }
              </p>
              <p className="text-slate-400 text-sm mt-2">
                {canCreatePost && filter !== 'my-posts' && "Be the first to share something!"}
              </p>
            </motion.div>
          ) : (
            posts.map((post, index) => (
              <EnhancedPostCard
                key={post._id}
                post={post}
                currentUser={user}
                onDelete={handleDeletePost}
                onUpdate={() => fetchPosts()}
                onEdit={handleEditPost}
              />
            ))
          )}
        </div>

        {/* Load More Button */}
        {pagination.hasNext && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={refreshing}
              className="px-8 py-3 bg-white text-slate-700 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {refreshing ? 'Loading...' : 'Load More Posts'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostsPage;
