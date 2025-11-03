import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

// Embedded Styles
const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .animated-gradient {
    background: linear-gradient(270deg, #6366f1, #a855f7, #ec4899);
    background-size: 600% 600%;
    animation: gradient-shift 8s ease infinite;
  }

  .perspective-1000 {
    perspective: 1000px;
  }

  .preserve-3d {
    transform-style: preserve-3d;
  }

  .backface-hidden {
    backfaceVisibility: hidden;
    -webkit-backfaceVisibility: hidden;
  }

  .glass-effect {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .text-gradient {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hover-lift {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .hover-lift:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.3);
  }

  .glow-border {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
  }

  .glow-border::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
    border-radius: 16px;
    opacity: 0.7;
    filter: blur(8px);
    z-index: -1;
    animation: pulse-glow 3s ease-in-out infinite;
  }

  * {
    box-sizing: border-box;
  }
`;

// Icons as SVG components
const GraduationCapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TargetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const AwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </svg>
);

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

// Developer Card Component
const DeveloperCard = ({ name, role, bio, skills, social }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const cardStyle = {
    position: 'relative',
    height: '320px',
    cursor: 'pointer',
    perspective: '1000px'
  };

  const cardInnerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s'
  };

  const cardFaceStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(168, 85, 247, 0.05) 100%)',
    border: '1px solid rgba(99, 102, 241, 0.2)'
  };

  const cardBackStyle = {
    ...cardFaceStyle,
    transform: 'rotateY(180deg)',
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(99, 102, 241, 0.05) 100%)'
  };

  return (
    <motion.div
      style={cardStyle}
      onHoverStart={() => setIsFlipped(true)}
      onHoverEnd={() => setIsFlipped(false)}
      onClick={() => setIsFlipped(!isFlipped)}
      whileHover={{ scale: 1.02, y: -8 }}
      transition={{ duration: 0.3 }}
      data-testid={`card-developer-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <motion.div
        style={cardInnerStyle}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Front */}
        <div style={cardFaceStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', textAlign: 'center' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{
                width: '112px',
                height: '112px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#6366f1'
                }}>
                  {name.split(" ").map(n => n[0]).join("")}
                </div>
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                right: '-8px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                color: 'white'
              }}>
                <SparklesIcon />
              </div>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
              {name}
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500', marginBottom: '16px' }}>
              {role}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', flexGrow: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {bio}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: 'auto' }}>
              Hover or tap to see more
            </p>
          </div>
        </div>

        {/* Back */}
        <div style={cardBackStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', textAlign: 'center' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
              Skills & Expertise
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <a
                href={social.github}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1f2937',
                  transition: 'all 0.3s'
                }}
                aria-label="GitHub"
              >
                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a
                href={social.linkedin}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1f2937',
                  transition: 'all 0.3s'
                }}
                aria-label="LinkedIn"
              >
                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Faculty Card Component
const FacultyCard = ({ name, title, department, credentials, badge }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      transition={{ duration: 0.6 }}
      style={{ position: 'relative', marginBottom: '32px' }}
      data-testid={`card-faculty-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="glow-border">
        <div style={{
          position: 'relative',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
            {/* Image Section */}
            <div style={{
              width: window.innerWidth < 768 ? '100%' : '40%',
              position: 'relative'
            }}>
              <div style={{
                height: '256px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4)',
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {name.split(" ").map(n => n[0]).join("")}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div style={{ width: window.innerWidth < 768 ? '100%' : '60%', padding: '32px', position: 'relative' }}>
              {/* Badge */}
              <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    inset: '-4px',
                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                    borderRadius: '20px',
                    filter: 'blur(8px)',
                    opacity: 0.7
                  }} className="animated-gradient" />
                  <div style={{
                    position: 'relative',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    background: '#6366f1',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                  }}>
                    {badge}
                  </div>
                </div>
              </div>

              <div style={{ paddingRight: '96px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                  {name}
                </h3>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                  {title}
                </p>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  {department}
                </p>
              </div>

              {/* Credentials */}
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {credentials.map((credential, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px',
                      flexShrink: 0,
                      color: '#6366f1'
                    }}>
                      <AwardIcon />
                    </div>
                    <p style={{ fontSize: '14px', color: '#1f2937', lineHeight: '1.6' }}>
                      {credential}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function About() {
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true });

  const developers = [
    {
      name: "Ashish Zanke",
      role: "Project Lead & Full Stack Developer",
      bio: "Leading the AlumniConnect initiative with a vision to bridge the gap between students and alumni through innovative technology solutions.",
      skills: ["React", "Node.js", "System Design", "Team Leadership"],
      social: { github: "#", linkedin: "#" }
    },
    {
      name: "Kunal Mahajan",
      role: "Frontend Developer",
      bio: "Crafting beautiful and intuitive user experiences that make networking seamless and engaging for our community.",
      skills: ["React", "TypeScript", "UI/UX", "Framer Motion"],
      social: { github: "#", linkedin: "#" }
    },
    {
      name: "Prajesh Kadam",
      role: "Backend Developer",
      bio: "Building robust and scalable backend systems that power real-time communication and data management for thousands of users.",
      skills: ["Node.js", "PostgreSQL", "APIs", "WebSockets"],
      social: { github: "#", linkedin: "#" }
    },
    {
      name: "Sachin Gunjkar",
      role: "Full Stack Developer",
      bio: "Implementing AI-powered features and ensuring seamless integration between all platform components for optimal performance.",
      skills: ["Python", "React", "AI/ML", "Cloud Services"],
      social: { github: "#", linkedin: "#" }
    }
  ];

  const facultyMembers = [
    {
      name: "Dr. Nilesh G Patil",
      title: "Dean of MIT",
      department: "MIT College of Engineering",
      badge: "Dean",
      credentials: [
        "Ph.D. in Computer Science from IIT Bombay",
        "20+ years of experience in academia and industry",
        "Published 50+ research papers in top-tier journals",
        "Mentor to 100+ successful alumni working in Fortune 500 companies"
      ]
    },
    {
      name: "Dr. Kavita Bhosale",
      title: "HOD",
      department: "AIDS",
      badge: "HOD",
      credentials: [
        "M.Tech in Information Technology",
        "15+ years of teaching experience",
        "Expert in AI, Machine Learning, and Data Science",
        "Guiding students in research and career development"
      ]
    }
  ];

  return (
    <>
      <style>{styles}</style>
      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* About MIT College Section */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 0 128px' }}>
          {/* Animated background */}
          <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), #f9fafb, rgba(236, 72, 153, 0.05))'
            }} />
            <div style={{
              position: 'absolute',
              top: 0,
              left: '25%',
              width: '384px',
              height: '384px',
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              animation: 'pulse-glow 4s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: '25%',
              width: '384px',
              height: '384px',
              background: 'rgba(168, 85, 247, 0.1)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              animation: 'pulse-glow 4s ease-in-out infinite',
              animationDelay: '1s'
            }} />
          </div>

          <motion.div
            ref={heroRef}
            initial="hidden"
            animate={isHeroInView ? "visible" : "hidden"}
            variants={staggerContainer}
            style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}
          >
            <div style={{ textAlign: 'center', maxWidth: '896px', margin: '0 auto' }}>
              {/* Badge */}
              <motion.div
                variants={fadeInUp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '24px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  marginBottom: '24px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                <GraduationCapIcon />
                <span>About MIT College</span>
              </motion.div>

              {/* Title */}
              <motion.h1
                variants={fadeInUp}
                style={{
                  fontSize: window.innerWidth < 640 ? '36px' : window.innerWidth < 1024 ? '48px' : '60px',
                  fontWeight: 'bold',
                  lineHeight: '1.1',
                  marginBottom: '24px'
                }}
              >
                <span className="text-gradient">
                  Bridging Students, Alumni, and Mentors
                </span>
                <br />
                <span style={{ color: '#1f2937' }}>through Technology</span>
              </motion.h1>

              {/* Description */}
              <motion.p
                variants={fadeInUp}
                style={{
                  fontSize: '18px',
                  color: '#6b7280',
                  lineHeight: '1.75',
                  marginBottom: '32px'
                }}
              >
                MIT College of Engineering has been a beacon of excellence in technical education for over three decades.
                With a strong focus on innovation, practical learning, and industry collaboration, we have nurtured thousands
                of engineers who are now making their mark across the globe.
              </motion.p>

              <motion.p
                variants={fadeInUp}
                style={{
                  fontSize: '18px',
                  color: '#6b7280',
                  lineHeight: '1.75'
                }}
              >
                AlumniConnect is our digital bridge—a platform designed to strengthen the bond between current students,
                distinguished alumni, and dedicated faculty. Here, knowledge flows freely, mentorship thrives, and
                opportunities are created through meaningful connections.
              </motion.p>

              {/* Stats */}
              <motion.div
                variants={fadeInUp}
                style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  gap: '24px',
                  marginTop: '48px'
                }}
              >
                {[
                  { Icon: UsersIcon, value: "10K+", label: "Active Users" },
                  { Icon: GraduationCapIcon, value: "5K+", label: "Alumni Network" },
                  { Icon: TargetIcon, value: "500+", label: "Mentorship Sessions" },
                  { Icon: BookOpenIcon, value: "100+", label: "Events Hosted" }
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="hover-lift"
                    style={{
                      padding: '24px',
                      borderRadius: '12px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', color: '#6366f1', margin: '0 auto 12px' }}>
                      <stat.Icon />
                    </div>
                    <div className="text-gradient" style={{ fontSize: '30px', fontWeight: 'bold' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Meet the Developers Section */}
        <section style={{ padding: '80px 0 128px', position: 'relative' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              style={{ textAlign: 'center', marginBottom: '64px' }}
            >
              <h2 style={{
                fontSize: window.innerWidth < 640 ? '30px' : window.innerWidth < 1024 ? '36px' : '48px',
                fontWeight: 'bold',
                marginBottom: '16px'
              }}>
                <span className="text-gradient">Meet the Developers</span>
              </h2>
              <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '672px', margin: '0 auto' }}>
                The brilliant minds behind AlumniConnect, working tirelessly to create the best networking experience for our community.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : window.innerWidth < 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: '32px'
              }}
            >
              {developers.map((dev, idx) => (
                <motion.div key={idx} variants={fadeInUp}>
                  <DeveloperCard {...dev} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* College Faculty/Advisors Section */}
        <section style={{ padding: '80px 0 128px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: -1,
            background: 'linear-gradient(180deg, #f9fafb, rgba(99, 102, 241, 0.05), #f9fafb)'
          }} />

          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              style={{ textAlign: 'center', marginBottom: '64px' }}
            >
              <h2 style={{
                fontSize: window.innerWidth < 640 ? '30px' : window.innerWidth < 1024 ? '36px' : '48px',
                fontWeight: 'bold',
                marginBottom: '16px'
              }}>
                <span className="text-gradient">Our Guiding Mentors</span>
              </h2>
              <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '672px', margin: '0 auto' }}>
                Distinguished faculty members dedicated to nurturing talent and fostering meaningful connections within our community.
              </p>
            </motion.div>

            <div>
              {facultyMembers.map((faculty, idx) => (
                <FacultyCard key={idx} {...faculty} />
              ))}
            </div>
          </div>
        </section>

        {/* Bottom Spacing */}
        <div style={{ height: '80px' }} />
      </div>
    </>
  );
}
