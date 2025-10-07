import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUserGraduate, FaUsers, FaCalendarAlt, FaComments, FaNetworkWired, 
  FaRocket, FaGraduationCap, FaHeart, FaStar, FaThumbsUp, FaShare, FaComment,
  FaUserFriends, FaHandshake, FaBriefcase, FaGithub, FaLinkedin, FaTwitter,
  FaMapMarkerAlt, FaPhone, FaEnvelope, FaChevronLeft, FaChevronRight,
  FaInstagram, FaFacebook, FaPlay, FaPause, FaQuoteLeft
} from 'react-icons/fa';
import { postsAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

// Import your assets (place these files in src/assets/)
import campusvdo from '../assets/generated-video.mp4';
// import campusImage from '../assets/Generated Image September 21, 2025 - 11_12AM (1).png'; // Your existing image
// import campusImage2 from '../assets/Generated Image September 21, 2025 - 10_59AM.png';
import campusvdo2 from '../assets/video (1).mp4';
import ashishImg from '../assets/images/Ashish zanke.jpg';

const HomePage = () => {
  const { user } = useAuth();
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef([]);

  // Enhanced hero carousel - Replace paths with your actual asset files
  const heroSlides = [
    // {
    //   type: 'image',
    //   src: campusImage,
    //   alt: 'Alumni Success Stories',
    //   title: 'Connect Globally',
    //   subtitle: 'Join thousands of alumni worldwide'
    // },
  
    {
      type: 'video',
      src: campusvdo, // Place image in public/assets/images/
      alt: 'Graduation Success',
      title: 'Achieve Excellence',
      subtitle: 'Your journey to success starts here'
    },
    // {
    //   type:'image',
    //   src: campusImage2,
    //   title: 'Connect Globally',
    //   subtitle: 'Join thousands of alumni worldwide'
    // },
    {
      type: 'video',
      src: campusvdo2, // Place image in public/assets/images/
      alt: 'Graduation Success',
      title: 'Achieve Excellence',
      subtitle: 'Your journey to success starts here'
    }
  ];

  // Animated text slogans
  const slogans = [
    // "Connect. Inspire. Grow.",
    // "Building Tomorrow's Leaders Today.", 
    // "Your Network is Your Net Worth.",
    // "Excellence in Education & Beyond."
  ];

  // const stats = [
  //   { number: '5000+', label: 'Alumni', icon: FaUserGraduate, color: 'from-emerald-400 to-teal-500' },
  //   { number: '1000+', label: 'Active Members', icon: FaUsers, color: 'from-blue-400 to-indigo-500' },
  //   { number: '500+', label: 'Events', icon: FaCalendarAlt, color: 'from-purple-400 to-pink-500' },
  //   { number: '50+', label: 'Countries', icon: FaNetworkWired, color: 'from-orange-400 to-red-500' }
  // ];

  // Enhanced services/features
  const features = [
    {
      icon: FaUserFriends,
      title: 'Real-time Alumni Connection',
      description: 'Connect instantly with alumni worldwide through our advanced networking platform.',
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      icon: FaHandshake,
      title: 'Alumni Recommendations', 
      description: 'Get personalized recommendations and mentorship from industry leaders.',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      icon: FaCalendarAlt,
      title: 'Department & Event Details',
      description: 'Stay updated with department events, workshops, and networking sessions.',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      icon: FaBriefcase,
      title: 'Placement Updates',
      description: 'Access exclusive job opportunities and career advancement resources.',
      gradient: 'from-orange-500 to-red-600',
    },
    {
      icon: FaComments,
      title: 'Chat & Connect with Friends',
      description: 'Message friends and colleagues through our secure communication platform.',
      gradient: 'from-indigo-500 to-purple-600',
    }
  ];

  // Enhanced testimonials (9 testimonials to show 3 per slide)
  const testimonials = [
    {
      name: "Sarah Chen",
      company: "Google",
      department: "Computer Science",
      feedback: "The alumni network helped me land my dream job. The connections I made here are invaluable for my career growth and personal development.",
      rating: 5,
      image: "/assets/images/avatars/sarah-chen.jpg" // Place in public/assets/images/avatars/
    },
    {
      name: "Michael Rodriguez", 
      company: "Microsoft",
      department: "Software Engineering",
      feedback: "Amazing platform that keeps me connected with my alma mater. The mentorship opportunities are exceptional and life-changing.",
      rating: 5,
      image: "/assets/images/avatars/michael-rodriguez.jpg"
    },
    {
      name: "Emily Johnson",
      company: "Tesla",
      department: "Electrical Engineering", 
      feedback: "Through this network, I found mentors who guided me to success. Highly recommended for all graduates seeking growth.",
      rating: 5,
      image: "/assets/images/avatars/emily-johnson.jpg"
    },
    {
      name: "David Kim",
      company: "Apple",
      department: "Design",
      feedback: "The networking events and connections made through this platform transformed my career trajectory completely.",
      rating: 5,
      image: "/assets/images/avatars/david-kim.jpg"
    },
    {
      name: "Lisa Wang",
      company: "Amazon",
      department: "Business Administration",
      feedback: "Incredible platform for professional growth. The alumni community is supportive, inspiring, and genuinely helpful.",
      rating: 5,
      image: "/assets/images/avatars/lisa-wang.jpg"
    },
    {
      name: "James Wilson",
      company: "Netflix",
      department: "Media Studies",
      feedback: "The connections I made through this platform opened doors I never thought possible in the entertainment industry.",
      rating: 5,
      image: "/assets/images/avatars/james-wilson.jpg"
    },
    {
      name: "Priya Sharma",
      company: "Uber",
      department: "Computer Science",
      feedback: "Outstanding network that continues to provide value years after graduation. The community is incredibly strong.",
      rating: 5,
      image: "/assets/images/avatars/priya-sharma.jpg"
    },
    {
      name: "Robert Chang",
      company: "Spotify",
      department: "Music Technology",
      feedback: "This platform bridges the gap between students and successful alumni perfectly. Truly transformative experience.",
      rating: 5,
      image: "/assets/images/avatars/robert-chang.jpg"
    },
    {
      name: "Anna Martinez",
      company: "Meta",
      department: "Psychology",
      feedback: "The mentorship and guidance I received through this network has been life-changing and career-defining.",
      rating: 5,
      image: "/assets/images/avatars/anna-martinez.jpg"
    }
  ];

  // Group testimonials into slides of 3
  const testimonialSlides = [];
  for (let i = 0; i < testimonials.length; i += 3) {
    testimonialSlides.push(testimonials.slice(i, i + 3));
  }

  // Professors data
  const professors = [
    {
      name: "Dr. James Wilson",
      title: "Head of Computer Science",
      department: "Computer Science & Engineering",
      // image: "/assets/images/faculty/dr-james-wilson.jpg";// Place in public/assets/images/faculty/
    },
    {
      name: "Dr. Maria Garcia",
      title: "Professor of Engineering",
      department: "Mechanical Engineering", 
      image: "../assets/images/"
    },
    {
      name: "Dr. Robert Chang",
      title: "Dean of Technology",
      department: "Information Technology",
      image: "/assets/images/faculty/dr-robert-chang.jpg"
    },
    {
      name: "Dr. Lisa Anderson",
      title: "Professor of Business",
      department: "Business Administration",
      image: "/assets/images/faculty/dr-lisa-anderson.jpg"
    }
  ];

  // Team creators data
  const teamMembers = [
    {
      name: "Ashish Zanke",
      role: "Data Scientist",
      image: ashishImg // Place in public/assets/images/team/
    },
    {
      name: "Prajesh Kadam", 
      role: "Data Scientist",
      image: "/assets/images/team/priya-sharma.jpg"
    },
    {
      name: "Sachin Gunjkar",
      role: "Data Scientist", 
      image: "/assets/images/team/jordan-lee.jpg"
    },
    {
      name: "Kunal Mahajan",
      role: "Data Scientist",
      image: "/assets/images/team/sam-davis.jpg"
    }
  ];

  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // Hero carousel auto-play
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [heroSlides.length, isPlaying]);

  // Ensure current video is playing and others are paused to avoid white flash on switch
  useEffect(() => {
    heroSlides.forEach((slide, idx) => {
      const vid = videoRefs.current[idx];
      if (!vid || slide.type !== 'video') return;
      try {
        if (idx === currentHeroSlide) {
          const p = vid.play?.();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } else {
          vid.pause?.();
        }
      } catch (e) {
        // no-op
      }
    });
  }, [currentHeroSlide, heroSlides]);

  // Testimonials auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonialSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonialSlides.length]);

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
    <div className="hero-section">
      {/* Enhanced Hero Section with Video/Image Carousel */}
      <section className="relative h-screen overflow-hidden" id="home">
        {/* Background Carousel with Video Support */}
        <div className="hero-overlay">
          <div className="absolute inset-0 bg-black">
            {heroSlides.map((slide, idx) => (
              slide.type === 'video' ? (
                <video
                  key={`video-${idx}`}
                  ref={(el) => (videoRefs.current[idx] = el)}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${idx === currentHeroSlide ? 'opacity-100' : 'opacity-0'}`}
                  muted
                  playsInline
                  loop
                  preload="auto"
                >
                  <source src={slide.src} type="video/mp4" />
                </video>
              ) : (
                <img
                  key={`img-${idx}`}
                  src={slide.src}
                  alt={slide.alt}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${idx === currentHeroSlide ? 'opacity-100' : 'opacity-0'}`}
                />
              )
            ))}
          </div>
        </div>


        {/* Play/Pause Control */}
        {/* <div className="absolute bottom-20 right-8 z-20">
          <motion.button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-white/20 backdrop-blur-md border border-white/30 text-white p-3 rounded-full hover:bg-white/30 transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
          </motion.button>
        </div> */}

        {/* Hero Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center max-w-5xl mx-auto px-4">
            <motion.h1
              className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-tight"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Welcome to Your{' '}
              <motion.span 
                className="bg-gradient-to-r from-blue-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: '200% 100%'
                }}
              >
                Alumni Network
              </motion.span>
            </motion.h1>

            <motion.div
              className="text-xl md:text-2xl text-blue-100 mb-12 h-16 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentHeroSlide}
                  initial={{ opacity: 0.3, y: 30, rotateX: 90 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, y: -30, rotateX: -90 }}
                  transition={{ duration: 0.2 }}
                  className="font-light tracking-wide"
                >
                  {slogans[currentHeroSlide]}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.5 }}
            >
              <Link to="/network">
                <motion.button
                  className="bg-gradient-to-r from-blue-500 via-teal-500 to-cyan-500 text-white px-10 py-5 rounded-full font-bold text-xl shadow-2xl border border-white/20"
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: "0 25px 50px rgba(59, 130, 246, 0.5)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaRocket className="inline mr-3" /> Join Alumni Network
                </motion.button>
              </Link>
              <Link to="/events">
                <motion.button
                  className="border-2 border-white text-white px-10 py-5 rounded-full font-bold text-xl hover:bg-white hover:text-slate-900 transition-all duration-300 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Explore Events
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentHeroSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentHeroSlide 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section (Enhanced) */}
      {/* <section className="py-20 px-4 bg-gradient-to-br from-slate-100 to-slate-200">
        <motion.div 
          className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stats.map((stat, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ scale: 1.05, y: -10 }}>
              <div className="p-8 rounded-2xl bg-white shadow-xl text-center border border-gray-200 hover:shadow-2xl transition-all duration-500">
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${stat.color} mb-4`}>
                  <stat.icon className="text-white text-3xl" />
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">{stat.number}</div>
                <p className="text-slate-600 font-medium">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section> */}

      {/* Services Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 to-slate-800" id="services">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Our <span className="text-blue-400">Services</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Empowering alumni connections through innovative technology and comprehensive networking solutions
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-600/30 hover:border-blue-400/50 transition-all duration-500 group"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, rotateY: 5 }}
              >
                <motion.div
                  className="text-4xl text-blue-400 mb-6 group-hover:text-teal-400 transition-colors duration-300"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                >
                  <feature.icon />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section className="py-20 overflow-hidden relative" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite'
      }}>
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute opacity-10"
              animate={{
                x: [0, 100, 0],
                y: [0, -100, 50, 0],
                rotate: [0, 180, 360],
                scale: [1, 1.5, 0.8, 1],
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${20 + Math.random() * 40}px`,
                height: `${20 + Math.random() * 40}px`,
                background: `conic-gradient(from ${i * 45}deg, #ffffff, #transparent, #ffffff)`,
                borderRadius: Math.random() > 0.5 ? '50%' : '10%',
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-2xl">
              What Our{' '}
              <motion.span 
                className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: '200% 100%'
                }}
              >
                Alumni Say
              </motion.span>
            </h2>
            <p className="text-xl text-white/90 font-light">Discover the impact of our community through their success stories</p>
          </motion.div>

          {/* 3 Testimonials Per Slide */}
          <div className="relative h-96 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                className="absolute inset-0 flex items-center"
                initial={{ opacity: 0, x: 1000, rotateY: 90 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -1000, rotateY: -90 }}
                transition={{ duration: 1, type: "spring", stiffness: 100 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                  {testimonialSlides[currentTestimonial]?.map((testimonial, index) => (
                    <motion.div
                      key={index}
                      className="relative group"
                      initial={{ opacity: 0, y: 50, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.2 }}
                      whileHover={{ scale: 1.05, y: -10 }}
                    >
                      <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 h-full relative overflow-hidden">
                        {/* Quote Icon */}
                        <FaQuoteLeft className="text-4xl text-white/30 absolute top-4 left-4" />
                        
                        {/* Profile */}
                        <div className="flex items-center mb-6 relative z-10">
                          <motion.img
                            src={testimonial.image}
                            alt={testimonial.name}
                            className="w-16 h-16 rounded-full object-cover border-4 border-white/50 shadow-lg"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          />
                          <div className="ml-4">
                            <h4 className="text-xl font-bold text-white drop-shadow-lg">
                              {testimonial.name}
                            </h4>
                            <p className="text-white/80 font-medium">
                              {testimonial.company} • {testimonial.department}
                            </p>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5 + i * 0.1 }}
                            >
                              <FaStar className="text-yellow-300 text-lg drop-shadow-lg" />
                            </motion.div>
                          ))}
                        </div>

                        {/* Feedback */}
                        <p className="text-white/95 italic leading-relaxed font-light text-lg drop-shadow-sm">
                          "{testimonial.feedback}"
                        </p>

                        {/* Decorative Elements */}
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-pink-400/20 to-purple-600/20 rounded-full blur-xl" />
                        <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 rounded-full blur-lg" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Enhanced Navigation */}
          <div className="flex justify-center items-center mt-12 space-x-6">
            <motion.button
              onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonialSlides.length) % testimonialSlides.length)}
              className="bg-white/20 backdrop-blur-md border border-white/40 text-white p-4 rounded-full hover:bg-white/30 transition-all duration-300 shadow-xl"
              whileHover={{ scale: 1.1, boxShadow: "0 10px 30px rgba(255,255,255,0.2)" }}
              whileTap={{ scale: 0.9 }}
            >
              <FaChevronLeft size={20} />
            </motion.button>

            {/* Slide Indicators */}
            <div className="flex space-x-3">
              {testimonialSlides.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial 
                      ? 'bg-white w-8 shadow-lg' 
                      : 'bg-white/50 w-3 hover:bg-white/75'
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>

            <motion.button
              onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonialSlides.length)}
              className="bg-white/20 backdrop-blur-md border border-white/40 text-white p-4 rounded-full hover:bg-white/30 transition-all duration-300 shadow-xl"
              whileHover={{ scale: 1.1, boxShadow: "0 10px 30px rgba(255,255,255,0.2)" }}
              whileTap={{ scale: 0.9 }}
            >
              <FaChevronRight size={20} />
            </motion.button>
          </div>
        </div>

        <style jsx>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50% }
            50% { background-position: 100% 50% }
            100% { background-position: 0% 50% }
          }
        `}</style>
      </section>

      {/* About Us Section - Redesigned */}
      <section className="py-20 relative overflow-hidden" id="about-us" style={{
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 50%, #020617 100%)'
      }}>
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 70%),
              radial-gradient(circle at 75% 75%, #8b5cf6 0%, transparent 70%),
              radial-gradient(circle at 75% 25%, #06b6d4 0%, transparent 70%),
              radial-gradient(circle at 25% 75%, #10b981 0%, transparent 70%)
            `
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6">
              About{' '}
              <motion.span 
                className="bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: '200% 100%'
                }}
              >
                Us
              </motion.span>
            </h2>
            <motion.div 
              className="w-24 h-1 bg-gradient-to-r from-blue-500 to-teal-500 mx-auto rounded-full"
              initial={{ width: 0 }}
              whileInView={{ width: 96 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </motion.div>

          {/* Professors Section */}
          <div className="mb-24">
            <motion.h3
              className="text-4xl font-bold text-center text-white mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              Distinguished{' '}
              <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
                Faculty
              </span>
            </motion.h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {professors.map((professor, index) => (
                <motion.div
                  key={index}
                  className="group relative"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10 }}
                >
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 hover:border-blue-400/50 transition-all duration-500 text-center relative overflow-hidden">
                    {/* Background Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <motion.img
                      src={professor.image}
                      alt={professor.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto mb-6 border-4 border-gradient-to-br from-blue-400 to-teal-400 shadow-2xl relative z-10"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                    <h4 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300 relative z-10">
                      {professor.name}
                    </h4>
                    <p className="text-blue-300 font-semibold mb-2 relative z-10">{professor.title}</p>
                    <p className="text-slate-400 text-sm relative z-10">{professor.department}</p>
                    
                    {/* Decorative Elements */}
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Team Creators Section */}
          <div>
            <motion.h3
              className="text-4xl font-bold text-center text-white mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              Development{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Team
              </span>
            </motion.h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={index}
                  className="group relative"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10, rotateY: 10 }}
                >
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 hover:border-purple-400/50 transition-all duration-500 text-center relative overflow-hidden">
                    {/* Background Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <motion.img
                      src={member.image}
                      alt={member.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto mb-6 border-4 border-gradient-to-br from-purple-400 to-pink-400 shadow-2xl relative z-10"
                      whileHover={{ scale: 1.1, rotate: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                    <h4 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-300 relative z-10">
                      {member.name}
                    </h4>
                    <p className="text-purple-300 font-semibold relative z-10">{member.role}</p>
                    
                    {/* Decorative Elements */}
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section - Redesigned */}
      <section className="py-20 relative overflow-hidden" id="contact" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #475569 75%, #64748b 100%)'
      }}>
        {/* Floating Elements */}
        

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6">
              Get in{' '}
              <motion.span 
                className="bg-gradient-to-r from-blue-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: '200% 100%'
                }}
              >
                Touch
              </motion.span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Ready to join our alumni network? We'd love to hear from you and help you connect with your community.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <motion.div
              className="relative group"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-10 border border-white/90 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-teal-500/5" />
                
                <h3 className="text-3xl font-bold text-white mb-8 relative z-10">Send us a Message</h3>
                <form className="space-y-6 relative z-10">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Name</label>
                    <motion.input
                      type="text"
                      className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 backdrop-blur-sm"
                      placeholder="Your full name"
                      whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Email</label>
                    <motion.input
                      type="email"
                      className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 backdrop-blur-sm"
                      placeholder="your.email@example.com"
                      whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Message</label>
                    <motion.textarea
                      rows={6}
                      className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 resize-none backdrop-blur-sm"
                      placeholder="Tell us how we can help you..."
                      whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" }}
                    />
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 via-teal-500 to-cyan-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all duration-300"
                    whileHover={{ 
                      scale: 1.02, 
                      boxShadow: "0 20px 40px rgba(59, 130, 246, 0.4)" 
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Send Message
                  </motion.button>
                </form>
              </div>
            </motion.div>

            {/* Contact Info & Map */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              {/* Map Placeholder */}
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 border border-white/20 h-80 relative overflow-hidden group">
                < div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 rounded-2xl flex items-center justify-center relative">
                  <div className="text-center text-white">
                    <iframe 
                    title="College Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3752.779073968298!2d75.31929637499815!3d19.849298681521073!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdb988c254eb873%3A0x4388791935b718e6!2sMaharashtra%20Institute%20Of%20Technology!5e0!3m2!1sen!2sin!4v1758467474904!5m2!1sen!2sin" 
                    onClick={() =>
                    window.open(
                   'https://www.google.com/maps/place/Marathwada+Institute+of+Technology/@19.872857,75.342857,17z',
                   '_blank')}
                    
                    width="600" 
                    height="450" 
                    // style="border:0;"
                    allowfullscreen="" 
                    loading="lazy" 
                    referrerpolicy="no-referrer-when-downgrade">

                    </iframe>
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <FaMapMarkerAlt className="text-6xl mx-auto mb-4 text-blue-400" />
                    </motion.div>
                    <p className="text-xl font-semibold">Interactive Map</p>
                    <p className="text-sm text-slate-300">Replace with Google Maps integration</p>
                  </div>
                 </div>
                 
              </div>

              {/* Contact Details */}
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-xl">
                <h3 className="text-3xl font-bold text-white mb-8">Contact Information</h3>
                <div className="space-y-6">
                  <motion.div 
                    className="flex items-center text-slate-300 group cursor-pointer"
                    whileHover={{ x: 10, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="bg-gradient-to-br from-blue-500 to-teal-500 p-4 rounded-full mr-6 group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                      <FaMapMarkerAlt className="text-white text-xl" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">Address</p>
                      <p className="text-slate-300">123 University Avenue, College Town, CT 12345</p>
                    </div>
                  </motion.div>
                  <motion.div 
                    className="flex items-center text-slate-300 group cursor-pointer"
                    whileHover={{ x: 10, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-full mr-6 group-hover:shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                      <FaPhone className="text-white text-xl" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">Phone</p>
                      <p className="text-slate-300">+1 (555) 123-4567</p>
                    </div>
                  </motion.div>
                  <motion.div 
                    className="flex items-center text-slate-300 group cursor-pointer"
                    whileHover={{ x: 10, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="bg-gradient-to-br from-green-500 to-teal-500 p-4 rounded-full mr-6 group-hover:shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
                      <FaEnvelope className="text-white text-xl" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">Email</p>
                      <p className="text-slate-300">alumni@university.edu</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
    </div>
  );
};

export default HomePage;