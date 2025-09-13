import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { connectionAPI, userAPI, postsAPI } from '../components/utils/api';
import { getAvatarUrl } from '../components/utils/helpers';
import { FiEdit, FiMail, FiUserPlus, FiUserCheck, FiUserX, FiMessageCircle, FiX } from 'react-icons/fi';
import { motion } from "framer-motion";
import PostCard from '../components/posts/PostCard';
import CreatePost from '../components/posts/PostComposer';

const COMMON_SKILLS = [
  'JavaScript','TypeScript','React','Node.js','Express','MongoDB','SQL','PostgreSQL','Python','Django','Flask','Java','Spring','C++','C#','Go','Rust','Next.js','Tailwind CSS','HTML','CSS','Sass','Kotlin','Swift','AWS','GCP','Azure','Docker','Kubernetes','Git','Figma','UI/UX','Machine Learning','Deep Learning','NLP'
];

const ProfilePage = () => {
  const { user: currentUser, updateProfile } = useAuth();
  const { userId, username } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
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

  const isOwnProfile = !userId && !username;

  useEffect(() => {
    if (isOwnProfile) {
      setUser(currentUser);
    } else {
      fetchUserProfile();
    }
    // Remove any legacy yellow banner if rendered elsewhere (no-op here)
    const banner = document.querySelector('[data-profile-alert]');
    if (banner?.parentNode) banner.parentNode.removeChild(banner);
  }, [userId, username, currentUser]);

  useEffect(() => {
    if (!isOwnProfile && user) {
      fetchConnectionStatus();
    }
  }, [user, currentUser, isOwnProfile]);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
    }
  }, [user]);

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

  const fetchUserPosts = async () => {
    if (!user) return;
    try {
      setPostsLoading(true);
      const response = await postsAPI.getUserPosts(user._id);
      setUserPosts(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleConnectionAction = async (action) => {
    try {
      const targetUserId = userId || user?._id;
      if (!targetUserId) {
        toast.error('User ID not found');
        return;
      }

      switch (action) {
        case 'send':
          await connectionAPI.sendRequest(targetUserId);
          setConnectionStatus('pending');
          toast.success('Connection request sent');
          break;
        case 'accept':
          await connectionAPI.acceptRequest(targetUserId);
          setConnectionStatus('connected');
          toast.success('Connection accepted');
          break;
        case 'reject':
          await connectionAPI.rejectRequest(targetUserId);
          setConnectionStatus(null);
          toast.success('Connection request rejected');
          break;
        case 'remove':
          await connectionAPI.removeConnection(targetUserId);
          setConnectionStatus(null);
          toast.success('Connection removed');
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

  // Skills chips with suggestions
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

  // Helper for arrays
  const handleArrayFieldChange = (fieldName, value) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [fieldName]: arrayValue }));
  };

  // Helper for checkbox arrays
  const handleCheckboxArrayChange = (fieldName, value, checked) => {
    setFormData(prev => {
      const currentArray = prev[fieldName] || [];
      if (checked) return { ...prev, [fieldName]: [...currentArray, value] };
      return { ...prev, [fieldName]: currentArray.filter(item => item !== value) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile(formData, avatarFile);
    if (result.success) {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      setAvatarFile(null);
      setUser(prev => ({ ...prev, ...formData })); // Immediate reflect
    } else {
      toast.error(result.error || 'Failed to update profile');
    }
  };

  const renderConnectionButton = () => {
    if (isOwnProfile || !currentUser) return null;
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/messages?user=${userId}`)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <FiMessageCircle className="mr-2" /> Message
            </button>
            <button
              onClick={() => handleConnectionAction('remove')}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <FiUserX className="mr-2" /> Remove
            </button>
          </div>
        );
      case 'pending':
        return (
          <button disabled className="px-4 py-2 bg-yellow-500 text-white rounded-xl opacity-75">
            <FiUserCheck className="mr-2 inline" /> Pending
          </button>
        );
      case 'received':
      case 'incoming':
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleConnectionAction('accept')}
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <FiUserCheck className="mr-2 inline" /> Accept
            </button>
            <button
              onClick={() => handleConnectionAction('reject')}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <FiUserX className="mr-2 inline" /> Reject
            </button>
          </div>
        );
      default:
        return (
          <button
            onClick={() => handleConnectionAction('send')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors"
          >
            <FiUserPlus className="mr-2 inline" /> Connect
          </button>
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Top header (kept exactly) */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 border border-indigo-100">
          <div className="relative">
            <div className="h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600"></div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-8">
              <div className="flex flex-col md:flex-row items-center md:items-end">
                <div className="relative mb-4 md:mb-0">
                  {user.avatarUrl ? (
                    <img className="h-32 w-32 rounded-full border-4 border-white shadow-2xl" src={getAvatarUrl(user.avatarUrl)} alt={user.name} />
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-2xl">
                      <span className="text-4xl font-bold text-indigo-600">{user.name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="md:ml-6 text-center md:text-left text-white">
                  <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
                  <p className="text-xl opacity-90 mb-1">{user.email}</p>
                  <span className="px-4 py-1 bg-white/20 rounded-full text-sm capitalize">{user.role}</span>
                </div>
                <div className="md:ml-auto mt-4 md:mt-0">
                  {isOwnProfile ? (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 border border-white/30 transition-colors"
                    >
                      <FiEdit className="mr-2 inline" /> {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                  ) : (
                    renderConnectionButton()
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom redesigned section */}
        <div className="bg-white/60 rounded-3xl shadow-xl p-2 md:p-4 border border-indigo-100">
          {isEditing && isOwnProfile ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="rounded-2xl shadow-sm p-4 bg-white">
                    <div className="sticky top-0 -mt-4 -mx-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                      <h3 className="text-lg font-semibold">Profile Basics</h3>
                    </div>
                    <div className="pt-4">
                      <label className="block text-sm font-semibold mb-2">Profile Picture</label>
                      <FileInput accept="image/*" onChange={setAvatarFile} />
                      {avatarFile && <p className="text-sm text-green-600 mt-2">✓ New image selected</p>}
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold mb-2">
                        Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                        required
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold mb-2">
                        Bio <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={5}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                        placeholder="Tell us about yourself..."
                        required
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl shadow-sm p-4 bg-white">
                    <div className="sticky top-0 -mt-4 -mx-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                      <h3 className="text-lg font-semibold">Skills</h3>
                    </div>
                    <div className="pt-4">
                      <div className="w-full px-4 py-3 border rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition bg-white">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {normalizedSkills.map((skill) => (
                            <span key={skill} className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 text-sm font-medium transition transform hover:scale-105">
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
                  </div>

                  {user?.role === 'student' && (
                    <div className="rounded-2xl shadow-sm p-4 bg-white">
                      <div className="sticky top-0 -mt-4 -mx-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                        <h3 className="text-lg font-semibold">Academic & Goals</h3>
                      </div>
                      <div className="pt-4 space-y-4">
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Specialization (e.g., AI, Web)"
                        />
                        <input
                          type="text"
                          value={formData.projects.join(', ')}
                          onChange={(e) => handleArrayFieldChange('projects', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Projects (comma separated)"
                        />
                        <input
                          type="text"
                          value={formData.desired_roles.join(', ')}
                          onChange={(e) => handleArrayFieldChange('desired_roles', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Desired Roles (comma separated)"
                        />
                        <input
                          type="text"
                          value={formData.preferred_industries.join(', ')}
                          onChange={(e) => handleArrayFieldChange('preferred_industries', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Preferred Industries (comma separated)"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <select
                            name="higher_studies_interest"
                            value={formData.higher_studies_interest}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          >
                            <option value="Yes">Higher Studies: Yes</option>
                            <option value="No">Higher Studies: No</option>
                            <option value="Maybe">Higher Studies: Maybe</option>
                          </select>
                          <select
                            name="entrepreneurship_interest"
                            value={formData.entrepreneurship_interest}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          >
                            <option value="Yes">Entrepreneurship: Yes</option>
                            <option value="No">Entrepreneurship: No</option>
                            <option value="Maybe">Entrepreneurship: Maybe</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2">Mentorship Needs</label>
                          <div className="space-y-2">
                            {['Career Guidance', 'Higher Studies Advice', 'Technical Skills', 'Startup Guidance'].map(need => (
                              <label key={need} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={formData.mentorship_needs.includes(need)}
                                  onChange={(e) => handleCheckboxArrayChange('mentorship_needs', need, e.target.checked)}
                                  className="mr-2"
                                />
                                <span className="text-sm">{need}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl shadow-sm p-4 bg-white">
                    <div className="sticky top-0 -mt-4 -mx-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                      <h3 className="text-lg font-semibold">Location & Contact</h3>
                    </div>
                    <div className="pt-4 space-y-4">
                      <input
                        type="text"
                        name="location"
                        value={formData.location || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                        placeholder="e.g., Mumbai, India"
                      />
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Social Links</h4>
                        <input type="url" name="socials.linkedin" value={formData.socials.linkedin} onChange={handleChange} placeholder="LinkedIn URL" className="w-full px-4 py-2 border rounded-lg" />
                        <input type="url" name="socials.github" value={formData.socials.github} onChange={handleChange} placeholder="GitHub URL" className="w-full px-4 py-2 border rounded-lg" />
                        <input type="url" name="socials.twitter" value={formData.socials.twitter} onChange={handleChange} placeholder="Twitter URL" className="w-full px-4 py-2 border rounded-lg" />
                        <input type="url" name="socials.website" value={formData.socials.website || ''} onChange={handleChange} placeholder="Website URL" className="w-full px-4 py-2 border rounded-lg" />
                      </div>
                    </div>
                  </div>

                  {user?.role === 'student' && (
                    <div className="rounded-2xl shadow-sm p-4 bg-white">
                      <div className="sticky top-0 -mt-4 -mx-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                        <h3 className="text-lg font-semibold">Experience</h3>
                      </div>
                      <div className="pt-4 space-y-4">
                        <input
                          type="text"
                          value={formData.internships.join(', ')}
                          onChange={(e) => handleArrayFieldChange('internships', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Internships (comma separated)"
                        />
                        <input
                          type="text"
                          value={formData.hackathons.join(', ')}
                          onChange={(e) => handleArrayFieldChange('hackathons', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Hackathons (comma separated)"
                        />
                        <input
                          type="text"
                          value={formData.research_papers.join(', ')}
                          onChange={(e) => handleArrayFieldChange('research_papers', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Research Papers (comma separated)"
                        />
                      </div>
                    </div>
                  )}

                  {user?.role === 'alumni' && (
                    <>
                      <div className="rounded-2xl shadow-sm p-4 bg-white">
                        <div className="sticky top-0 -mt-4 -mx-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                          <h3 className="text-lg font-semibold">Career</h3>
                        </div>
                        <div className="pt-4 space-y-4">
                          <input
                            type="text"
                            name="current_job_title"
                            value={formData.current_job_title}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Current Job Title"
                          />
                          <input
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Company"
                          />
                          <input
                            type="text"
                            name="industry"
                            value={formData.industry}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Industry"
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl shadow-sm p-4 bg-white">
                        <div className="sticky top-0 -mt-4 -mx-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                          <h3 className="text-lg font-semibold">Mentorship & Achievements</h3>
                        </div>
                        <div className="pt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2">Mentorship Interests</label>
                            <div className="space-y-2">
                              {['Career Guidance', 'Higher Studies', 'Technical Mentoring', 'Startup Advice'].map(interest => (
                                <label key={interest} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.mentorship_interests.includes(interest)}
                                    onChange={(e) => handleCheckboxArrayChange('mentorship_interests', interest, e.target.checked)}
                                    className="mr-2"
                                  />
                                  <span className="text-sm">{interest}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={formData.preferred_students.join(', ')}
                            onChange={(e) => handleArrayFieldChange('preferred_students', e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Preferred Students (comma separated)"
                          />
                          <input
                            type="text"
                            value={formData.certifications.join(', ')}
                            onChange={(e) => handleArrayFieldChange('certifications', e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Certifications (comma separated)"
                          />
                          <input
                            type="text"
                            value={formData.publications.join(', ')}
                            onChange={(e) => handleArrayFieldChange('publications', e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Publications (comma separated)"
                          />
                          <input
                            type="text"
                            name="entrepreneurship"
                            value={formData.entrepreneurship}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Entrepreneurship"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* About */}
                {user.bio && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                    <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                      <h3 className="text-lg font-semibold">About</h3>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                    </div>
                  </motion.div>
                )}

                {/* Student Sections */}
                {user.role === 'student' && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                        <h3 className="text-lg font-semibold">Academic Information</h3>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.department && (<InfoItem label="Department" value={user.department} />)}
                        {user.year && (<InfoItem label="Year of Study" value={user.year} />)}
                        {user.division && (<InfoItem label="Division" value={user.division} />)}
                        {user.batch && (<InfoItem label="Batch" value={user.batch} />)}
                        {user.rollNumber && (<InfoItem label="Roll Number" value={user.rollNumber} />)}
                        {user.specialization && (<InfoItem label="Specialization" value={user.specialization} />)}
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                        <h3 className="text-lg font-semibold">Career Aspirations</h3>
                      </div>
                      <div className="p-6 space-y-4">
                        {user.desired_roles?.length > 0 && (
                          <ChipList label="Desired Roles" items={user.desired_roles} color="blue" />
                        )}
                        {user.preferred_industries?.length > 0 && (
                          <ChipList label="Preferred Industries" items={user.preferred_industries} color="green" />
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {user.higher_studies_interest && (<InfoItem label="Higher Studies Interest" value={user.higher_studies_interest} />)}
                          {user.entrepreneurship_interest && (<InfoItem label="Entrepreneurship Interest" value={user.entrepreneurship_interest} />)}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                        <h3 className="text-lg font-semibold">Experience</h3>
                      </div>
                      <div className="p-6 space-y-4">
                        {user.projects?.length > 0 && (<ChipList label="Projects" items={user.projects} color="purple" />)}
                        {user.internships?.length > 0 && (<ChipList label="Internships" items={user.internships} color="orange" />)}
                        {user.hackathons?.length > 0 && (<ChipList label="Hackathons" items={user.hackathons} color="red" />)}
                        {user.research_papers?.length > 0 && (<ChipList label="Research Papers" items={user.research_papers} color="indigo" />)}
                      </div>
                    </motion.div>

                    {user.mentorship_needs?.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                        <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to紫-600 text-white rounded-t-2xl">
                          <h3 className="text-lg font-semibold">Mentorship Needs</h3>
                        </div>
                        <div className="p-6">
                          <div className="flex flex-wrap gap-2">
                            {user.mentorship_needs.map((need, idx) => (
                              <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                {need}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                        <h3 className="text-lg font-semibold">Preferences</h3>
                      </div>
                      <div className="p-6 space-y-4">
                        {user.preferred_location && (<InfoItem label="Preferred Location" value={user.preferred_location} />)}
                        {user.preferred_mode?.length > 0 && <ChipList label="Preferred Communication Mode" items={user.preferred_mode} color="teal" />}
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Alumni Sections */}
                {user.role === 'alumni' && (
                  <>
                    <CardSection title="Academic Background">
                      {user.specialization && (<InfoItem label="Specialization" value={user.specialization} />)}
                      {user.higher_studies && (
                        <div className="space-y-1">
                          {user.higher_studies.degree && (<InfoItem label="Degree" value={user.higher_studies.degree} />)}
                          {user.higher_studies.university && (<InfoItem label="University" value={user.higher_studies.university} />)}
                          {user.higher_studies.specialization && (<InfoItem label="Specialization" value={user.higher_studies.specialization} />)}
                        </div>
                      )}
                    </CardSection>

                    <CardSection title="Career Information">
                      {user.current_job_title && (<InfoItem label="Current Job Title" value={user.current_job_title} />)}
                      {user.company && (<InfoItem label="Company" value={user.company} />)}
                      {user.industry && (<InfoItem label="Industry" value={user.industry} />)}
                      {user.past_experience?.length > 0 && (<ChipList label="Past Experience" items={user.past_experience} color="blue" />)}
                    </CardSection>

                    <CardSection title="Mentorship">
                      {user.mentorship_interests?.length > 0 && (<ChipList label="Mentorship Interests" items={user.mentorship_interests} color="green" />)}
                      {user.preferred_students?.length > 0 && (<ChipList label="Preferred Students" items={user.preferred_students} color="purple" />)}
                      {user.availability && (<InfoItem label="Availability" value={user.availability} />)}
                    </CardSection>

                    <CardSection title="Achievements">
                      {user.certifications?.length > 0 && (<ChipList label="Certifications" items={user.certifications} color="yellow" />)}
                      {user.publications?.length > 0 && (<ChipList label="Publications" items={user.publications} color="indigo" />)}
                      {user.entrepreneurship && (<InfoItem label="Entrepreneurship" value={user.entrepreneurship} />)}
                    </CardSection>
                  </>
                )}

                {/* Skills */}
                {user.skills?.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                    <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                      <h3 className="text-lg font-semibold">Skills</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 rounded-full text-sm font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Posts Section */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                  <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                    <h3 className="text-lg font-semibold">Posts</h3>
                  </div>
                  <div className="p-6">
                    {/* Create Post (only for own profile and if user can create posts) */}
                    {isOwnProfile && (user?.role === 'teacher' || user?.role === 'alumni' || user?.role === 'admin') && (
                      <div className="mb-6">
                        <CreatePost onPosted={fetchUserPosts} />
                      </div>
                    )}

                    {/* User Posts */}
                    {postsLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-2 text-gray-600">Loading posts...</span>
                      </div>
                    ) : userPosts.length > 0 ? (
                      <div className="space-y-4">
                        {userPosts.map((post) => (
                          <PostCard 
                            key={post._id} 
                            post={post} 
                            onUpdate={fetchUserPosts}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">📝</span>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">No Posts Yet</h4>
                        <p className="text-gray-600">
                          {isOwnProfile 
                            ? (user?.role === 'student' 
                                ? "Students cannot create posts, but you can view posts from your connections in the Feed."
                                : "Share your thoughts, experiences, or updates with your connections!")
                              : "This user hasn't shared any posts yet."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Contact Sidebar */}
              <div className="space-y-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                  <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                    <h3 className="text-lg font-semibold">Contact</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center">
                      <FiMail className="text-indigo-600 mr-3" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    {user.location && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">📍 {user.location}</span>
                      </div>
                    )}
                  </div>
                </motion.div>

                {(user.socials && Object.values(user.socials).some(Boolean)) || user.linkedin || user.github || user.website ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                    <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
                      <h3 className="text-lg font-semibold">Social Links</h3>
                    </div>
                    <div className="p-6 space-y-2">
                      {user.socials?.linkedin && <a href={user.socials.linkedin} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">LinkedIn</a>}
                      {user.linkedin && <a href={user.linkedin} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">LinkedIn</a>}
                      {user.socials?.github && <a href={user.socials.github} target="_blank" rel="noreferrer" className="block text-gray-800 hover:underline">GitHub</a>}
                      {user.github && <a href={user.github} target="_blank" rel="noreferrer" className="block text-gray-800 hover:underline">GitHub</a>}
                      {user.socials?.twitter && <a href={user.socials.twitter} target="_blank" rel="noreferrer" className="block text-blue-400 hover:underline">Twitter</a>}
                      {user.socials?.website && <a href={user.socials.website} target="_blank" rel="noreferrer" className="block text-purple-600 hover:underline">Website</a>}
                      {user.website && <a href={user.website} target="_blank" rel="noreferrer" className="block text-purple-600 hover:underline">Website</a>}
                    </div>
                  </motion.div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div>
    <span className="text-sm font-semibold text-gray-600">{label}</span>
    <p className="text-gray-900">{value}</p>
  </div>
);

const ChipList = ({ label, items, color }) => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    teal: 'bg-teal-100 text-teal-800'
  };
  return (
    <div>
      <span className="text-sm font-semibold text-gray-600">{label}</span>
      <div className="flex flex-wrap gap-2 mt-2">
        {items.map((item, idx) => (
          <span key={`${item}-${idx}`} className={`px-3 py-1 rounded-full text-sm ${colorMap[color] || 'bg-gray-100 text-gray-800'}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const CardSection = ({ title, children }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
    <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="p-6 space-y-3">
      {children}
    </div>
  </motion.div>
);

export default ProfilePage;