import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserGraduate, FaUsers, FaCalendarAlt, FaComments, FaNetworkWired, FaBriefcase, FaGraduationCap, FaThumbsUp, FaShare, FaComment } from 'react-icons/fa';
import { postsAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const HomePage = () => {
  const { user } = useAuth();
  const stats = [
    { number: '5000+', label: 'Alumni', icon: FaUserGraduate },
    { number: '1000+', label: 'Active Members', icon: FaUsers },
    { number: '500+', label: 'Events', icon: FaCalendarAlt },
    { number: '50+', label: 'Countries', icon: FaNetworkWired }
  ];

  const features = [
    {
      icon: FaNetworkWired,
      title: 'Network Growth',
      description: 'Connect with alumni across the globe and expand your professional network.'
    },
    {
      icon: FaCalendarAlt,
      title: 'Exclusive Events',
      description: 'Access to exclusive alumni events, webinars, and networking opportunities.'
    },
    {
      icon: FaBriefcase,
      title: 'Job Opportunities',
      description: 'Discover career opportunities shared by fellow alumni and industry partners.'
    },
    {
      icon: FaGraduationCap,
      title: 'Mentorship',
      description: 'Get guidance from experienced alumni through our mentorship program.'
    },
    {
      icon: FaComments,
      title: 'Discussion Forums',
      description: 'Engage in meaningful discussions about industry trends and experiences.'
    },
    {
      icon: FaUsers,
      title: 'Community Support',
      description: 'Be part of a supportive community that helps you grow professionally.'
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
        // handle error
      } finally {
        setPosting(false);
      }
    }
  };

  const handleLike = (postId) => {
    // Placeholder for like functionality
  };

  const handleComment = (postId) => {
    // Placeholder for comment functionality
  };

  const handleShare = (postId) => {
    // Placeholder for share functionality
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-cyan-100 via-blue-100 to-purple-100 overflow-x-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute left-[-10vw] top-[-10vw] w-[40vw] h-[40vw] bg-cyan-300 opacity-30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute right-[-10vw] top-[20vh] w-[35vw] h-[35vw] bg-blue-400 opacity-20 rounded-full blur-2xl animate-pulse delay-200"></div>
        <div className="absolute left-[20vw] bottom-[-10vw] w-[30vw] h-[30vw] bg-purple-300 opacity-20 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      {/* Professional animated background video (network/education theme, muted, looped) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover opacity-30 pointer-events-none -z-20"
        style={{ filter: 'blur(1.5px) saturate(1.1)' }}
      >
        {/* Example: Replace with your own video if you have a better one */}
        <source src="https://assets.mixkit.co/videos/preview/mixkit-network-of-connected-people-1166-large.mp4" type="video/mp4" />
        {/* fallback: animated SVG if video fails */}
      </video>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center py-24 md:py-32">
        <motion.h1
          className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-transparent bg-clip-text drop-shadow-lg mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Welcome to MIT Alumni Connect
        </motion.h1>
        <motion.p
          className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          The vibrant hub for alumni and students to connect, collaborate, and grow together. Join a global network, share your journey, and unlock new opportunities.
        </motion.p>
        <motion.div
          className="flex flex-col md:flex-row gap-4 justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Link to="/register" className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg hover:from-cyan-600 hover:to-blue-700 transition">Join Now</Link>
          <Link to="/about" className="px-8 py-3 rounded-xl bg-white/80 text-cyan-700 font-bold text-lg shadow hover:bg-cyan-50 border border-cyan-200 transition">Learn More</Link>
        </motion.div>
        {/* Animated network SVG */}
        <motion.svg
          className="mx-auto mt-8"
          width="340" height="120" viewBox="0 0 340 120" fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
        >
          <circle cx="60" cy="60" r="40" fill="#22d3ee" fillOpacity="0.3" />
          <circle cx="170" cy="60" r="40" fill="#6366f1" fillOpacity="0.2" />
          <circle cx="280" cy="60" r="40" fill="#a78bfa" fillOpacity="0.2" />
          <line x1="100" y1="60" x2="130" y2="60" stroke="#22d3ee" strokeWidth="4" />
          <line x1="210" y1="60" x2="240" y2="60" stroke="#a78bfa" strokeWidth="4" />
          <line x1="130" y1="60" x2="210" y2="60" stroke="#6366f1" strokeWidth="4" />
        </motion.svg>
      </section>

      {/* Stats Section */}
      <section className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            className="stat-card bg-white/80 rounded-2xl shadow-lg flex flex-col items-center py-8 px-4 border border-cyan-100 hover:scale-105 transition"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <stat.icon className="text-cyan-600 text-4xl mb-4" />
            <div className="stat-number text-3xl font-extrabold text-gray-900 mb-1">{stat.number}</div>
            <div className="stat-label text-lg text-gray-600">{stat.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-cyan-700 mb-10">Why Join AlumniConnect?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              className="bg-white/90 rounded-2xl shadow-lg p-8 flex flex-col items-center border border-cyan-100 hover:shadow-xl hover:scale-105 transition"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <feature.icon className="text-cyan-500 text-4xl mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-center">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Connect?</h2>
        <p className="text-lg mb-8">Join thousands of alumni and students building their future together.</p>
        <Link to="/register" className="px-10 py-4 rounded-xl bg-white/90 text-cyan-700 font-bold text-xl shadow-lg hover:bg-cyan-100 transition">Get Started</Link>
      </section>

      {/* Post Section */}
      <section className="max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold text-center text-cyan-700 mb-8">Latest Posts</h2>
        {user && (
          <form onSubmit={handlePostSubmit} className="mb-8">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-4 border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
              rows="3"
              disabled={posting}
            />
            <button type="submit" disabled={posting} className="mt-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition">{posting ? 'Posting...' : 'Post'}</button>
          </form>
        )}
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts yet.</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post._id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <img src={post.user?.avatarUrl || 'https://via.placeholder.com/40'} alt={post.user?.name || 'User'} className="w-10 h-10 rounded-full mr-4" />
                  <div>
                    <h3 className="font-bold text-gray-900">{post.user?.name || 'User'}</h3>
                    <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{post.content}</p>
                <div className="flex space-x-4">
                  <button onClick={() => handleLike(post._id)} className="flex items-center text-gray-500 hover:text-cyan-600">
                    <FaThumbsUp className="mr-1" /> {post.likes || 0}
                  </button>
                  <button onClick={() => handleComment(post._id)} className="flex items-center text-gray-500 hover:text-cyan-600">
                    <FaComment className="mr-1" /> 0
                  </button>
                  <button onClick={() => handleShare(post._id)} className="flex items-center text-gray-500 hover:text-cyan-600">
                    <FaShare className="mr-1" /> 0
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;