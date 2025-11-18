import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  FiMail, FiBriefcase, FiMapPin, FiCalendar, FiAward,
  FiLinkedin, FiGithub, FiGlobe, FiMessageCircle,
  FiX, FiFileText, FiUsers, FiTrendingUp
} from "react-icons/fi";
import { FaGraduationCap, FaBriefcase } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { userAPI, postsAPI } from "../components/utils/api";
import { getAvatarUrl } from "../components/utils/helpers";
import { DEFAULT_PROFILE_IMAGE } from "../constants/images";
import ConnectionButton from "../components/network/ConnectionButton";
import PostCard from "../components/posts/PostCard";
import Spinner from "../components/ui/Spinner";

const PublicProfilePage = () => {
  const { userId, username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [connections, setConnections] = useState([]);
  
  const isOwnProfile = !userId && !username;

  useEffect(() => {
    fetchUserProfile();
  }, [userId, username]);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
      fetchUserConnections();
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
        setUser(currentUser);
        setLoading(false);
        return;
      }
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    const targetUserId = userId || user?._id;
    if (!targetUserId) return;

    const userRole = (user?.role || '').toLowerCase().trim();
    if (!['alumni', 'teacher', 'admin'].includes(userRole)) {
      setPosts([]);
      return;
    }

    try {
      const response = await postsAPI.getUserPosts(targetUserId);
      const postsData = response.data?.data || response.data || [];
      setPosts(postsData);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    }
  };

  const fetchUserConnections = async () => {
    try {
      const response = await userAPI.getUserConnections(userId || user?._id);
      setConnections(response.data || []);
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const handleMessageUser = (targetUserId) => {
    navigate(`/messages?userId=${targetUserId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">User not found</p>
      </div>
    );
  }

  const canViewPosts = ['alumni', 'teacher', 'admin'].includes((user?.role || '').toLowerCase().trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-12">
      {/* Hero Section with Cover */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Profile Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Picture */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative cursor-pointer"
              onClick={() => setShowImageModal(true)}
            >
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-4 ring-white shadow-xl">
                <img
                  src={user.avatarUrl ? getAvatarUrl(user.avatarUrl) : DEFAULT_PROFILE_IMAGE}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = DEFAULT_PROFILE_IMAGE;
                  }}
                />
              </div>
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
            </motion.div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {user.name}
              </h1>
              <p className="text-gray-600 text-lg mb-3">{user.email}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-sm font-semibold capitalize">
                  {user.role}
                </span>
                {user.department && (
                  <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium flex items-center gap-2">
                    <FaBriefcase className="w-4 h-4" />
                    {user.department}
                  </span>
                )}
                {user.graduationYear && (
                  <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium flex items-center gap-2">
                    <FaGraduationCap className="w-4 h-4" />
                    Class of {user.graduationYear}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && currentUser && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleMessageUser(user._id)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <FiMessageCircle className="w-5 h-5" />
                    Message
                  </motion.button>
                  <ConnectionButton userId={user._id} />
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 md:gap-8">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600">
                  {connections.length}
                </div>
                <div className="text-sm text-gray-600">Connections</div>
              </div>
              {canViewPosts && (
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-indigo-600">
                    {posts.length}
                  </div>
                  <div className="text-sm text-gray-600">Posts</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Profile Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Section */}
            {user.bio && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiFileText className="text-blue-600" />
                  About
                </h2>
                <p className="text-gray-700 leading-relaxed">{user.bio}</p>
              </motion.div>
            )}

            {/* Skills Section */}
            {user.skills && user.skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiAward className="text-indigo-600" />
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, index) => (
                    <motion.span
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-lg text-sm font-medium"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Alumni/Professional Details */}
            {user.role === 'alumni' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiBriefcase className="text-purple-600" />
                  Professional Info
                </h2>
                <div className="space-y-3">
                  {user.company && (
                    <div className="flex items-start gap-3">
                      <FiBriefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Company</p>
                        <p className="text-gray-900 font-medium">{user.company}</p>
                      </div>
                    </div>
                  )}
                  {user.position && (
                    <div className="flex items-start gap-3">
                      <FiTrendingUp className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Position</p>
                        <p className="text-gray-900 font-medium">{user.position}</p>
                      </div>
                    </div>
                  )}
                  {user.industry && (
                    <div className="flex items-start gap-3">
                      <FiMapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Industry</p>
                        <p className="text-gray-900 font-medium">{user.industry}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Social Links */}
            {user.socials && (Object.values(user.socials).some(val => val)) && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Social Links</h2>
                <div className="space-y-3">
                  {user.socials.linkedin && (
                    <a
                      href={user.socials.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <FiLinkedin className="w-5 h-5" />
                      <span className="text-sm">LinkedIn</span>
                    </a>
                  )}
                  {user.socials.github && (
                    <a
                      href={user.socials.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <FiGithub className="w-5 h-5" />
                      <span className="text-sm">GitHub</span>
                    </a>
                  )}
                  {user.socials.website && (
                    <a
                      href={user.socials.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 transition-colors"
                    >
                      <FiGlobe className="w-5 h-5" />
                      <span className="text-sm">Website</span>
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Content - Posts */}
          <div className="lg:col-span-2">
            {canViewPosts && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FiFileText className="text-blue-600" />
                    Posts
                  </h2>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    {posts.length} {posts.length === 1 ? 'Post' : 'Posts'}
                  </span>
                </div>

                {posts.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
                    <p className="text-gray-600">
                      {isOwnProfile ? "You haven't created any posts yet" : `${user.name} hasn't posted anything yet`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {posts.map((post) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        currentUser={currentUser}
                        onDelete={() => setPosts(posts.filter(p => p._id !== post._id))}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {!canViewPosts && (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Student Profile</h3>
                <p className="text-gray-600">
                  Students use the forum for discussions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowImageModal(false)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-4xl w-full"
            >
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <FiX className="w-8 h-8" />
              </button>
              <img
                src={user.avatarUrl ? getAvatarUrl(user.avatarUrl) : DEFAULT_PROFILE_IMAGE}
                alt={user.name}
                className="w-full h-auto rounded-2xl shadow-2xl"
                onError={(e) => {
                  e.target.src = DEFAULT_PROFILE_IMAGE;
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicProfilePage;
