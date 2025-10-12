import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Spinner from "../components/ui/Spinner";
import FileInput from "../components/ui/FileInput";
import { connectionAPI, userAPI } from "../components/utils/api";
import { getAvatarUrl } from "../components/utils/helpers";
import ConnectionButton from "../components/network/ConnectionButton";

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
  FiImage,
  FiThumbsUp,
} from "react-icons/fi";
import { FaGraduationCap } from "react-icons/fa";

import { motion, AnimatePresence } from "framer-motion";

import axios from "axios";
import { DEFAULT_PROFILE_IMAGE } from "../constants/images";
import { formatPostContent } from "../utils/textFormatter";
import { FiBookmark } from "react-icons/fi";

const COMMON_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Express",
  "MongoDB",
  "SQL",
  "PostgreSQL",
  "Python",
  "Django",
  "Flask",
  "Java",
  "Spring",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Next.js",
  "Tailwind CSS",
  "HTML",
  "CSS",
  "Sass",
  "Kotlin",
  "Swift",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "Figma",
  "UI/UX",
  "Machine Learning",
  "Deep Learning",
  "NLP",
];

const ProfilePage = () => {
  const { user: currentUser, updateProfile, logout } = useAuth();
  const { userId, username } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [connections, setConnections] = useState([]);
  const [allConnections, setAllConnections] = useState([]); // For total unique connections
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    department: "",
    year: "",
    graduationYear: "",
    degree: "",
    company: "",
    position: "",
    industry: "",
    skills: [],
    careerInterests: [],
    activities: [],
    mentorshipAvailable: false,
    guidanceAreas: [],
    socials: { linkedin: "", github: "", website: "", portfolio: "" },
    mentorshipOpen: false,
    phoneNumber: "",
    personalVisibility: "private",
    profileVisibility: "public",
    password: "",
  });

  const [postData, setPostData] = useState({
    content: "",
    audience: "public",
    media: null,
  });

  const isOwnProfile = !userId && !username;

  useEffect(() => {
    if (isOwnProfile) {
      setUser(currentUser);
      if (currentUser) {
        setFormData({
          name: currentUser.name || "",
          bio: currentUser.bio || "",
          department: currentUser.department || "",
          year: currentUser.year || "",
          graduationYear: currentUser.graduationYear || "",
          degree: currentUser.degree || "",
          company: currentUser.company || "",
          position: currentUser.position || "",
          industry: currentUser.industry || "",
          skills: currentUser.skills || [],
          careerInterests: currentUser.careerInterests || [],
          activities: currentUser.activities || [],
          mentorshipAvailable: Boolean(currentUser.mentorshipAvailable),
          guidanceAreas: currentUser.guidanceAreas || [],
          socials: currentUser.socials || {
            linkedin: "",
            github: "",
            website: "",
            portfolio: "",
          },
          mentorshipOpen: Boolean(currentUser.mentorshipOpen),
          phoneNumber: currentUser.phoneNumber || "",
          personalVisibility: currentUser.personalVisibility || "private",
          profileVisibility: currentUser.profileVisibility || "public",
          password: "",
        });
      }
      fetchUserConnections();
      fetchUserPosts();
    } else {
      fetchUserProfile();
    }
  }, [userId, username, currentUser]);

  // This useEffect now primarily updates formData when a *fetched* user profile changes
  // For own profile, formData initialization is handled in the first useEffect to avoid race conditions
  useEffect(() => {
    if (user && !isOwnProfile) {
      setFormData({
        name: user.name || "",
        bio: user.bio || "",
        department: user.department || "",
        year: user.year || "",
        graduationYear: user.graduationYear || "",
        degree: user.degree || "",
        company: user.company || "",
        position: user.position || "",
        industry: user.industry || "",
        skills: user.skills || [],
        careerInterests: user.careerInterests || [],
        activities: user.activities || [],
        mentorshipAvailable: Boolean(user.mentorshipAvailable),
        guidanceAreas: user.guidanceAreas || [],
        socials: user.socials || {
          linkedin: "",
          github: "",
          website: "",
          portfolio: "",
        },
        mentorshipOpen: Boolean(user.mentorshipOpen),
        phoneNumber: user.phoneNumber || "",
        personalVisibility: user.personalVisibility || "private",
        profileVisibility: user.profileVisibility || "public",
        password: "",
      });
    }
  }, [user, isOwnProfile]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      let response;
      if (username) {
        response = await userAPI.getUserByUsername(username);
      } else if (userId) {
        response = await userAPI.getUserById(userId);
      } else {
        throw new Error("No user identifier provided");
      }
      setUser(response.data?.data || response.data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Failed to load profile");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // Fetch both connections (I connected) and those who connected to me (mutual/one-way)
  const fetchUserConnections = async () => {
    if (!currentUser) return;
    try {
      const [sentRes, receivedRes] = await Promise.all([
        connectionAPI.getConnections(), // connections I sent/accepted
        connectionAPI.getPendingRequests(), // requests I received (pending)
      ]);
      // sentRes.data: my connections (array of users)
      // receivedRes.data: pending requests (array of users who sent me requests)
      const sent = sentRes.data || [];
      const received = receivedRes.data?.map?.((r) => r.fromUser) || [];
      // Merge, deduplicate by _id
      const all = [...sent, ...received].reduce((acc, user) => {
        if (!acc.find((u) => u._id === user._id)) acc.push(user);
        return acc;
      }, []);
      setConnections(sent); // still show direct connections in main list
      setAllConnections(all); // all unique connections (sent + received)
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const fetchUserPosts = async () => {
    if (!currentUser) return;
    try {
      const response = await axios.get(`/api/posts/user/${currentUser._id}`);
      setPosts(response.data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  

  const handleConnectionAction = async (action, targetUserId = null) => {
    try {
      const userId = targetUserId || user?._id;
      if (!userId) {
        toast.error("User ID not found");
        return;
      }

      switch (action) {
        case "remove":
          await connectionAPI.removeConnection(userId);
          toast.success("Connection removed");
          break;
        default:
          break;
      }
      // Always re-fetch connections after any action for real-time update
      if (isOwnProfile) fetchUserConnections();
    } catch (error) {
      console.error("Connection action error:", error);
      toast.error("Failed to perform action");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("socials.")) {
      const field = name.replace("socials.", "");
      setFormData({
        ...formData,
        socials: { ...formData.socials, [field]: value },
      });
    } else if (name.startsWith("higher_studies.")) {
      const field = name.replace("higher_studies.", "");
      setFormData((prev) => ({
        ...prev,
        higher_studies: { ...prev.higher_studies, [field]: value },
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const normalizedSkills = useMemo(
    () => (formData.skills || []).map((s) => s.trim()).filter(Boolean),
    [formData.skills]
  );

  const suggestions = useMemo(() => {
    const q = skillInput.trim().toLowerCase();
    if (!q) return [];
    return COMMON_SKILLS.filter(
      (s) =>
        s.toLowerCase().includes(q) &&
        !normalizedSkills.some((k) => k.toLowerCase() === s.toLowerCase())
    ).slice(0, 6);
  }, [skillInput, normalizedSkills]);

  const commitSkillInput = () => {
    const raw = skillInput.trim();
    if (!raw) return;
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      skills: Array.from(new Set([...(prev.skills || []), ...parts])),
    }));
    setSkillInput("");
  };

  const onSkillKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitSkillInput();
    }
  };

  const addSuggested = (s) => {
    setFormData((prev) => ({
      ...prev,
      skills: Array.from(new Set([...(prev.skills || []), s])),
    }));
    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setFormData((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter(
        (s) => s.toLowerCase() !== skill.toLowerCase()
      ),
    }));
  };

  const handleArrayFieldChange = (fieldName, value) => {
    const arrayValue = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    setFormData((prev) => ({ ...prev, [fieldName]: arrayValue }));
  };

  const handleCheckboxArrayChange = (fieldName, value, checked) => {
    setFormData((prev) => {
      const currentArray = prev[fieldName] || [];
      if (checked) return { ...prev, [fieldName]: [...currentArray, value] };
      return {
        ...prev,
        [fieldName]: currentArray.filter((item) => item !== value),
      };
    });
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    try {
      setLoading(true);
      // Pass formData and avatarFile to the context's updateProfile
      const result = await updateProfile(formData, avatarFile);
      if (result.success) {
        toast.success("Profile updated successfully");
        setIsEditing(false);
        setAvatarFile(null); // Clear selected avatar file after successful upload
        // Update local user state with the latest from the context (or directly from result)
        // The updateProfile context function should ideally return the updated user object or trigger context re-fetch
        setUser(result.user || currentUser); // Assuming result.user contains the updated user
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setLoading(true);
      const response = await userAPI.deleteAvatar();
      if (response.data.success) {
        toast.success("Profile picture deleted successfully!");
        // Update AuthContext user and local user state
        // The `updateProfile` in AuthContext should handle setting avatarUrl to null
        updateProfile({ ...currentUser, avatarUrl: null }); // This will update the AuthContext
        setUser((prev) => ({ ...prev, avatarUrl: null })); // Update local state for immediate UI reflect
      } else {
        toast.error(
          response.data.message || "Failed to delete profile picture."
        );
      }
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast.error("Failed to delete profile picture.");
    } finally {
      setLoading(false);
      setIsEditing(false); // Exit editing mode after deletion
      setAvatarFile(null); // Clear any pending avatar upload
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const handleMessageUser = (targetUserId) => {
    navigate(`/messages?user=${targetUserId}`);
  };

  // Sidebar Menu Items
  const canViewPosts =
    isOwnProfile && (user?.role === "teacher" || user?.role === "alumni");

  const menuItems = [
    { id: "overview", label: "Profile Overview", icon: FiUser },
    { id: "about", label: "About", icon: FiInfo },
    { id: "skills", label: "Skills", icon: FiAward },
    { id: "connections", label: "Connections", icon: FiUsers },
    ...(canViewPosts
      ? [
          { id: "posts", label: "Posts", icon: FiFileText },
          
        ]
      : []),
    { id: "settings", label: "Settings", icon: FiSettings },
  ];

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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Profile Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The profile you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/")}
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
                    ? "bg-gradient-to-r from-indigo-600 to-orange-600 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
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
                        ? "bg-white/20"
                        : "bg-slate-800 group-hover:bg-slate-700"
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
                    x: activeSection === item.id ? 0 : -10,
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
      <div className={`flex-1 ${isOwnProfile ? "" : "w-full"}`}>
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
                <img
                  className="h-24 w-24 rounded-full border-4 border-white shadow-xl object-cover ring-4 ring-orange-200"
                  src={
                    user.avatarUrl
                      ? getAvatarUrl(user.avatarUrl)
                      : DEFAULT_PROFILE_IMAGE
                  }
                  alt={user.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_PROFILE_IMAGE;
                  }}
                />
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
                <ConnectionButton userId={userId || user?._id} />
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
              {activeSection === "overview" && <OverviewSection user={user} />}
              {activeSection === "about" && (
                <AboutSection
                  user={user}
                  isEditing={isEditing}
                  setIsEditing={setIsEditing}
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                />
              )}
              {activeSection === "skills" && (
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
              {activeSection === "connections" && (
                <ConnectionsSection
                  connections={connections}
                  allConnections={allConnections}
                  handleMessageUser={handleMessageUser}
                  handleConnectionAction={handleConnectionAction}
                />
              )}

              {activeSection === "posts" && canViewPosts && (
                <PostsSection
                  user={user}
                  posts={posts}
                  setPosts={setPosts}
                  showCreatePost={showCreatePost}
                  setShowCreatePost={setShowCreatePost}
                  fetchUserPosts={fetchUserPosts}
                />
              )}

              

              {activeSection === "settings" && (
                <SettingsSection
                  user={user}
                  isEditing={isEditing}
                  setIsEditing={setIsEditing}
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                  avatarFile={avatarFile}
                  setAvatarFile={setAvatarFile}
                  handleDeleteAvatar={handleDeleteAvatar}
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
        {(user.department || user.graduationYear || user.year) && (
          <div className="flex items-center gap-3">
            <span className="text-slate-700">
              {user.role === "alumni" ? (
                <>
                  🏫 Department: {user.department || "Not specified"} 🎓
                  Graduation: {user.graduationYear || ":"}
                </>
              ) : user.role === "student" ? (
                <>
                  🏫 Department: {user.department || "Not specified"} Year :{" "}
                  {user.year || ":"} 🎓 Graduation {user.graduationYear || ":"}
                </>
              ) : (
                // Teacher
                <>
                  🏫 Department: {user.department || "Not specified"} 🎓
                  Graduation {user.graduationYear || ":"}
                </>
              )}
            </span>
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

    {/* Student Preferences Card */}
    {user.role === "student" && (
      <motion.div
        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h3 className="text-xl font-bold text-slate-800 mb-4">
          Student Preferences
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-semibold text-slate-500">
              Career Interests:
            </span>
            {Array.isArray(user.careerInterests) &&
            user.careerInterests.length > 0 ? (
              <span className="ml-2 text-slate-800">
                {user.careerInterests.join(", ")}
              </span>
            ) : (
              <span className="ml-2 text-slate-800">Not provided</span>
            )}
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-500">
              College Activities / Clubs:
            </span>
            {Array.isArray(user.activities) && user.activities.length > 0 ? (
              <span className="ml-2 text-slate-800">
                {user.activities.join(", ")}
              </span>
            ) : (
              <span className="ml-2 text-slate-800">Not provided</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">
              Open to Mentorship from Alumni:
            </span>
            <span className="text-slate-800">
              {user.mentorshipOpen ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </motion.div>
    )}

    {/* Alumni Details Card */}
    {user.role === "alumni" && (
      <motion.div
        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h3 className="text-xl font-bold text-slate-800 mb-4">
          Alumni Details
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">
              Degree:
            </span>
            <span className="text-slate-800">
              {user.degree || "Not provided"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">
              Current Company / Organization:
            </span>
            <span className="text-slate-800">
              {user.company || "Not provided"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">
              Current Role / Designation:
            </span>
            <span className="text-slate-800">
              {user.position || user.current_job_title || "Not provided"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">
              Industry / Domain:
            </span>
            <span className="text-slate-800">
              {user.industry || "Not provided"}
            </span>
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-500">
              Guidance Areas:
            </span>
            {Array.isArray(user.guidanceAreas) &&
            user.guidanceAreas.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {user.guidanceAreas.map((g, i) => (
                  <span
                    key={`${g}-${i}`}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            ) : (
              <span className="ml-2 text-slate-800">Not provided</span>
            )}
          </div>
          {user.mentorshipAvailable && (
            <div>
              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                Available for Mentorship
              </span>
            </div>
          )}
        </div>
      </motion.div>
    )}

    {/* Social Links Card */}
    {user.socials && Object.values(user.socials).some((link) => link) && (
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
            <a
              href={user.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors"
            >
              <FiLinkedin />
              <span>LinkedIn</span>
            </a>
          )}
          {user.socials.github && (
            <a
              href={user.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors"
            >
              <FiGithub />
              <span>GitHub</span>
            </a>
          )}
          {user.socials.website && (
            <a
              href={user.socials.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors"
            >
              <FiGlobe />
              <span>Website</span>
            </a>
          )}
          {user.socials.portfolio && (
            <a
              href={user.socials.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors"
            >
              <FiGlobe />
              <span>Portfolio</span>
            </a>
          )}
        </div>
      </motion.div>
    )}
  </div>
);

// About Section Component
const AboutSection = ({
  user,
  isEditing,
  setIsEditing,
  formData,
  setFormData,
  handleChange,
  handleSubmit,
}) => (
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
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Bio
                </label>
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

          {/* Education / Department Info */}
          <motion.div
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">Education</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={user?.department || ""} // use backend registration value
                  readOnly
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Graduation Year
                </label>
                <input
                  type="number"
                  value={
                    user?.role === "student" || user?.role === "teacher"
                      ? formData?.graduationYear || ""
                      : user?.graduationYear || ""
                  }
                  onChange={(e) => {
                    if (user?.role === "student" || user?.role === "teacher") {
                      const newYear = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        graduationYear: newYear,
                      }));
                    }
                  }}
                  readOnly={user?.role === "alumni"}
                  className={`w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-700 transition-all duration-200 ${
                    user?.role === "alumni"
                      ? "bg-slate-100 cursor-not-allowed"
                      : "bg-white focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  }`}
                  placeholder="2025"
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
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Social Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  LinkedIn URL
                </label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  GitHub / Portfolio URL
                </label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Portfolio
                </label>
                <input
                  type="url"
                  name="socials.portfolio"
                  value={formData.socials.portfolio}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  placeholder="https://yourportfolio.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="socials.website"
                  value={formData.socials.website}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </motion.div>
          {/* Student-specific fields */}
          {user.role === "student" && (
            <motion.div
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Student Preferences
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Career Interests */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Career Interests
                  </label>
                  <div className="flex flex-col space-y-2">
                    {[
                      "Internships",
                      "Research",
                      "Startups",
                      "Higher Studies",
                    ].map((option) => (
                      <label
                        key={option}
                        className="flex items-center space-x-3"
                      >
                        <input
                          type="checkbox"
                          value={option}
                          checked={formData.careerInterests.includes(option)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData((prev) => ({
                              ...prev,
                              careerInterests: checked
                                ? [...prev.careerInterests, option]
                                : prev.careerInterests.filter(
                                    (item) => item !== option
                                  ),
                            }));
                          }}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-slate-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* College Activities / Clubs */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    College Activities / Clubs (comma separated)
                  </label>
                  <input
                    type="text"
                    value={
                      formData.activitiesText ||
                      (Array.isArray(formData.activities)
                        ? formData.activities.join(", ")
                        : "")
                    }
                    onChange={(e) => {
                      const text = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        activitiesText: text, // keep raw text for smooth typing
                        activities: text
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean), // maintain array
                      }));
                    }}
                    placeholder="e.g., SIH Hackathon, Anchoring, Sports Club"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  />
                </div>

                {/* Mentorship Open */}
                <div className="flex items-center gap-3">
                  <input
                    id="mentorshipOpen"
                    type="checkbox"
                    checked={!!formData.mentorshipOpen}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        mentorshipOpen: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="mentorshipOpen"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Open to mentorship from alumni
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Alumni-specific fields */}
          {user.role === "alumni" && (
            <motion.div
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Alumni Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Degree
                  </label>
                  <select
                    name="degree"
                    value={formData.degree}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="">Select</option>
                    <option value="B.Tech">B.Tech</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="PhD">PhD</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Current Company / Organization
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Job Role
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Industry / Domain
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                    placeholder="IT, Finance, Research, Startup, Education, etc."
                  />
                </div>

                {/* Guidance Areas as checkboxes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Guidance Areas
                  </label>
                  <div className="flex flex-col space-y-2">
                    {[
                      "Jobs",
                      "Internships",
                      "Higher Studies",
                      "Startups",
                      "Research",
                    ].map((area) => (
                      <label key={area} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          value={area}
                          checked={formData.guidanceAreas.includes(area)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData((prev) => ({
                              ...prev,
                              guidanceAreas: checked
                                ? [...prev.guidanceAreas, area]
                                : prev.guidanceAreas.filter(
                                    (item) => item !== area
                                  ),
                            }));
                          }}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-slate-700">{area}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Simple mentorship checkbox */}
                <div className="flex items-center gap-3">
                  <input
                    id="mentorshipAvailable"
                    type="checkbox"
                    checked={!!formData.mentorshipAvailable}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        mentorshipAvailable: e.target.checked,
                      }))
                    }
                  />
                  <label
                    htmlFor="mentorshipAvailable"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Available for mentorship
                  </label>
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
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Personal Information
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-slate-500">
                Name:
              </span>
              <p className="text-slate-800">{user.name || "Not provided"}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-500">Bio:</span>
              <p className="text-slate-800">{user.bio || "Not provided"}</p>
            </div>
            {user.department && (
              <div>
                <span className="text-sm font-semibold text-slate-500">
                  Department:
                </span>
                <p className="text-slate-800">{user.department}</p>
              </div>
            )}
            {user.graduationYear && (
              <div>
                <span className="text-sm font-semibold text-slate-500">
                  Graduation Year:
                </span>
                <p className="text-slate-800">{user.graduationYear}</p>
              </div>
            )}
            {user.year && (
              <div>
                <span className="text-sm font-semibold text-slate-500">
                  Current Year:
                </span>
                <p className="text-slate-800">{user.year}</p>
              </div>
            )}
          </div>
        </motion.div>

        {user.role === "alumni" && (
          <motion.div
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Professional Information
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-semibold text-slate-500">
                  Job Role:
                </span>
                <p className="text-slate-800">
                  {user.position || user.current_job_title || "Not provided"}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-500">
                  Company:
                </span>
                <p className="text-slate-800">
                  {user.company || "Not provided"}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-500">
                  Industry:
                </span>
                <p className="text-slate-800">
                  {user.industry || "Not provided"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    )}
  </div>
);

// Skills Section Component
const SkillsSection = ({
  user,
  isEditing,
  setIsEditing,
  formData,
  skillInput,
  setSkillInput,
  onSkillKeyDown,
  suggestions,
  addSuggested,
  removeSkill,
  commitSkillInput,
  handleSubmit,
}) => (
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
                <span
                  key={skill}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-orange-100 text-indigo-800 text-sm font-medium transition transform hover:scale-105"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-2 text-indigo-700 hover:text-indigo-900"
                  >
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
                {suggestions.map((s) => (
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
const ConnectionsSection = ({
  connections,
  allConnections,
  handleMessageUser,
  handleConnectionAction,
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-slate-800">My Connections</h2>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {allConnections ? allConnections.length : connections.length}
          </div>
          <div className="text-sm text-slate-500">Total Connections</div>
        </div>
      </div>
    </div>

    <motion.div
      className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {allConnections && allConnections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allConnections.map((connection, index) => {
            const profileUrl = connection.username
              ? `/profile/${connection.username}`
              : `/profile/id/${connection._id}`;
            return (
              <motion.div
                key={connection._id}
                className="bg-white/80 rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <a href={profileUrl} className="focus:outline-none">
                    <img
                      className="h-12 w-12 rounded-full object-cover border-2 border-indigo-200 hover:ring-2 hover:ring-indigo-400 transition"
                      src={
                        connection.avatarUrl
                          ? getAvatarUrl(connection.avatarUrl)
                          : DEFAULT_PROFILE_IMAGE
                      }
                      alt={connection.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_PROFILE_IMAGE;
                      }}
                    />
                  </a>
                  <div className="flex-1">
                    <a
                      href={profileUrl}
                      className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors block"
                    >
                      {connection.name}
                    </a>
                    <p className="text-sm text-slate-500 capitalize">
                      {connection.role}
                    </p>
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
                    onClick={() =>
                      handleConnectionAction("remove", connection._id)
                    }
                    className="px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiUserX size={14} /> Unfollow
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <FiUsers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No connections yet
          </h3>
          <p className="text-slate-500">
            Start connecting with your alumni, teachers, and peers!
          </p>
        </div>
      )}
    </motion.div>
  </div>
);

// Settings Section Component
const SettingsSection = ({
  user,
  isEditing,
  setIsEditing,
  formData,
  setFormData,
  handleChange,
  avatarFile,
  setAvatarFile,
  handleDeleteAvatar,
  handleSubmit,
}) => (
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
          <motion.button
            onClick={handleDeleteAvatar}
            className="flex items-center gap-2 px-6 py-3 border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiTrash2 size={18} />
            Delete Profile Picture
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Profile Picture
            </label>
            <FileInput accept="image/*" onChange={setAvatarFile} />
            {avatarFile && (
              <p className="text-sm text-green-600 mt-2">
                ✓ New image selected
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Name
            </label>
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-500"
            />
          </div>

          <div className="pt-2">
            <motion.button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete your profile? This cannot be undone."
                  )
                ) {
                  // placeholder; backend route to be added
                  alert("Use admin to delete or add endpoint.");
                }
              }}
              className="flex items-center gap-2 px-6 py-3 border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiTrash2 size={18} />
              Delete Profile
            </motion.button>
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
            <span className="text-sm font-semibold text-slate-500">
              Member Since:
            </span>
            <p className="text-slate-800">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  </div>
);

// Posts Section Component
const PostsSection = ({
  user,
  posts,
  setPosts,
  showCreatePost,
  setShowCreatePost,
  fetchUserPosts,
}) => {
  const [loading, setLoading] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/posts/user/${user._id}`);
      setPosts(response.data);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + postImages.length > 5) {
      toast.error("You can upload maximum 5 images");
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 5MB`);
        return false;
      }
      return true;
    });

    setPostImages([...postImages, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setPostImages(postImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && postImages.length === 0) {
      toast.error("Please add some content or images");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("content", postContent);
      postImages.forEach((image) => {
        formData.append("media", image);
      });

      await axios.post("/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Post created successfully!");
      setPostContent("");
      setPostImages([]);
      setImagePreviews([]);
      setShowCreatePost(false);
      loadPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(error.response?.data?.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await axios.delete(`/api/posts/${postId}`);
      toast.success("Post deleted successfully");
      loadPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const formatTime = (date) => {
    const postDate = new Date(date);
    return postDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Post Card */}
      {!showCreatePost ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
        >
          <button
            onClick={() => setShowCreatePost(true)}
            className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <img
              src={
                user.avatarUrl
                  ? getAvatarUrl(user.avatarUrl)
                  : DEFAULT_PROFILE_IMAGE
              }
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <span className="text-gray-500 text-left flex-1">
              Share something with your network...
            </span>
            <FiPlus className="text-indigo-600" size={24} />
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Create Post</h3>
            <button
              onClick={() => {
                setShowCreatePost(false);
                setPostContent("");
                setPostImages([]);
                setImagePreviews([]);
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <img
              src={
                user.avatarUrl
                  ? getAvatarUrl(user.avatarUrl)
                  : DEFAULT_PROFILE_IMAGE
              }
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold text-gray-800">{user.name}</p>
              <p className="text-sm text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>

          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="What do you want to share? Use **bold**, *italic*, @mentions, #hashtags, and paste links!"
            className="w-full min-h-[120px] p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none resize-none text-gray-800"
          />

          {/* Formatting Help */}
          <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <FiInfo size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Formatting tips:</span> **bold**,
              *italic*, @username for mentions, #hashtag for tags, paste URLs
              for links
            </div>
          </div>

          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 cursor-pointer transition-colors">
              <FiImage size={20} />
              <span className="font-semibold">Add Photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            <button
              onClick={handleCreatePost}
              disabled={
                submitting || (!postContent.trim() && postImages.length === 0)
              }
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <FiFileText className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No posts yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Share your first post with your network
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      post.user?.avatarUrl
                        ? getAvatarUrl(post.user.avatarUrl)
                        : DEFAULT_PROFILE_IMAGE
                    }
                    alt={post.user?.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {post.user?.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatTime(post.createdAt)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeletePost(post._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>

              <div className="text-gray-700 mb-4 whitespace-pre-wrap">
                {formatPostContent(post.content)}
              </div>

              {post.media && post.media.length > 0 && (
                <div
                  className={`mb-4 ${
                    post.media.length === 1 ? "" : "grid grid-cols-2 gap-2"
                  }`}
                >
                  {post.media.map((item, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden">
                      {item.type === "image" && (
                        <img
                          src={item.url}
                          alt="Post media"
                          className="w-full h-auto object-cover"
                        />
                      )}
                      {item.type === "video" && (
                        <video src={item.url} controls className="w-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <FiThumbsUp size={16} />
                  <span>
                    {post.reactions?.length || post.likes?.length || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiMessageCircle size={16} />
                  <span>{post.comments?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiShare size={16} />
                  <span>{post.shares || 0}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};



export default ProfilePage;
