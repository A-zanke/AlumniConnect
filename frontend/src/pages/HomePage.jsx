import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUserGraduate, FaUsers, FaCalendarAlt, FaComments, FaNetworkWired, 
  FaRocket, FaGraduationCap, FaHeart, FaStar, FaThumbsUp, FaShare, FaComment,
  FaUserFriends, FaHandshake, FaBriefcase, FaGithub, FaLinkedin,
  FaMapMarkerAlt, FaPhone, FaEnvelope, FaChevronLeft, FaChevronRight,
  FaInstagram, FaFacebook, FaPlay, FaPause, FaQuoteLeft, FaLightbulb,
  FaChartLine, FaBell, FaAward, FaTrophy, FaBook, FaMedal
} from 'react-icons/fa';

// Import AI-generated service images
import chatImage from '../assets/generated_images/Real-time_Chat_Interface_8c19fdd5.png';
import forumImage from '../assets/generated_images/Forum_Discussions_Platform_d73c1145.png';
import jobImage from '../assets/generated_images/Job_and_Event_Updates_ba694180.png';
import aiImage from '../assets/generated_images/AI_Recommendations_System_8ecce832.png';
import networkImage from '../assets/generated_images/Social_Networking_Platform_d78c65ce.png';
import updatesImage from '../assets/generated_images/College_Updates_System_6da2d9ea.png';
import dummyImg from '../assets/images/Alumni1.png'
// Import your assets
import campusvdo from '../assets/generated-video.mp4';
import campusvdo2 from '../assets/video (1).mp4';
import ashishImg from '../assets/images/Ashish zanke.png';
import prajeshImg from '../assets/images/Prajesh kadam.png';
import kunalImg from '../assets/images/Kunal mahajan.png';
import sachinImg from '../assets/images/Sachin gunjakar.png';
// import deanImg from '../assets/images/Dean.jpg';
// import hodImg from '../assets/images/Hod.jpg';
import athrvaImg from '../assets/images/AtharvaD.png'

const HomePage = () => {
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef([]);

  // Hero carousel
  const heroSlides = [
    {
      type: 'video',
      src: campusvdo,
      alt: 'Graduation Success',
      title: 'Achieve Excellence',
      subtitle: 'Your journey to success starts here'
    },
    {
      type: 'video',
      src: campusvdo2,
      alt: 'Graduation Success',
      title: 'Achieve Excellence',
      subtitle: 'Your journey to success starts here'
    }
  ];

  // Enhanced services/features with AI images
  const features = [
    {
      icon: FaComments,
      title: 'Real-time Chat',
      description: 'Connect instantly with alumni worldwide through our secure real-time messaging platform.',
      gradient: 'from-cyan-500 to-blue-600',
      image: chatImage,
    },
    {
      icon: FaUsers,
      title: 'Forum Discussions',
      description: 'Engage in meaningful conversations and share knowledge in specialized topic forums.',
      gradient: 'from-purple-500 to-pink-600',
      image: forumImage,
    },
    {
      icon: FaBriefcase,
      title: 'Job & Event Updates',
      description: 'Stay informed about exclusive job opportunities, workshops, and networking events.',
      gradient: 'from-emerald-500 to-teal-600',
      image: jobImage,
    },
    {
      icon: FaLightbulb,
      title: 'AI Alumni Recommendations',
      description: 'Get personalized mentor matches powered by advanced AI algorithms.',
      gradient: 'from-orange-500 to-red-600',
      image: aiImage,
    },
    {
      icon: FaChartLine,
      title: 'Posts & Networking',
      description: 'Share achievements, insights, and build your professional network effortlessly.',
      gradient: 'from-indigo-500 to-purple-600',
      image: networkImage,
    },
    {
      icon: FaBell,
      title: 'College Updates & Opportunities',
      description: 'Receive real-time notifications about campus developments and opportunities.',
      gradient: 'from-pink-500 to-rose-600',
      image: updatesImage,
    }
  ];

  // Professional testimonials (reduced to 3)
  const testimonials = [
    {
      name: "Atharva Domale",
      role: "Data Scientist",
      company: "Google Inc.",
      department: "Artificial intelligence & Data Science",
      graduationYear: "Class of 2025",
      feedback: "The alumni network transformed my career trajectory. Through the mentorship program, I connected with industry leaders who provided invaluable guidance. The platform's AI-powered recommendations helped me discover opportunities I never knew existed.",
      rating: 5,
      image: athrvaImg,
      linkedIn: "linkedin.com/in/sarahchen"
    },
    {
      name: "Michael Rodriguez", 
      role: "Product Manager",
      company: "Microsoft Corporation",
      department: "Business Administration",
      graduationYear: "Class of 2017",
      feedback: "This platform is more than a network—it's a community. The real-time chat feature kept me connected with my batchmates globally, and the job board helped me land my dream role at Microsoft. Truly exceptional experience.",
      rating: 5,
      image: dummyImg,
      linkedIn: "linkedin.com/in/mrodriguez"
    },
    {
      name: "Dr. Priya Sharma",
      role: "Research Scientist",
      company: "Tesla Energy Division",
      department: "Electrical Engineering",
      graduationYear: "Class of 2015",
      feedback: "The forum discussions allowed me to collaborate with fellow alumni on cutting-edge research. The platform's professional ecosystem fostered meaningful connections that led to groundbreaking partnerships in renewable energy technology.",
      rating: 5,
      image: dummyImg,
      linkedIn: "linkedin.com/in/drpriyasharma"
    }
  ];

  // Faculty/Deans data with enhanced information
  const faculty = [
    {
      name: "Dr. Nilesh G patil",
      title: "Dean of Engineering",
      department: "Computer Science & Engineering",
      badge: "Dean",
      // image: deanImg,
      bio: "Leading innovation in computer science education with over 20 years of experience in academia and industry research.",
      email: "j.wilson@mitaoe.ac.in",
      education: "Ph.D. Computer Science, MIT USA",
      specialization: "AI & Machine Learning, Software Engineering",
      publications: "150+ Research Papers",
      awards: ["IEEE Fellow 2020", "Best Educator Award 2019"]
    },
    {
      name: "Dr. Kavita Bhosale",
      title: "Head of Department",
      department: "Artificial intelligence and Data Science", 
      badge: "Department Head",
      // image: hodImg,
      bio: "Pioneering advanced research in artificial intelligence and machine learning, mentoring the next generation of tech leaders.",
      email: "m.garcia@mitaoe.ac.in",
      education: "Ph.D. Information Technology, Stanford University",
      specialization: "Cloud Computing, Cybersecurity, Data Science",
      publications: "120+ Research Papers",
      awards: ["ACM Distinguished Educator 2021", "Women in Tech Award 2020"]
    }
  ];

  // Team creators data (4 developers) - Enhanced profiles
  const teamMembers = [
    {
      name: "Ashish Zanke",
      role: "Data Scientist",
      title: "Project Lead & Full Stack Developer",
      image: ashishImg,
      department: "Artificial Intelligence & Data Science",
      expertise: ["Python", "Data Science", "Ai/ML", "Mern Stack"],
      social: { github: "#", linkedin: "https://www.linkedin.com/in/ashish-zanke-3741b627a"},
      bio: "Specialized in building scalable AI solutions "
    },
    {
      name: "Prajesh Kadam", 
      role: "Data Scientist",
      title: "Backend Architecture Lead",
      image: prajeshImg, 
      department: "Artificial Intelligence & Data Science",
      expertise: ["Big Data", "ML Pipelines", "Cloud Infrastructure"],
      social: { github: "https://github.com/prajesh125", linkedin: "https://www.linkedin.com/in/prajesh-kadam-a72041258" },
      bio: "Expert in designing robust data pipelines and distributed systems"
    },
    {
      name: "Sachin Gunjkar",
      role: "Data Scientist", 
      title: "Full Stack Developer",
      image: sachinImg,
      department: "Software Development",
      expertise: ["React", "Node.js", "Database Design"],
      social: { github: "#", linkedin: "#" },
      bio: "Passionate about creating seamless user experiences with modern tech"
    },
    {
      name: "Kunal Mahajan",
      role: "ML Engineer",
      title: "AI Research Engineer",
      image: kunalImg,
      department: "Research & Development",
      expertise: ["Recommendation Systems", "Neural Networks", "TensorFlow"],
      social: { github: "https://github.com/KunalMahajan25", linkedin: "https://www.linkedin.com/in/kunal-mahajan-1b962434b"},
      bio: "Focused on cutting-edge AI research and production-ready ML models"
    }
  ];

  // Animated text slogans
  const slogans = [
    "Connect Inspire Grow!!!",
    "Building Tomorrow's Leaders Today.", 
    "Your Network is Your Net Worth.",
    "Excellence in Education & Beyond."
  ];

  // Hero carousel auto-play
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [heroSlides.length, isPlaying]);

  // Video management
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
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 60, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 12 } }
  };

  return (
    <div className="homepage-container">
      {/* ============================================ */}
      {/* HERO SECTION - KEEP AS IS */}
      {/* ============================================ */}
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

        {/* Hero Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center max-w-5xl mx-auto px-4">
            <motion.h1
              className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-blue-50 via-teal-100 to-white bg-clip-text text-transparent mb-8 leading-tight"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Welcome to Your{' '}
              
              <motion.span 
                className="bg-gradient-to-r from-indigo-600 via-purple-300 via-cyan-600 via-blue-400 to-cyan-200 bg-clip-text text-transparent"
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
                MIT {''}
              </motion.span>
              <motion.span 
                className="bg-gradient-to-r from-blue-50 via-teal-100 to-white bg-clip-text text-transparent"
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
            < br />
           
              

            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.5 }}
            >
              <Link to="/network">
                <motion.button
                  className="bg-gradient-to-r from-blue-400 via-teal-500 to-cyan-800 text-white px-10 py-5 rounded-full font-bold text-xl shadow-2xl border border-white/20"
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
              data-testid={`hero-indicator-${index}`}
            />
          ))}
        </div>

      </section>

      {/* ============================================ */}
      {/* OUR SERVICES SECTION - WITH AI IMAGES */}
      {/* ============================================ */}
      <section className="py-24 px-4 relative overflow-hidden services-section" id="services">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900"></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
              animate={{
                x: [Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)],
                y: [Math.random() * 800, Math.random() * 800],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              Our Services
            </motion.h2>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Empowering connections through cutting-edge technology and innovation
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="service-card-with-image glass-card group relative overflow-hidden"
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05, 
                  y: -12,
                  transition: { duration: 0.3 }
                }}
                data-testid={`service-card-${index}`}
              >
                {/* AI Image Background */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <motion.img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-6">
                  {/* Icon Container with Gradient */}
                  <motion.div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 mb-6 flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-shadow duration-500`}
                    whileHover={{ 
                      rotate: [0, -10, 10, -10, 0],
                      scale: 1.1,
                      transition: { duration: 0.5 }
                    }}
                  >
                    <feature.icon className="text-white text-3xl" />
                  </motion.div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-300 transition-colors duration-300">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Glowing Border Effect */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-cyan-400/50 transition-all duration-500"></div>
                  
                  {/* Shimmer Effect */}
                  <div className="shimmer-effect"></div>
                </div>

                {/* Video-like Pulse Animation */}
                <motion.div
                  className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* ALUMNI TESTIMONIALS SECTION - 3 PROFESSIONAL */}
      {/* ============================================ */}
      <section className="py-24 px-4 relative overflow-hidden testimonials-section">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700"></div>
        
        {/* Animated Mesh Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-mesh animate-mesh"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
              What Our Alumni Say 💬
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Success stories from our global alumni community
            </p>
          </motion.div>

          {/* Professional Testimonials Carousel */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="professional-testimonial-card glass-card mx-auto max-w-5xl"
                data-testid={`testimonial-${currentTestimonial}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left: Profile Section */}
                  <div className="md:col-span-1 flex flex-col items-center text-center">
                    {/* Avatar with Professional Border */}
                    <div className="relative mb-6">
                      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                        <img 
                          src={testimonials[currentTestimonial].image} 
                          alt={testimonials[currentTestimonial].name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect width='160' height='160' fill='%23667eea'/%3E%3Ctext x='50%25' y='50%25' font-size='64' fill='white' text-anchor='middle' dominant-baseline='middle'%3E${testimonials[currentTestimonial].name.charAt(0)}%3C/text%3E%3C/svg%3E`;
                          }}
                        />
                      </div>
                      {/* Professional Badge */}
                      <div className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                        <FaMedal className="inline mr-1" /> Alumni
                      </div>
                    </div>

                    {/* Name & Details */}
                    <h4 className="text-2xl font-bold text-white mb-2">
                      {testimonials[currentTestimonial].name}
                    </h4>
                    <p className="text-lg font-semibold text-cyan-300 mb-1">
                      {testimonials[currentTestimonial].role}
                    </p>
                    <p className="text-md text-white/80 mb-2">
                      {testimonials[currentTestimonial].company}
                    </p>
                    <p className="text-sm text-white/60 mb-3">
                      {testimonials[currentTestimonial].department}
                    </p>
                    <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-white/90 mb-4">
                      {testimonials[currentTestimonial].graduationYear}
                    </div>
                    
                    {/* Rating Stars */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                        <FaStar key={i} className="text-yellow-300 text-xl" />
                      ))}
                    </div>

                    {/* LinkedIn Link */}
                    <a 
                      href={`https://${testimonials[currentTestimonial].linkedIn}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                    >
                      <FaLinkedin className="text-2xl" />
                      <span className="text-sm">Connect on LinkedIn</span>
                    </a>
                  </div>

                  {/* Right: Testimonial Content */}
                  <div className="md:col-span-2 flex flex-col justify-center">
                    {/* Quote Icon */}
                    <FaQuoteLeft className="text-5xl text-white/20 mb-4" />

                    {/* Testimonial Text */}
                    <p className="text-xl md:text-2xl text-white font-light leading-relaxed mb-6 italic">
                      "{testimonials[currentTestimonial].feedback}"
                    </p>

                    {/* Professional Tags */}
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-white">
                        <FaBriefcase className="inline mr-2" />
                        Professional Growth
                      </span>
                      <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-white">
                        <FaNetworkWired className="inline mr-2" />
                        Networking
                      </span>
                      <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-white">
                        <FaAward className="inline mr-2" />
                        Success Story
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <div className="flex justify-center gap-4 mt-10">
              <button
                onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110"
                data-testid="testimonial-prev"
              >
                <FaChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110"
                data-testid="testimonial-next"
              >
                <FaChevronRight size={20} />
              </button>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-3 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial 
                      ? 'bg-white w-12' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  data-testid={`testimonial-dot-${index}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* COLLEGE FACULTY / DEANS SECTION - ENHANCED */}
      {/* ============================================ */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-100 to-blue-50" id="faculty">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              College Faculty 🎓
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Meet our distinguished leaders shaping the future of education
            </p>
          </motion.div>

          {/* Faculty Stats Sidebar + Profiles Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
            {/* Left Sidebar - Faculty Stats & Achievements */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="sticky top-8 space-y-6">
                {/* Faculty Excellence Card */}
                <div className="glass-card bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-8 shadow-xl">
                  <div className="text-center mb-6">
                    <FaTrophy className="text-6xl mx-auto mb-4 text-yellow-300" />
                    <h3 className="text-2xl font-bold mb-2">Faculty Excellence</h3>
                    <p className="text-white/90">Award-Winning Educators</p>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-4xl font-bold mb-1">270+</div>
                      <div className="text-sm text-white/80">Research Publications</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-4xl font-bold mb-1">40+</div>
                      <div className="text-sm text-white/80">Years Combined Experience</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-4xl font-bold mb-1">15+</div>
                      <div className="text-sm text-white/80">International Awards</div>
                    </div>
                  </div>
                </div>

                {/* Department Highlights */}
                <div className="glass-card bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
                  <h4 className="text-xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Department Highlights
                  </h4>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <FaAward className="text-indigo-600 mt-1 flex-shrink-0" />
                      <span className="text-sm">Top-ranked engineering programs</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <FaBook className="text-purple-600 mt-1 flex-shrink-0" />
                      <span className="text-sm">Industry-aligned curriculum</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <FaLightbulb className="text-pink-600 mt-1 flex-shrink-0" />
                      <span className="text-sm">Cutting-edge research labs</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <FaUserGraduate className="text-blue-600 mt-1 flex-shrink-0" />
                      <span className="text-sm">100% placement record</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Right: Faculty Profiles */}
            <div className="lg:col-span-3 space-y-8">
              {faculty.map((prof, index) => (
                <motion.div
                  key={index}
                  className="glass-card bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 hover:shadow-2xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  data-testid={`faculty-card-${index}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                    {/* Image Section */}
                    <div className="md:col-span-1 relative group">
                      <div className="relative h-80 md:h-full overflow-hidden">
                        <img
                          src={prof.image}
                          alt={prof.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%234f46e5'/%3E%3Ctext x='50%25' y='50%25' font-size='120' fill='white' text-anchor='middle' dominant-baseline='middle'%3E${prof.name.charAt(0)}%3C/text%3E%3C/svg%3E`;
                          }}
                        />
                        {/* Badge Overlay */}
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                          {prof.badge}
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="md:col-span-2 p-8">
                      <h3 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {prof.name}
                      </h3>
                      <p className="text-xl font-semibold text-gray-800 mb-1">
                        {prof.title}
                      </p>
                      <p className="text-md text-gray-600 mb-4">
                        {prof.department}
                      </p>

                      {/* Education & Specialization */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-500 mb-1">Education</p>
                          <p className="text-sm text-gray-700">{prof.education}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-500 mb-1">Specialization</p>
                          <p className="text-sm text-gray-700">{prof.specialization}</p>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {prof.bio}
                      </p>

                      {/* Publications & Awards */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                          <FaBook className="inline mr-1" /> {prof.publications}
                        </span>
                        {prof.awards.map((award, i) => (
                          <span key={i} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold">
                            <FaAward className="inline mr-1" /> {award}
                          </span>
                        ))}
                      </div>

                      {/* Contact */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaEnvelope className="text-indigo-600" />
                        <a href={`mailto:${prof.email}`} className="text-sm hover:text-indigo-600 transition-colors">
                          {prof.email}
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* DEVELOPERS SECTION - PROFESSIONAL CORPORATE */}
      {/* ============================================ */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" id="team">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Meet Our Development Team 👨‍💻
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              The brilliant minds powering innovation
            </p>
          </motion.div>

          {/* Professional Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                className="professional-team-card glass-card group"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.03, y: -8 }}
                data-testid={`team-member-${index}`}
              >
                <div className="flex gap-6 items-start">
                  {/* Avatar with Glow Effect */}
                  <motion.div 
                    className="relative flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-transparent bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-1 shadow-2xl">
                      <div className="w-full h-full rounded-xl overflow-hidden bg-slate-800">
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%236366f1'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle'%3E${member.name.charAt(0)}%3C/text%3E%3C/svg%3E`;
                          }}
                        />
                      </div>
                    </div>
                    {/* Status Indicator */}
                    
                  </motion.div>

                  {/* Member Info */}
                  <div className="flex-1">
                    {/* Name & Title */}
                    <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent font-semibold mb-1">
                      {member.title}
                    </p>
                    <p className="text-sm text-slate-400 mb-3">{member.department}</p>

                    {/* Bio */}
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      {member.bio}
                    </p>

                    {/* Expertise Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {member.expertise.map((skill, i) => (
                        <span 
                          key={i}
                          className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white border border-white/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Social Links */}
                    <div className="flex gap-4">
                      <a 
                        href={member.social.github} 
                        className="text-white/70 hover:text-cyan-400 transition-colors duration-300 hover:scale-125 transform"
                        aria-label="GitHub"
                      >
                        <FaGithub size={24} />
                      </a>
                      <a 
                        href={member.social.linkedin} 
                        className="text-white/70 hover:text-blue-400 transition-colors duration-300 hover:scale-125 transform"
                        aria-label="LinkedIn"
                      >
                        <FaLinkedin size={24} />
                      </a>
                      
                    </div>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* GET IN TOUCH SECTION */}
      {/* ============================================ */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" id="contact">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Get In Touch 📍
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Visit us or reach out - we're here to help
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info Cards */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              {/* Address Card */}
              <motion.div 
                className="glass-card bg-white border border-blue-200 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group"
                whileHover={{ scale: 1.02, y: -5 }}
                data-testid="contact-address"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FaMapMarkerAlt className="text-white text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Address</h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      Maharashtra Institute of Technology<br />(Autonomous Institute)<br />
                      Gate No 5, Beed Bypass Rd, Satara Parisar, <br />
                      Chhatrapati Sambhajinagar, <br />
                      Maharashtra 431010, India
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Phone Card */}
              <motion.div 
                className="glass-card bg-white border border-purple-200 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group"
                whileHover={{ scale: 1.02, y: -5 }}
                data-testid="contact-phone"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FaPhone className="text-white text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Phone</h3>
                    <p className="text-gray-600 text-lg">+91-240-2375375</p>
                    <p className="text-gray-600 text-lg">+91-240-2376154</p>
                  </div>
                </div>
              </motion.div>

              {/* Email Card */}
              <motion.div 
                className="glass-card bg-white border border-cyan-200 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group"
                whileHover={{ scale: 1.02, y: -5 }}
                data-testid="contact-email"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FaEnvelope className="text-white text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Email</h3>
                    <p className="text-gray-600 text-lg">admissions@mit.asia</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Google Maps Embed */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="h-full min-h-[500px]"
            >
              <div className="relative h-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white group">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d120073.48077066877!2d75.3482569!3d19.8697077!3m2!1i1024!2i768!4f13.1!2m1!1smit%20aurangabad%20maharashtra!5e0!3m2!1sen!2sin!4v1762177861274!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale-0 group-hover:grayscale-0 transition-all duration-500"
                  title="MIT Academy of Engineering Location"
                ></iframe>

                {/* Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
