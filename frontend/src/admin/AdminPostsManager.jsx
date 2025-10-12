import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import AdminNavbar from './AdminNavbar.jsx';
import { motion } from 'framer-motion';
import { FaTrash, FaSearch, FaEye } from 'react-icons/fa';

const AdminPostsManager = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.q = searchQuery;
      const res = await axios.get('/api/admin/posts', { params });
      setPosts(res.data || []);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`/api/admin/posts/${id}`);
      await fetchPosts();
    } catch (err) {
      alert('Failed to delete post');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <AdminNavbar />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Posts Management</h2>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={fetchPosts}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all"
            >
              Search
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No posts found</div>
              ) : (
                posts.map((post) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {post.userId?.avatarUrl && (
                            <img src={post.userId.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-800">
                              {post.userId?.name} <span className="text-gray-500 text-sm">({post.userId?.role})</span>
                            </p>
                            <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3">{post.content}</p>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag, i) => (
                              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(post._id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPostsManager;