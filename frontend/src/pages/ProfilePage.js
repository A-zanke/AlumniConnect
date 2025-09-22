import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { connectionAPI, userAPI } from '../components/utils/api';
import { getAvatarUrl } from '../components/utils/helpers';
// Feather icons (Fi = Feather Icons)
import {
  FiUser,
  FiInfo,
  FiAward,
  FiUsers,
  FiSettings,
  FiMessageCircle,
  FiUserX,
  FiUserCheck,
  FiUserPlus,
  FiChevronRight,
  FiLogOut,
  FiMail,
  FiBriefcase,
  FiExternalLink,
  FiLinkedin,
  FiGithub,
  FiGlobe,
  FiSave,
  FiEdit,
  FiX,
  FiFileText,
  FiPlus,
  FiShare,
  FiTrash2,
} from "react-icons/fi";
import { FaGraduationCap } from "react-icons/fa";

import { motion, AnimatePresence } from "framer-motion";

import axios from 'axios';

const COMMON_SKILLS = [
  'JavaScript','TypeScript','React','Node.js','Express','MongoDB','SQL','PostgreSQL','Python','Django','Flask','Java','Spring','C++','C#','Go','Rust','Next.js','Tailwind CSS','HTML','CSS','Sass','Kotlin','Swift','AWS','GCP','Azure','Docker','Kubernetes','Git','Figma','UI/UX','Machine Learning','Deep Learning','NLP'
];

const ProfilePage = () => {
  const { user: currentUser, updateProfile, logout } = useAuth();
  const { userId, username } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [connections, setConnections] = useState([]);
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: [],
    socials: { linkedin: '', github: '', twitter: '', website: '' },
    specialization: '',
    projects: [],
    desired_roles: [],
    preferred_industries: [],
    higher_studies_interest: 'Maybe',
    entrepreneurship_interest: 'Maybe',
    internships: [],
    hackathons: [],
    research_papers: [],
    mentorship_needs: [],
    preferred_location: '',
    preferred_mode: ['Email'],
    higher_studies: {
      degree: '',
      university: '',
      specialization: ''
    },
    current_job_title: '',
    company: '',
    industry: '',
    past_experience: [],
    mentorship_interests: [],
    preferred_students: [],
    availability: 'Monthly',
    certifications: [],
    publications: [],
    entrepreneurship: '',
    linkedin: '',
    github: '',
    website: ''
  });

  const [postData, setPostData] = useState({
    content: '',
    audience: 'public',
    media: null
  });

  const isOwnProfile = !userId && !username;

  useEffect(() => {
    if (isOwnProfile) {
      setUser(currentUser);
      fetchUserConnections();
      fetchUserPosts();
    } else {
      fetchUserProfile();
    }
  }, [userId, username, currentUser]);

  useEffect(() => {
    if (!isOwnProfile && user) {
      fetchConnectionStatus();
    }
  }, [user, currentUser, isOwnProfile]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        skills: user.skills || [],
        socials: user.socials || { linkedin: '', github: '', twitter: '', website: '' },
        specialization: user.specialization || '',
        projects: user.projects || [],
        desired_roles: user.desired_roles || [],
        preferred_industries: user.preferred_industries || [],
        higher_studies_interest: user.higher_studies_interest || 'Maybe',
        entrepreneurship_interest: user.entrepreneurship_interest || 'Maybe',
        internships: user.internships || [],
        hackathons: user.hackathons || [],
        research_papers: user.research_papers || [],
        mentorship_needs: user.mentorship_needs || [],
        preferred_location: user.preferred_location || '',
        preferred_mode: user.preferred_mode || ['Email'],
        higher_studies: user.higher_studies || { degree: '', university: '', specialization: '' },
        current_job_title: user.current_job_title || '',
        company: user.company || '',
        industry: user.industry || '',
        past_experience: user.past_experience || [],
        mentorship_interests: user.mentorship_interests || [],
        preferred_students: user.preferred_students || [],
        availability: user.availability || 'Monthly',
        certifications: user.certifications || [],
        publications: user.publications || [],
        entrepreneurship: user.entrepreneurship || '',
        linkedin: user.linkedin || '',
        github: user.github || '',
        website: user.website || ''
      });
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      let response;
      if (username) {
        response = await userAPI.getUserByUsername(username);
      } else if (userId) {
        response = await userAPI.getUserById(userId);
      } else {
        throw new Error('No user identifier provided');
      }
      setUser(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load profile');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    if (!currentUser || isOwnProfile) return;
    try {
      const targetUserId = userId || user?._id;
      if (!targetUserId) return;
      const response = await connectionAPI.getConnectionStatus(targetUserId);
      setConnectionStatus(response.data?.status || 'none');
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  const fetchUserConnections = async () => {
    if (!currentUser) return;
    try {
      const response = await connectionAPI.getConnections();
      setConnections(response.data?.connections || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchUserPosts = async () => {
    if (!currentUser) return;
    try {
      const response = await axios.get('/api/posts/user-posts');
      setPosts(response.data?.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleConnectionAction = async (action, targetUserId = null) => {
    try {
      const userId = targetUserId || user?._id;
      if (!userId) {
        toast.error('User ID not found');
        return;
      }

      switch (action) {
        case 'send':
          await connectionAPI.sendRequest(userId);
          setConnectionStatus('pending');
          toast.success('Connection request sent');
          break;
        case 'accept':
          await connectionAPI.acceptRequest(userId);
          setConnectionStatus('connected');
          toast.success('Connection accepted');
          break;
        case 'reject':
          await connectionAPI.rejectRequest(userId);
          setConnectionStatus(null);
          toast.success('Connection request rejected');
          break;
        case 'remove':
          await connectionAPI.removeConnection(userId);
          if (isOwnProfile) {
            // Remove from connections list
            setConnections(prev => prev.filter(conn => conn._id !== userId));
            toast.success('Connection removed');
          } else {
            setConnectionStatus(null);
            toast.success('Connection removed');
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Connection action error:', error);
      toast.error('Failed to perform action');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('socials.')) {
      const field = name.replace('socials.', '');
      setFormData({ ...formData, socials: { ...formData.socials, [field]: value } });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const normalizedSkills = useMemo(
    () => (formData.skills || []).map(s => s.trim()).filter(Boolean),
    [formData.skills]
  );

  const suggestions = useMemo(() => {
    const q = skillInput.trim().toLowerCase();
    if (!q) return [];
    return COMMON_SKILLS
      .filter(s => s.toLowerCase().includes(q) && !normalizedSkills.some(k => k.toLowerCase() === s.toLowerCase()))
      .slice(0, 6);
  }, [skillInput, normalizedSkills]);

  const commitSkillInput = () => {
    const raw = skillInput.trim();
    if (!raw) return;
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setFormData(prev => ({
      ...prev,
      skills: Array.from(new Set([...(prev.skills || []), ...parts]))
    }));
    setSkillInput('');
  };

  const onSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitSkillInput();
    }
  };

  const addSuggested = (s) => {
    setFormData(prev => ({
      ...prev,
      skills: Array.from(new Set([...(prev.skills || []), s]))
    }));
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(s => s.toLowerCase() !== skill.toLowerCase())
    }));
  };

  const handleArrayFieldChange = (fieldName, value) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [fieldName]: arrayValue }));
  };

  const handleCheckboxArrayChange = (fieldName, value, checked) => {
    setFormData(prev => {
      const currentArray = prev[fieldName] || [];
      if (checked) return { ...prev, [fieldName]: [...currentArray, value] };
      return { ...prev, [fieldName]: currentArray.filter(item => item !== value) };
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      const result = await updateProfile(formData, avatarFile);
      if (result.success) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        setAvatarFile(null);
        setUser(prev => ({ ...prev, ...formData }));
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreatePost = async (e) => {
    if (e) e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('content', postData.content);
      formDataToSend.append('audience', postData.audience);
      if (postData.media) {
        formDataToSend.append('media', postData.media);
      }

      const response = await axios.post('/api/posts', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        toast.success('Post created successfully');
        setPostData({ content: '', audience: 'public', media: null });
        setShowCreatePost(false);
        fetchUserPosts();
      }
    } catch (error) {
      console.error('Post creation error:', error);
      toast.error('Failed to create post');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`/api/posts/${postId}`);
      toast.success('Post deleted successfully');
      setPosts(prev => prev.filter(post => post._id !== postId));
    } catch (error) {
      console.error('Post deletion error:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleMessageUser = (targetUserId) => {
    navigate(`/messages?user=${targetUserId}`);
  };

  // Sidebar Menu Items
  const menuItems = [
    { id: 'overview', label: 'Profile Overview', icon: FiUser },
    { id: 'about', label: 'About', icon: FiInfo },
    { id: 'skills', label: 'Skills', icon: FiAward },
    { id: 'connections', label: 'Connections', icon: FiUsers },
    ...(currentUser && ['alumni', 'teacher'].includes(currentUser.role?.toLowerCase()) ? [{ id: 'posts', label: 'My Posts', icon: FiFileText }] : []),
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ];

  const renderConnectionButton = () => {
    if (isOwnProfile || !currentUser) return null;
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex space-x-2">
            <motion.button
              onClick={() => handleMessageUser(userId || user?._id)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiMessageCircle className="mr-2" /> Message
            </motion.button>
            <motion.button
              onClick={() => handleConnectionAction('remove')}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiUserX className="mr-2" /> Remove
            </motion.button>
          </div>
        );
      case 'pending':
        return (
          <button disabled className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl opacity-75">
            <FiUserCheck className="mr-2 inline" /> Pending
          </button>
        );
      case 'received':
      case 'incoming':
        return (
          <div className="flex space-x-2">
            <motion.button
              onClick={() => handleConnectionAction('accept')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiUserCheck className="mr-2 inline" /> Accept
            </motion.button>
            <motion.button
              onClick={() => handleConnectionAction('reject')}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiUserX className="mr-2 inline" /> Reject
            </motion.button>
          </div>
        );
      default:
        return (
          <motion.button
            onClick={() => handleConnectionAction('send')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiUserPlus className="mr-2 inline" /> Connect
          </motion.button>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <FiUserX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">The profile you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex">
      {/* Left Sidebar */}
      {isOwnProfile && (
        <motion.div
          className="w-80 bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-900 min-h-screen sticky top-0 shadow-2xl"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <motion.h2
              className="text-2xl font-bold bg-gradient-to-r from-white via-orange-200 to-indigo-200 bg-clip-text text-transparent"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Profile Menu
            </motion.h2>
            <motion.p
              className="text-slate-300 text-sm mt-2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Manage your profile and settings
            </motion.p>
          </div>

          {/* Menu Items */}
          <div className="p-4 space-y-2">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all duration-300 group ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-orange-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * index, duration: 0.4 }}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className={`p-2 rounded-lg ${
                      activeSection === item.id
                        ? 'bg-white/20'
                        : 'bg-slate-800 group-hover:bg-slate-700'
                    }`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <item.icon size={18} />
                  </motion.div>
                  <span className="font-semibold">{item.label}</span>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: activeSection === item.id ? 1 : 0,
                    x: activeSection === item.id ? 0 : -10
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <FiChevronRight size={16} />
                </motion.div>
              </motion.button>
            ))}
          </div>

          {/* Logout Button */}
          <motion.div
            className="absolute bottom-6 left-4 right-4"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <motion.button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 group"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="p-2 bg-white/20 rounded-lg"
                whileHover={{ rotate: -10 }}
                transition={{ duration: 0.2 }}
              >
                <FiLogOut size={18} />
              </motion.div>
              <span className="group-hover:tracking-wide transition-all duration-300">
                Sign Out
              </span>
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* Right Content Area */}
      <div className={`flex-1 ${isOwnProfile ? '' : 'w-full'}`}>
        {/* Profile Header */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 sticky top-0 z-10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-6xl mx-auto p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {user.avatarUrl ? (
                  <img 
                    className="h-24 w-24 rounded-full border-4 border-white shadow-xl object-cover ring-4 ring-orange-200" 
                    src={getAvatarUrl(user.avatarUrl)} 
                    alt={user.name} 
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-r from-indigo-600 to-orange-600 flex items-center justify-center border-4 border-white shadow-xl ring-4 ring-orange-200">
                    <span className="text-3xl font-bold text-white">{user.name?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </motion.div>
              
              <div className="flex-1 text-center md:text-left">
                <motion.h1
                  className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 bg-clip-text text-transparent"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {user.name}
                </motion.h1>
                <motion.p
                  className="text-slate-600 text-lg mb-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {user.email}
                </motion.p>
                <motion.span
                  className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-100 to-orange-100 text-indigo-800 rounded-full text-sm font-semibold capitalize"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {user.role}
                </motion.span>
              </div>
              
              <motion.div
                className="flex gap-3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {!isOwnProfile && currentUser && (
                  <motion.button
                    onClick={() => handleMessageUser(userId || user?._id)}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-slate-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiMessageCircle className="mr-2" /> Message
                  </motion.button>
                )}
                {renderConnectionButton()}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeSection === 'overview' && <OverviewSection user={user} />}
              {activeSection === 'about' && (
                <AboutSection 
                  user={user} 
                  isEditing={isEditing} 
                  setIsEditing={setIsEditing} 
                  formData={formData} 
                  handleChange={handleChange} 
                  handleSubmit={handleSubmit} 
                  handleArrayFieldChange={handleArrayFieldChange} 
                  handleCheckboxArrayChange={handleCheckboxArrayChange} 
                />
              )}
              {activeSection === 'skills' && (
                <SkillsSection 
                  user={user} 
                  isEditing={isEditing} 
                  setIsEditing={setIsEditing} 
                  formData={formData} 
                  skillInput={skillInput} 
                  setSkillInput={setSkillInput} 
                  onSkillKeyDown={onSkillKeyDown} 
                  suggestions={suggestions} 
                  addSuggested={addSuggested} 
                  removeSkill={removeSkill} 
                  commitSkillInput={commitSkillInput} 
                  handleSubmit={handleSubmit} 
                />
              )}
              {activeSection === 'connections' && (
                <ConnectionsSection 
                  connections={connections} 
                  handleMessageUser={handleMessageUser}
                  handleConnectionAction={handleConnectionAction}
                />
              )}
              {activeSection === 'posts' && (
                <PostsSection 
                  posts={posts}
                  showCreatePost={showCreatePost}
                  setShowCreatePost={setShowCreatePost}
                  postData={postData}
                  setPostData={setPostData}
                  handleCreatePost={handleCreatePost}
                  handleDeletePost={handleDeletePost}
                />
              )}
              {activeSection === 'settings' && (
                <SettingsSection 
                  user={user} 
                  isEditing={isEditing} 
                  setIsEditing={setIsEditing} 
                  formData={formData} 
                  handleChange={handleChange} 
                  avatarFile={avatarFile} 
                  setAvatarFile={setAvatarFile} 
                  handleSubmit={handleSubmit} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Overview Section Component
const OverviewSection = ({ user }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Basic Info Card */}
    <motion.div
      className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FiUser className="text-indigo-600" />
        Basic Information
      </h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <FiMail className="text-slate-500" />
          <span className="text-slate-700">{user.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <FiBriefcase className="text-slate-500" />
          <span className="text-slate-700 capitalize">{user.role}</span>
        </div>
        {user.department && (
          <div className="flex items-center gap-3">
            <FaGraduationCap className="text-slate-500" />
            <span className="text-slate-700">{user.department}</span>
          </div>
        )}
        {user.current_job_title && (
          <div className="flex items-center gap-3">
            <FiBriefcase className="text-slate-500" />
            <span className="text-slate-700">{user.current_job_title}</span>
          </div>
        )}
        {user.company && (
          <div className="flex items-center gap-3">
            <FiBriefcase className="text-slate-500" />
            <span className="text-slate-700">{user.company}</span>
          </div>
        )}
      </div>
    </motion.div>

    {/* Bio Card */}
    {user.bio && (
      <motion.div
        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiInfo className="text-indigo-600" />
          About
        </h3>
        <p className="text-slate-700 leading-relaxed">{user.bio}</p>
      </motion.div>
    )}

    {/* Skills Card */}
    {user.skills && user.skills.length > 0 && (
      <motion.div
        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiAward className="text-indigo-600" />
          Skills
        </h3>
        <div className="flex flex-wrap gap-2">
          {user.skills.slice(0, 6).map((skill, index) => (
            <motion.span
              key={skill}
              className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-orange-100 text-indigo-800 rounded-full text-sm font-medium"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
            >
              {skill}
            </motion.span>
          ))}
          {user.skills.length > 6 && (
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
              +{user.skills.length - 6} more
            </span>
          )}
        </div>
      </motion.div>
    )}

    {/* Social Links Card */}
    {user.socials && Object.values(user.socials).some(link => link) && (
      <motion.div
        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiExternalLink className="text-indigo-600" />
          Social Links
        </h3>
        <div className="space-y-3">
          {user.socials.linkedin && (
            <a href={user.socials.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors">
              <FiLinkedin />
              <span>LinkedIn</span>
            </a>
          )}
          {user.socials.github && (
            <a href={user.socials.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors">
              <FiGithub />
              <span>GitHub</span>
            </a>
          )}
          {user.socials.website && (
            <a href={user.socials.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors">
              <FiGlobe />
              <span>Website</span>
            </a>
          )}
        </div>
      </motion.div>
    )}
  </div>
);

// About Section Component
const AboutSection = ({ user, isEditing, setIsEditing, formData, handleChange, handleSubmit, handleArrayFieldChange, handleCheckboxArrayChange }) => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-slate-800">About Information</h2>
      {!isEditing ? (
        <motion.button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-700 to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-slate-500/30 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiEdit size={18} />
          Edit About
        </motion.button>
      ) : (
        <div className="flex gap-3">
          <motion.button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiSave size={18} />
            Save Changes
          </motion.button>
          <motion.button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiX size={18} />
            Cancel
          </motion.button>
        </div>
      )}
    </div>

    {isEditing ? (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <motion.div
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>
          </motion.div>

          {/* Professional Info */}
          <motion.div
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">Professional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Current Job Title</label>
                <input
                  type="text"
                  name="current_job_title"
                  value={formData.current_job_title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Industry</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>
          </motion.div>

          {/* Social Links */}
          <motion.div
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">Social Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">LinkedIn</label>
                <input
                  type="url"
                  name="socials.linkedin"
                  value={formData.socials.linkedin}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">GitHub</label>
                <input
                  type="url"
                  name="socials.github"
                  value={formData.socials.github}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  placeholder="https://github.com/username"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Website</label>
                <input
                  type="url"
                  name="socials.website"
                  value={formData.socials.website}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Twitter</label>
                <input
                  type="url"
                  name="socials.twitter"
                  value={formData.socials.twitter}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  placeholder="https://twitter.com/username"
                />
              </div>
            </div>
          </motion.div>

          {/* Role-specific fields */}
          {user.role === 'student' && (
            <motion.div
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4">Student Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Location</label>
                  <input
                    type="text"
                    name="preferred_location"
                    value={formData.preferred_location}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Desired Roles (comma separated)</label>
                  <input
                    type="text"
                    value={formData.desired_roles.join(', ')}
                    onChange={(e) => handleArrayFieldChange('desired_roles', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Industries (comma separated)</label>
                  <input
                    type="text"
                    value={formData.preferred_industries.join(', ')}
                    onChange={(e) => handleArrayFieldChange('preferred_industries', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </form>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Display mode content */}
        <motion.div
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-bold text-slate-800 mb-4">Personal Information</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-slate-500">Name:</span>
              <p className="text-slate-800">{user.name || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-500">Bio:</span>
              <p className="text-slate-800">{user.bio || 'Not provided'}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-bold text-slate-800 mb-4">Professional Information</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-slate-500">Job Title:</span>
              <p className="text-slate-800">{user.current_job_title || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-500">Company:</span>
              <p className="text-slate-800">{user.company || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-500">Industry:</span>
              <p className="text-slate-800">{user.industry || 'Not provided'}</p>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </div>
);

// Skills Section Component
const SkillsSection = ({ user, isEditing, setIsEditing, formData, skillInput, setSkillInput, onSkillKeyDown, suggestions, addSuggested, removeSkill, commitSkillInput, handleSubmit }) => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-slate-800">Skills & Expertise</h2>
      {!isEditing ? (
        <motion.button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-700 to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-slate-500/30 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiEdit size={18} />
          Edit Skills
        </motion.button>
      ) : (
        <div className="flex gap-3">
          <motion.button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiSave size={18} />
            Save Changes
          </motion.button>
          <motion.button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiX size={18} />
            Cancel
          </motion.button>
        </div>
      )}
    </div>

    <motion.div
      className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {isEditing ? (
        <div className="space-y-4">
          <div className="w-full px-4 py-3 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition bg-white">
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.skills.map((skill) => (
                <span key={skill} className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-orange-100 text-indigo-800 text-sm font-medium transition transform hover:scale-105">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} className="ml-2 text-indigo-700 hover:text-indigo-900">
                    <FiX />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={onSkillKeyDown}
              onBlur={commitSkillInput}
              className="w-full outline-none"
              placeholder="Type a skill and press Enter or comma"
            />
            {suggestions.length > 0 && (
              <div className="mt-2 bg-white border rounded-xl shadow-lg p-2 grid grid-cols-2 gap-2">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSuggested(s)}
                    className="text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Skills</h3>
          {user.skills && user.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill, index) => (
                <motion.span
                  key={skill}
                  className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-orange-100 text-indigo-800 rounded-full text-sm font-medium"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No skills added yet</p>
          )}
        </div>
      )}
    </motion.div>
  </div>
);

// Connections Section Component
const ConnectionsSection = ({ connections, handleMessageUser, handleConnectionAction }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-slate-800">My Connections</h2>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{connections.length}</div>
          <div className="text-sm text-slate-500">Connections</div>
        </div>
      </div>
    </div>

    <motion.div
      className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {connections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection, index) => (
            <motion.div
              key={connection._id}
              className="bg-white/80 rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-3 mb-3">
                {connection.avatarUrl ? (
                  <img 
                    className="h-12 w-12 rounded-full object-cover border-2 border-indigo-200"
                    src={getAvatarUrl(connection.avatarUrl)} 
                    alt={connection.name} 
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-600 to-orange-600 flex items-center justify-center text-white font-bold border-2 border-indigo-200">
                    {connection.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800">{connection.name}</h4>
                  <p className="text-sm text-slate-500 capitalize">{connection.role}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <motion.button
                  onClick={() => handleMessageUser(connection._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiMessageCircle size={14} />
                  Message
                </motion.button>
                <motion.button
                  onClick={() => handleConnectionAction('remove', connection._id)}
                  className="px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiUserX size={14} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <FiUsers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No connections yet</h3>
          <p className="text-slate-500">Start connecting with your alumni, teachers, and peers!</p>
        </div>
      )}
    </motion.div>
  </div>
);

// Posts Section Component
const PostsSection = ({ posts, showCreatePost, setShowCreatePost, postData, setPostData, handleCreatePost, handleDeletePost }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-slate-800">My Posts</h2>
      <motion.button
        onClick={() => setShowCreatePost(true)}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiPlus size={18} />
        Create Post
      </motion.button>
    </div>

    {/* Create Post Modal */}
    <AnimatePresence>
      {showCreatePost && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowCreatePost(false)}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-full max-w-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Create New Post</h3>
              <button
                onClick={() => setShowCreatePost(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Content</label>
                <textarea
                  value={postData.content}
                  onChange={(e) => setPostData({...postData, content: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  placeholder="What's on your mind?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Audience</label>
                <select
                  value={postData.audience}
                  onChange={(e) => setPostData({...postData, audience: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="public">Public</option>
                  <option value="alumni">Alumni Only</option>
                  <option value="teachers">Teachers Only</option>
                  <option value="students">Students Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Media (Optional)</label>
                <FileInput
                  accept="image/*,video/*"
                  onChange={(file) => setPostData({...postData, media: file})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <motion.button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiShare size={18} />
                  Post
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Posts List */}
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {posts.length > 0 ? (
        posts.map((post, index) => (
          <motion.div
            key={post._id}
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-800 leading-relaxed">{post.content}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-slate-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                    {post.audience}
                  </span>
                </div>
              </div>
              <motion.button
                onClick={() => handleDeletePost(post._id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiTrash2 size={16} />
              </motion.button>
            </div>

            {post.mediaUrl && (
              <div className="mt-4">
                {post.mediaUrl.includes('video') ? (
                  <video controls className="w-full rounded-xl">
                    <source src={post.mediaUrl} type="video/mp4" />
                  </video>
                ) : (
                  <img src={post.mediaUrl} alt="Post media" className="w-full rounded-xl" />
                )}
              </div>
            )}
          </motion.div>
        ))
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <FiFileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No posts yet</h3>
          <p className="text-slate-500">Create your first post to share with the community!</p>
        </div>
      )}
    </motion.div>
  </div>
);

// Settings Section Component
const SettingsSection = ({ user, isEditing, setIsEditing, formData, handleChange, avatarFile, setAvatarFile, handleSubmit }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-slate-800">Account Settings</h2>
      {!isEditing ? (
        <motion.button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-700 to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-slate-500/30 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiEdit size={18} />
          Edit Settings
        </motion.button>
      ) : (
        <div className="flex gap-3">
          <motion.button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiSave size={18} />
            Save Changes
          </motion.button>
          <motion.button
            onClick={() => {
              setIsEditing(false);
              setAvatarFile(null);
            }}
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiX size={18} />
            Cancel
          </motion.button>
        </div>
      )}
    </div>

    <motion.div
      className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Picture</label>
            <FileInput accept="image/*" onChange={setAvatarFile} />
            {avatarFile && <p className="text-sm text-green-600 mt-2">✓ New image selected</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-500"
            />
            <p className="text-sm text-slate-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
            <input
              type="text"
              value={user.role}
              disabled
              className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-500 capitalize"
            />
            <p className="text-sm text-slate-500 mt-1">Role cannot be changed</p>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="text-sm font-semibold text-slate-500">Name:</span>
            <p className="text-slate-800">{user.name}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-500">Email:</span>
            <p className="text-slate-800">{user.email}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-500">Role:</span>
            <p className="text-slate-800 capitalize">{user.role}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-500">Member Since:</span>
            <p className="text-slate-800">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </motion.div>
  </div>
);

export default ProfilePage;