
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserGraduate, FaUsers, FaCalendarAlt, FaComments, FaNetworkWired, FaBriefcase, FaGraduationCap, FaThumbsUp, FaShare, FaComment, FaRocket, FaHeart, FaStar } from 'react-icons/fa';
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
      description: 'Connect with 50,000+ alumni across 190+ countries and expand your professional horizons.',
      gradient: 'from-cyan-500 to-blue-600',
      delay: 0.1
    },
    {
      icon: FaRocket,
      title: 'Career Launch',
      description: 'Access exclusive job opportunities and accelerate your career with industry connections.',
      gradient: 'from-purple-500 to-pink-600',
      delay: 0.2
    },
    {
      icon: FaGraduationCap,
      title: 'Expert Mentorship',
      description: 'Learn from industry leaders and get personalized guidance from experienced professionals.',
      gradient: 'from-emerald-500 to-teal-600',
      delay: 0.3
    },
    {
      icon: FaCalendarAlt,
      title: 'Premium Events',
      description: 'Join exclusive workshops, tech talks, and networking events designed for your growth.',
      gradient: 'from-orange-500 to-red-600',
      delay: 0.4
    },
    {
      icon: FaComments,
      title: 'Smart Forums',
      description: 'Engage in AI-powered discussions and collaborate on cutting-edge projects.',
      gradient: 'from-indigo-500 to-purple-600',
      delay: 0.5
    },
    {
      icon: FaHeart,
      title: 'Lifetime Support',
      description: 'Be part of a caring community that supports your journey at every stage.',
      gradient: 'from-pink-500 to-rose-600',
      delay: 0.6
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
    // Placeholder for like functionality
  };

  const handleComment = (postId) => {
    // Placeholder for comment functionality
  };

  const handleShare = (postId) => {
    // Placeholder for share functionality
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Dynamic Animated Background */}
      <div className="fixed inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-cyan-50"></div>
        
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute top-40 right-20 w-72 h-72 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 0.8, 1]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute bottom-20 left-1/2 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl"
          animate={{
            x: [-150, 150, -150],
            y: [0, -40, 0],
            scale: [0.8, 1.1, 0.8]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Geometric Patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-cyan-500 rounded-full animate-pulse delay-300"></div>
          <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-pink-500 rounded-full animate-pulse delay-700"></div>
          <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-emerald-500 rounded-full animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <motion.div
          className="max-w-6xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <motion.h1
              className="text-6xl md:text-8xl font-black mb-8 leading-tight"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
            >
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent animate-pulse">
                Alumni
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Connect
              </span>
            </motion.h1>
          </motion.div>

          <motion.div variants={itemVariants}>
            <p className="text-xl md:text-2xl text-slate-700 max-w-4xl mx-auto mb-12 leading-relaxed font-light">
              Join the most vibrant community of innovators, dreamers, and changemakers. 
              <span className="font-semibold text-indigo-600"> Connect globally</span>, 
              <span className="font-semibold text-purple-600"> grow professionally</span>, and 
              <span className="font-semibold text-cyan-600"> shape the future</span> together.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col md:flex-row gap-6 justify-center mb-16"
            variants={itemVariants}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to="/register" 
                className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white font-bold text-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <FaRocket className="group-hover:rotate-12 transition-transform duration-300" />
                  Launch Your Journey
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to="/about" 
                className="px-10 py-4 rounded-2xl bg-white/80 backdrop-blur-lg text-indigo-700 font-bold text-xl shadow-xl hover:bg-white/90 border-2 border-indigo-200 hover:border-indigo-300 transition-all duration-300"
              >
                Discover More
              </Link>
            </motion.div>
          </motion.div>

          {/* Animated Network Visualization */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <svg className="mx-auto" width="500" height="200" viewBox="0 0 500 200">
              {/* Connection Lines */}
              <motion.line
                x1="100" y1="100" x2="200" y2="50"
                stroke="url(#gradient1)" strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1 }}
              />
              <motion.line
                x1="200" y1="50" x2="300" y2="100"
                stroke="url(#gradient2)" strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1.2 }}
              />
              <motion.line
                x1="300" y1="100" x2="400" y2="150"
                stroke="url(#gradient3)" strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1.4 }}
              />
              
              {/* Nodes */}
              {[
                { cx: 100, cy: 100, delay: 1.6 },
                { cx: 200, cy: 50, delay: 1.8 },
                { cx: 300, cy: 100, delay: 2.0 },
                { cx: 400, cy: 150, delay: 2.2 }
              ].map((node, index) => (
                <motion.circle
                  key={index}
                  cx={node.cx} cy={node.cy} r="20"
                  fill={`url(#nodeGradient${index + 1})`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: node.delay, type: "spring" }}
                />
              ))}
              
              {/* Gradients */}
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <radialGradient id="nodeGradient1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </radialGradient>
                <radialGradient id="nodeGradient2">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" />
                </radialGradient>
                <radialGradient id="nodeGradient3">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </radialGradient>
                <radialGradient id="nodeGradient4">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </radialGradient>
              </defs>
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* Enhanced Stats Section */}
      <section className="relative py-20 px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-16"
            variants={itemVariants}
          >
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Impact in Numbers
            </span>
          </motion.h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="group relative"
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl"
                       style={{ background: `linear-gradient(135deg, ${stat.color.split(' ')[1]}, ${stat.color.split(' ')[3]})` }}></div>
                  
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${stat.color} mb-6 shadow-lg`}>
                    <stat.icon className="text-white text-3xl" />
                  </div>
                  
                  <motion.div
                    className="text-4xl font-black text-slate-800 mb-2"
                    initial={{ scale: 0.5 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.5, type: "spring", stiffness: 200 }}
                  >
                    {stat.number}
                  </motion.div>
                  
                  <div className="text-lg font-semibold text-slate-600">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Enhanced Features Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5"></div>
        
        <motion.div
          className="relative max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <motion.div className="text-center mb-20" variants={itemVariants}>
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                Why Choose Us?
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Experience the future of alumni networking with cutting-edge features designed for success.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group relative"
                variants={itemVariants}
                whileHover={{ y: -10, rotateY: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 overflow-hidden">
                  {/* Hover Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  <motion.div
                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} mb-6 shadow-lg`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <feature.icon className="text-white text-3xl" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-indigo-600 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                    <FaStar className="text-yellow-400 text-sm" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600"></div>
        
        {/* Animated Background Pattern */}
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}
        />

        <motion.div
          className="relative max-w-4xl mx-auto text-center text-white"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="text-5xl md:text-6xl font-black mb-8"
            initial={{ scale: 0.8 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            Ready to Connect?
          </motion.h2>
          
          <motion.p
            className="text-xl md:text-2xl mb-12 opacity-90"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.9 }}
            transition={{ delay: 0.3 }}
          >
            Join thousands of visionaries building tomorrow, today.
          </motion.p>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              to="/register" 
              className="inline-flex items-center gap-3 px-12 py-5 rounded-2xl bg-white text-indigo-600 font-bold text-xl shadow-2xl hover:shadow-white/20 transition-all duration-300 group"
            >
              <span>Get Started Now</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <FaRocket className="group-hover:text-purple-600 transition-colors duration-300" />
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Enhanced Posts Section */}
      <section className="relative py-20 px-4">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-12"
            variants={itemVariants}
          >
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Community Pulse
            </span>
          </motion.h2>

          {user && (
            <motion.form
              onSubmit={handlePostSubmit}
              className="mb-12"
              variants={itemVariants}
            >
              <div className="relative">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share your thoughts with the community..."
                  className="w-full p-6 border-2 border-indigo-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-400 bg-white/80 backdrop-blur-lg resize-none transition-all duration-300"
                  rows="4"
                  disabled={posting}
                />
                <motion.button
                  type="submit"
                  disabled={posting}
                  className="absolute bottom-4 right-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {posting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Posting...
                    </div>
                  ) : (
                    'Share'
                  )}
                </motion.button>
              </div>
            </motion.form>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : posts.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-6xl mb-4">📝</div>
              <p className="text-xl text-slate-600">No posts yet. Be the first to share!</p>
            </motion.div>
          ) : (
            <motion.div className="space-y-8" variants={containerVariants}>
              {posts.map((post, index) => (
                <motion.div
                  key={post._id}
                  className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-500"
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                >
                  <div className="flex items-center mb-6">
                    <motion.div
                      className="relative"
                      whileHover={{ scale: 1.1 }}
                    >
                      <img
                        src={post.user?.avatarUrl || 'https://via.placeholder.com/50'}
                        alt={post.user?.name || 'User'}
                        className="w-12 h-12 rounded-full border-3 border-indigo-200 shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                    </motion.div>
                    
                    <div className="ml-4">
                      <h3 className="font-bold text-slate-800 text-lg">{post.user?.name || 'User'}</h3>
                      <p className="text-sm text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <p className="text-slate-700 mb-6 text-lg leading-relaxed">{post.content}</p>
                  
                  <div className="flex items-center gap-6">
                    <motion.button
                      onClick={() => handleLike(post._id)}
                      className="flex items-center gap-2 text-slate-500 hover:text-red-500 font-semibold transition-colors duration-300"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FaThumbsUp className="transition-transform duration-300 group-hover:rotate-12" />
                      {post.likes || 0}
                    </motion.button>
                    
                    <motion.button
                      onClick={() => handleComment(post._id)}
                      className="flex items-center gap-2 text-slate-500 hover:text-blue-500 font-semibold transition-colors duration-300"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FaComment />
                      0
                    </motion.button>
                    
                    <motion.button
                      onClick={() => handleShare(post._id)}
                      className="flex items-center gap-2 text-slate-500 hover:text-green-500 font-semibold transition-colors duration-300"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FaShare />
                      0
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Floating Action Elements */}
      <motion.div
        className="fixed bottom-8 right-8 z-40"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 2, type: "spring", stiffness: 200 }}
      >
        <motion.button
          className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl flex items-center justify-center text-white text-xl hover:shadow-purple-500/50 transition-all duration-300"
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <FaHeart />
        </motion.button>
      </motion.div>
    </div>
  );
};

export default HomePage;
