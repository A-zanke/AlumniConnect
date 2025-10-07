import React, { useEffect, useState } from 'react';
import { forumAPI } from '../components/utils/forumApi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, FiSearch, FiFilter, FiHome, FiUser, FiTrendingUp, 
  FiMessageCircle, FiBookmark, FiBarChart, FiUsers 
} from 'react-icons/fi';
import CreatePostModal from '../components/forum/CreatePostModal';
import PostCard from '../components/forum/PostCard';
import Guidelines from '../components/forum/Guidelines';
import Leaderboard from '../components/forum/Leaderboard';

const CATEGORIES = ['All','Career','Higher Studies','Internships','Hackathons','Projects'];
const SORTS = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'upvoted', label: 'Most Upvoted' },
  { key: 'unanswered', label: 'Unanswered' }
];

const NAVIGATION_ITEMS = [
  { key: 'all', label: 'Home', icon: FiHome },
  { key: 'my-posts', label: 'My Posts', icon: FiUser },
  { key: 'trending', label: 'Trending', icon: FiTrendingUp },
  { key: 'polls', label: 'Polls', icon: FiBarChart },
  { key: 'bookmarked', label: 'Bookmarked', icon: FiBookmark },
];

const ForumPage = () => {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('recent');
  const [activeNav, setActiveNav] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (q) params.q = q;
      if (category && category !== 'All') params.category = category;
      if (sort) {
        if (sort === 'upvoted') params.sort = 'upvoted';
        if (sort === 'unanswered') params.filter = 'unanswered';
      }

      // Apply navigation filters
      if (activeNav === 'my-posts') {
        // Use special flag recognized by backend as current user
        params.userId = 'me';
      }

      const res = await forumAPI.listPosts(params);
      setPosts(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []); 
  useEffect(() => { fetchPosts(); }, [q, category, sort, activeNav]); 

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            MIT Alumni Forum
          </h1>
          <p className="text-gray-600">Connect, Share, and Grow Together</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {/* Guidelines */}
              <div className="mb-6">
                <Guidelines />
              </div>

              {/* Navigation */}
              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiUsers className="text-blue-600" />
                  Navigation
                </h3>
                <nav className="space-y-2">
                  {NAVIGATION_ITEMS.map(item => (
                    <button
                      key={item.key}
                      onClick={() => setActiveNav(item.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        activeNav === item.key 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105' 
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <item.icon className={`text-lg ${activeNav === item.key ? 'text-white' : 'text-blue-500'}`} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Leaderboard */}
              <Leaderboard />
            </div>
          </div>

          {/* Right Content - Main Feed */}
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                  <input
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-blue-50 border border-blue-100 focus:ring-4 focus:ring-blue-100 transition outline-none placeholder-gray-500"
                    placeholder="Search posts, topics, or @username..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <select
                      className="appearance-none bg-white border border-blue-200 rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      className="appearance-none bg-white border border-blue-200 rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts Feed */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-12"
                >
                  <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading amazing discussions...</p>
                  </div>
                </motion.div>
              ) : posts.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl shadow-lg border border-blue-100 p-12 text-center"
                >
                  <div className="text-8xl mb-6">🎯</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Posts Yet</h3>
                  <p className="text-gray-600 mb-6">Be the pioneer! Start the first conversation and inspire others to join.</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
                  >
                    Create First Post
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {posts.map((post, idx) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: idx * 0.05 }}
                    >
                      <PostCard post={post} onChanged={fetchPosts} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Create Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="fixed bottom-28 right-8 h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:shadow-blue-500/25"
        >
          <FiPlus className="text-2xl" />
        </motion.button>

        {/* Create Post Modal */}
        {showCreate && (
          <CreatePostModal 
            onClose={() => setShowCreate(false)} 
            onCreated={fetchPosts} 
          />
        )}
      </div>
    </div>
  );
};

export default ForumPage;