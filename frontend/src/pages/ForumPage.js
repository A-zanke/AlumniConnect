import React, { useEffect, useState } from 'react';
import { forumAPI } from '../components/utils/forumApi';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import CreatePostModal from '../components/forum/CreatePostModal';
import PostCard from '../components/forum/PostCard';
import Guidelines from '../components/forum/Guidelines';
import Leaderboard from '../components/forum/Leaderboard';

const CATEGORIES = ['All','Career','Higher Studies','Internships','Hackathons','Projects','Alumni Queries'];
const SORTS = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'upvoted', label: 'Most Upvoted' },
  { key: 'unanswered', label: 'Unanswered' }
];

const ForumPage = () => {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('recent');
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
      const res = await forumAPI.listPosts(params);
      setPosts(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []); // initial
  useEffect(() => { fetchPosts(); }, [q, category, sort]); // reactive

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Stylish gradient guidelines with animation */}
      <Guidelines />

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* Rounded glowing search bar */}
        <div className="flex-1 relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
          <input
            className="w-full pl-12 pr-4 py-3 rounded-full bg-white border border-indigo-100 shadow-sm focus:ring-4 focus:ring-indigo-100 transition outline-none placeholder-gray-400 hover:shadow-md"
            placeholder="Search posts, tags or @username"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-transparent hover:ring-indigo-200 transition" />
        </div>
        {/* Modern pill-shaped filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-100 bg-white shadow-sm">
              <FiFilter className="text-indigo-600" />
              <select
                className="bg-transparent outline-none text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-100 bg-white shadow-sm">
              <span className="text-indigo-600 text-sm">Category</span>
              <select
                className="bg-transparent outline-none text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-gray-500 p-6"
          >
            Loading posts...
          </motion.div>
        ) : posts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center justify-center bg-white rounded-2xl border border-indigo-50 shadow p-8 text-center"
          >
            <div className="text-6xl mb-2">🤔</div>
            <div className="text-xl font-semibold text-gray-900">No posts yet</div>
            <div className="text-gray-600 mt-1">Start the conversation by creating the first post 🚀</div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {posts.map((p, idx) => (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              >
                <PostCard post={p} onChanged={fetchPosts} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard */}
      <div className="mt-10">
        <Leaderboard />
      </div>

      {/* Floating Create Post Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed z-50 bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition"
        aria-label="New Post"
      >
        <FiPlus className="text-2xl" />
      </button>

      {/* Create Post Modal */}
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} onCreated={fetchPosts} />}
    </div>
  );
};

export default ForumPage;