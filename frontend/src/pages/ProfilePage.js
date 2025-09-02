
<old_str>import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';

const ProfilePage = () => {
  const { user, updateProfile, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: [],
    socials: {
      linkedin: '',
      github: '',
      twitter: ''
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        skills: user.skills || [],
        socials: user.socials || {
          linkedin: '',
          github: '',
          twitter: ''
        }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('socials.')) {
      const socialField = name.replace('socials.', '');
      setFormData({
        ...formData,
        socials: { ...formData.socials, [socialField]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
    setFormData({ ...formData, skills });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile(formData, avatarFile);
    if (result.success) {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      setAvatarFile(null);
    } else {
      toast.error(result.error || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-8">
            <div className="flex flex-col md:flex-row items-center">
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    className="h-32 w-32 rounded-full border-4 border-white shadow-lg"
                    src={user.avatarUrl}
                    alt={user.name}
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-4xl font-bold text-primary-600">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white">{user.name}</h1>
                <p className="text-primary-100">{user.email}</p>
                <p className="text-primary-200 capitalize">{user.role}</p>
              </div>
              
              <div className="mt-4 md:mt-0 md:ml-auto">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="btn btn-outline-white"
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="form-label">Profile Picture</label>
                  <FileInput
                    accept="image/*"
                    onChange={setAvatarFile}
                  />
                </div>
                
                <div>
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="form-input"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                
                <div>
                  <label className="form-label">Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.skills.join(', ')}
                    onChange={handleSkillsChange}
                    className="form-input"
                    placeholder="JavaScript, React, Node.js, etc."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">LinkedIn</label>
                    <input
                      type="url"
                      name="socials.linkedin"
                      value={formData.socials.linkedin}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">GitHub</label>
                    <input
                      type="url"
                      name="socials.github"
                      value={formData.socials.github}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Twitter</label>
                    <input
                      type="url"
                      name="socials.twitter"
                      value={formData.socials.twitter}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {user.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-gray-700">{user.bio}</p>
                  </div>
                )}
                
                {user.skills && user.skills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {user.socials && Object.values(user.socials).some(url => url) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Social Links</h3>
                    <div className="flex space-x-4">
                      {user.socials.linkedin && (
                        <a
                          href={user.socials.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          LinkedIn
                        </a>
                      )}
                      {user.socials.github && (
                        <a
                          href={user.socials.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 hover:text-gray-700"
                        >
                          GitHub
                        </a>
                      )}
                      {user.socials.twitter && (
                        <a
                          href={user.socials.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-500"
                        >
                          Twitter
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;</old_str>
<new_str>import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { connectionAPI } from '../components/utils/api';
import { FiEdit, FiMail, FiLinkedin, FiGithub, FiTwitter, FiUserPlus, FiUserCheck, FiUserX, FiMessageCircle } from 'react-icons/fi';
import axios from 'axios';

const ProfilePage = () => {
  const { user: currentUser, updateProfile, loading } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: [],
    socials: {
      linkedin: '',
      github: '',
      twitter: ''
    }
  });

  const isOwnProfile = !userId || userId === currentUser?._id;

  useEffect(() => {
    if (isOwnProfile) {
      setUser(currentUser);
    } else {
      fetchUserProfile();
      fetchConnectionStatus();
    }
  }, [userId, currentUser]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        skills: user.skills || [],
        socials: user.socials || {
          linkedin: '',
          github: '',
          twitter: ''
        }
      });
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`/api/users/${userId}`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load profile');
      navigate('/');
    }
  };

  const fetchConnectionStatus = async () => {
    if (!currentUser || isOwnProfile) return;
    
    try {
      const response = await connectionAPI.getConnectionStatus(userId);
      setConnectionStatus(response.data.status);
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  const handleConnectionAction = async (action) => {
    try {
      let response;
      switch (action) {
        case 'send':
          response = await connectionAPI.sendRequest(userId);
          setConnectionStatus('pending');
          toast.success('Connection request sent');
          break;
        case 'accept':
          response = await connectionAPI.acceptRequest(userId);
          setConnectionStatus('connected');
          toast.success('Connection accepted');
          break;
        case 'reject':
          response = await connectionAPI.rejectRequest(userId);
          setConnectionStatus(null);
          toast.success('Connection request rejected');
          break;
        case 'remove':
          response = await connectionAPI.removeConnection(userId);
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
      const socialField = name.replace('socials.', '');
      setFormData({
        ...formData,
        socials: { ...formData.socials, [socialField]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
    setFormData({ ...formData, skills });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile(formData, avatarFile);
    if (result.success) {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      setAvatarFile(null);
      setUser(prev => ({ ...prev, ...formData }));
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
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200"
            >
              <FiMessageCircle className="mr-2" />
              Message
            </button>
            <button
              onClick={() => handleConnectionAction('remove')}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200"
            >
              <FiUserX className="mr-2" />
              Remove
            </button>
          </div>
        );
      case 'pending':
        return (
          <button
            disabled
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-xl opacity-75 cursor-not-allowed"
          >
            <FiUserCheck className="mr-2" />
            Pending
          </button>
        );
      case 'received':
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleConnectionAction('accept')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200"
            >
              <FiUserCheck className="mr-2" />
              Accept
            </button>
            <button
              onClick={() => handleConnectionAction('reject')}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200"
            >
              <FiUserX className="mr-2" />
              Reject
            </button>
          </div>
        );
      default:
        return (
          <button
            onClick={() => handleConnectionAction('send')}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            <FiUserPlus className="mr-2" />
            Connect
          </button>
        );
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 border border-indigo-100">
            <div className="relative">
              {/* Cover Image */}
              <div className="h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600"></div>
              
              {/* Profile Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-8">
                <div className="flex flex-col md:flex-row items-center md:items-end">
                  {/* Avatar */}
                  <div className="relative mb-4 md:mb-0">
                    {user.avatarUrl ? (
                      <img
                        className="h-32 w-32 rounded-full border-4 border-white shadow-2xl"
                        src={user.avatarUrl}
                        alt={user.name}
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-2xl">
                        <span className="text-4xl font-bold text-indigo-600">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="md:ml-6 text-center md:text-left text-white">
                    <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
                    <p className="text-xl opacity-90 mb-1">{user.email}</p>
                    <span className="inline-block px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold capitalize">
                      {user.role}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="md:ml-auto mt-4 md:mt-0">
                    {isOwnProfile ? (
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/30"
                      >
                        <FiEdit className="mr-2" />
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                      </button>
                    ) : (
                      renderConnectionButton()
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-indigo-100">
            {isEditing && isOwnProfile ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture</label>
                      <FileInput
                        accept="image/*"
                        onChange={setAvatarFile}
                      />
                      {avatarFile && (
                        <p className="text-sm text-green-600 mt-2">✓ New image selected</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Skills (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.skills.join(', ')}
                        onChange={handleSkillsChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="JavaScript, React, Node.js, etc."
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">Social Links</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <FiLinkedin className="text-blue-600 mr-3" />
                          <input
                            type="url"
                            name="socials.linkedin"
                            value={formData.socials.linkedin}
                            onChange={handleChange}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="https://linkedin.com/in/..."
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <FiGithub className="text-gray-800 mr-3" />
                          <input
                            type="url"
                            name="socials.github"
                            value={formData.socials.github}
                            onChange={handleChange}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="https://github.com/..."
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <FiTwitter className="text-blue-400 mr-3" />
                          <input
                            type="url"
                            name="socials.twitter"
                            value={formData.socials.twitter}
                            onChange={handleChange}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="https://twitter.com/..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - About */}
                <div className="lg:col-span-2 space-y-6">
                  {user.bio && (
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                        <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-3"></div>
                        About
                      </h3>
                      <div className="bg-gradient-to-br from-gray-50 to-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.skills && user.skills.length > 0 && (
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                        <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-3"></div>
                        Skills & Expertise
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {user.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 rounded-xl text-sm font-semibold border border-indigo-200 hover:from-indigo-200 hover:to-purple-200 transition-all duration-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Contact & Social */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
                    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-3">
                      <div className="flex items-center">
                        <FiMail className="text-indigo-600 mr-3" />
                        <span className="text-gray-700">{user.email}</span>
                      </div>
                    </div>
                  </div>

                  {user.socials && Object.values(user.socials).some(url => url) && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Social Links</h3>
                      <div className="space-y-3">
                        {user.socials.linkedin && (
                          <a
                            href={user.socials.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all duration-200 border border-blue-200"
                          >
                            <FiLinkedin className="mr-3" />
                            LinkedIn Profile
                          </a>
                        )}
                        {user.socials.github && (
                          <a
                            href={user.socials.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                          >
                            <FiGithub className="mr-3" />
                            GitHub Profile
                          </a>
                        )}
                        {user.socials.twitter && (
                          <a
                            href={user.socials.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-blue-50 text-blue-400 rounded-xl hover:bg-blue-100 transition-all duration-200 border border-blue-200"
                          >
                            <FiTwitter className="mr-3" />
                            Twitter Profile
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;</new_str>
