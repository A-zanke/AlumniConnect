import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaUserGraduate, FaUsers, FaCalendarAlt, FaComments, FaNetworkWired, 
  FaRocket, FaGraduationCap, FaHeart, FaStar, FaThumbsUp, FaShare, FaComment 
} from 'react-icons/fa';
import { postsAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const HomePage = () => {
  const { user } = useAuth();

  const stats = [
    { number: '5000+', label: 'Alumni', icon: FaUserGraduate, color: 'from-emerald-400 to-teal-500' },
    { number: '1000+', label: 'Active Members', icon: FaUsers, color: 'from-blue-400 to-indigo-500' },
    { number: '500+', label: 'Events', icon: FaCalendarAlt, color: 'from-purple-400 to-pink-500' },
    { number: '50+', label: 'Countries', icon: FaNetworkWired, color: 'from-orange-400 to-red-500' }
  ];

  const features = [
    {
      icon: FaNetworkWired,
      title: 'Global Network',
      description: 'Connect with alumni across 190+ countries.',
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      icon: FaRocket,
      title: 'Career Launch',
      description: 'Exclusive job opportunities & industry connections.',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      icon: FaGraduationCap,
      title: 'Expert Mentorship',
      description: 'Guidance from experienced professionals.',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      icon: FaCalendarAlt,
      title: 'Premium Events',
      description: 'Workshops, tech talks & networking events.',
      gradient: 'from-orange-500 to-red-600',
    },
    {
      icon: FaComments,
      title: 'Smart Forums',
      description: 'Engage in discussions & collaborate.',
      gradient: 'from-indigo-500 to-purple-600',
    },
    {
      icon: FaHeart,
      title: 'Lifetime Support',
      description: 'Community support at every stage.',
      gradient: 'from-pink-500 to-rose-600',
    }
  ];

  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await postsAPI.getPosts();
      setPosts(res.data.reverse());
    } catch (err) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (postContent.trim()) {
      setPosting(true);
      try {
        await postsAPI.createPost({ content: postContent });
        setPostContent('');
        fetchPosts();
      } catch (err) {
        console.error('Error creating post:', err);
      } finally {
        setPosting(false);
      }
    }
  };

  const handleLike = (postId) => {
    // TODO: connect like API
  };

  const handleComment = (postId) => {
    // TODO: connect comment API
  };

  const handleShare = (postId) => {
    // TODO: connect share API
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 10 } }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* 🔹 Hero Section */}
      <section className="relative pt-32 pb-20 px-4 text-center">
        <motion.h1 className="text-6xl md:text-8xl font-black mb-6"
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}>
          Alumni <span className="text-indigo-600">Connect</span>
        </motion.h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10">
          Connect globally, grow professionally, and shape the future together.
        </p>
        <div className="flex flex-col md:flex-row gap-6 justify-center">
          <Link to="/register" className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-lg hover:bg-indigo-700">
            <FaRocket className="inline mr-2" /> Launch Your Journey
          </Link>
          <Link to="/about" className="px-8 py-4 rounded-2xl bg-white border text-indigo-600 font-bold text-lg shadow hover:bg-indigo-50">
            Discover More
          </Link>
        </div>
      </section>

      {/* 🔹 Stats */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ scale: 1.05 }}>
              <div className="p-8 rounded-2xl bg-white shadow-lg text-center">
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${stat.color} mb-4`}>
                  <stat.icon className="text-white text-3xl" />
                </div>
                <div className="text-4xl font-bold">{stat.number}</div>
                <p className="text-slate-600">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 🔹 Features */}
      <section className="py-20 px-4">
        <h2 className="text-5xl font-bold text-center mb-12">Why Choose Us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ y: -5 }}>
              <div className="p-8 bg-white rounded-2xl shadow-lg h-full">
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4`}>
                  <feature.icon className="text-white text-3xl" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 🔹 Posts */}
      <section className="py-20 px-4 bg-gray-50">
        <h2 className="text-4xl font-bold text-center mb-10">Community Pulse</h2>
        
        {user && (
          <form onSubmit={handlePostSubmit} className="max-w-3xl mx-auto mb-10">
            <textarea
              value={postContent} onChange={(e) => setPostContent(e.target.value)}
              className="w-full p-4 border rounded-xl mb-4"
              placeholder="Share something..."
              rows="3"
              disabled={posting}
            />
            <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-lg">
              {posting ? "Posting..." : "Share"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : posts.length === 0 ? (
          <p className="text-center text-slate-600">No posts yet. Be the first to share!</p>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {posts.map(post => (
              <div key={post._id} className="p-6 bg-white rounded-2xl shadow">
                <h3 className="font-bold">{post.user?.name || "User"}</h3>
                <p className="text-slate-500 text-sm">{new Date(post.createdAt).toLocaleString()}</p>
                <p className="mt-4">{post.content}</p>
                <div className="flex gap-6 mt-4 text-slate-500">
                  <button onClick={() => handleLike(post._id)}><FaThumbsUp /> {post.likes || 0}</button>
                  <button onClick={() => handleComment(post._id)}><FaComment /> 0</button>
                  <button onClick={() => handleShare(post._id)}><FaShare /> 0</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="bg-gray-800 text-white py-6 text-center">
        &copy; {new Date().getFullYear()} MIT Alumni Connect. All Rights Reserved.
      </footer>
    </div>
  );
};

export default HomePage;
