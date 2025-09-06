import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { connectionAPI } from '../components/utils/api';
import { getAvatarUrl } from '../components/utils/helpers';
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
    socials: { linkedin: '', github: '', twitter: '' }
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
        socials: user.socials || { linkedin: '', github: '', twitter: '' }
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

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
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
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              <FiMessageCircle className="mr-2" /> Message
            </button>
            <button
              onClick={() => handleConnectionAction('remove')}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
            >
              <FiUserX className="mr-2" /> Remove
            </button>
          </div>
        );
      case 'pending':
        return (
          <button disabled className="px-4 py-2 bg-yellow-500 text-white rounded-xl opacity-75">
            <FiUserCheck className="mr-2" /> Pending
          </button>
        );
      case 'received':
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleConnectionAction('accept')}
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
            >
              <FiUserCheck className="mr-2" /> Accept
            </button>
            <button
              onClick={() => handleConnectionAction('reject')}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
            >
              <FiUserX className="mr-2" /> Reject
            </button>
          </div>
        );
      default:
        return (
          <button
            onClick={() => handleConnectionAction('send')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700"
          >
            <FiUserPlus className="mr-2" /> Connect
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
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 border border-indigo-100">
          <div className="relative">
            <div className="h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600"></div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-8">
              <div className="flex flex-col md:flex-row items-center md:items-end">
                {/* Avatar */}
                <div className="relative mb-4 md:mb-0">
                  {user.avatarUrl ? (
                    <img className="h-32 w-32 rounded-full border-4 border-white shadow-2xl" src={getAvatarUrl(user.avatarUrl)} alt={user.name} />
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-2xl">
                      <span className="text-4xl font-bold text-indigo-600">{user.name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="md:ml-6 text-center md:text-left text-white">
                  <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
                  <p className="text-xl opacity-90 mb-1">{user.email}</p>
                  <span className="px-4 py-1 bg-white/20 rounded-full text-sm capitalize">{user.role}</span>
                </div>
                {/* Actions */}
                <div className="md:ml-auto mt-4 md:mt-0">
                  {isOwnProfile ? (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 border border-white/30"
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

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-indigo-100">
          {isEditing && isOwnProfile ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Editing form (name, bio, skills, socials) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Profile Picture</label>
                    <FileInput accept="image/*" onChange={setAvatarFile} />
                    {avatarFile && <p className="text-sm text-green-600 mt-2">✓ New image selected</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Skills</label>
                    <input
                      type="text"
                      value={formData.skills.join(', ')}
                      onChange={handleSkillsChange}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="JavaScript, React, Node.js"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={6}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Social Links</h3>
                    <input type="url" name="socials.linkedin" value={formData.socials.linkedin} onChange={handleChange} placeholder="LinkedIn" className="w-full px-4 py-2 border rounded-lg" />
                    <input type="url" name="socials.github" value={formData.socials.github} onChange={handleChange} placeholder="GitHub" className="w-full px-4 py-2 border rounded-lg" />
                    <input type="url" name="socials.twitter" value={formData.socials.twitter} onChange={handleChange} placeholder="Twitter" className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-6">
                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* About + Skills */}
              <div className="lg:col-span-2 space-y-6">
                {user.bio && (
                  <div>
                    <h3 className="text-2xl font-bold mb-4">About</h3>
                    <p className="text-gray-700">{user.bio}</p>
                  </div>
                )}
                {user.skills?.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-4">Skills</h3>
                    <div className="flex flex-wrap gap-3">
                      {user.skills.map((skill, idx) => (
                        <span key={idx} className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-xl text-sm font-semibold">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Contact + Social */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Contact</h3>
                  <div className="p-4 bg-indigo-50 rounded-xl">
                    <div className="flex items-center">
                      <FiMail className="text-indigo-600 mr-3" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
                {user.socials && Object.values(user.socials).some(Boolean) && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Social Links</h3>
                    <div className="space-y-2">
                      {user.socials.linkedin && <a href={user.socials.linkedin} target="_blank" rel="noreferrer" className="block text-blue-600">LinkedIn</a>}
                      {user.socials.github && <a href={user.socials.github} target="_blank" rel="noreferrer" className="block text-gray-800">GitHub</a>}
                      {user.socials.twitter && <a href={user.socials.twitter} target="_blank" rel="noreferrer" className="block text-blue-400">Twitter</a>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
