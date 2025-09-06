import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { connectionAPI, userAPI } from '../components/utils/api';
import { getAvatarUrl } from '../components/utils/helpers';
import { FiEdit, FiMail, FiLinkedin, FiGithub, FiTwitter, FiUserPlus, FiUserCheck, FiUserX, FiMessageCircle } from 'react-icons/fi';
import axios from 'axios';



const ProfilePage = () => {
  const { user: currentUser, updateProfile } = useAuth();
  const { userId, username } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: [],
    socials: { linkedin: '', github: '', twitter: '', website: '' },
    // Student fields
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
    // Alumni fields
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

  // Determine if this is the current user's own profile
  const isOwnProfile = !userId && !username;

  useEffect(() => {
    if (isOwnProfile) {
      setUser(currentUser);
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
        // Student fields
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
        // Alumni fields
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
        // Fetch by username
        response = await userAPI.getUserByUsername(username);
      } else if (userId) {
        // Fetch by user ID
        response = await userAPI.getUserById(userId);
      } else {
        throw new Error('No user identifier provided');
      }
      
      // Handle the response format - backend returns { data: user }
      setUser(response.data.data || response.data);
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
      setConnectionStatus(response.data.status);
    } catch (error) {
      console.error('Error fetching connection status:', error);
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

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData({ ...formData, skills });
  };

  // Helper function for array fields
  const handleArrayFieldChange = (fieldName, value) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [fieldName]: arrayValue }));
  };

  // Helper function for nested object fields
  const handleNestedChange = (parentField, childField, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: { ...prev[parentField], [childField]: value }
    }));
  };

  // Helper function for checkbox arrays
  const handleCheckboxArrayChange = (fieldName, value, checked) => {
    setFormData(prev => {
      const currentArray = prev[fieldName] || [];
      if (checked) {
        return { ...prev, [fieldName]: [...currentArray, value] };
      } else {
        return { ...prev, [fieldName]: currentArray.filter(item => item !== value) };
      }
    });
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
                  
                  {/* Role-specific fields */}
                  {user?.role === 'student' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Specialization</label>
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., Artificial Intelligence, Web Development"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Projects</label>
                        <input
                          type="text"
                          value={formData.projects.join(', ')}
                          onChange={(e) => handleArrayFieldChange('projects', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Project 1, Project 2, Project 3"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Desired Roles</label>
                        <input
                          type="text"
                          value={formData.desired_roles.join(', ')}
                          onChange={(e) => handleArrayFieldChange('desired_roles', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Software Engineer, Data Scientist, Product Manager"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Preferred Industries</label>
                        <input
                          type="text"
                          value={formData.preferred_industries.join(', ')}
                          onChange={(e) => handleArrayFieldChange('preferred_industries', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Technology, Finance, Healthcare"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2">Higher Studies Interest</label>
                          <select
                            name="higher_studies_interest"
                            value={formData.higher_studies_interest}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Maybe">Maybe</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold mb-2">Entrepreneurship Interest</label>
                          <select
                            name="entrepreneurship_interest"
                            value={formData.entrepreneurship_interest}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Maybe">Maybe</option>
                          </select>
                        </div>
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
                    </>
                  )}
                  
                  {user?.role === 'alumni' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Current Job Title</label>
                        <input
                          type="text"
                          name="current_job_title"
                          value={formData.current_job_title}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., Senior Software Engineer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Company</label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., Google, Microsoft"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Industry</label>
                        <input
                          type="text"
                          name="industry"
                          value={formData.industry}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., Technology, Finance"
                        />
                      </div>
                      
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
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Availability</label>
                        <select
                          name="availability"
                          value={formData.availability}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Monthly">Monthly</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-6">
                  {/* Additional fields for both roles */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Mumbai, India"
                    />
                  </div>
                  
                  {/* Role-specific additional fields */}
                  {user?.role === 'student' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Internships</label>
                        <input
                          type="text"
                          value={formData.internships.join(', ')}
                          onChange={(e) => handleArrayFieldChange('internships', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Internship 1, Internship 2, Internship 3"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Hackathons</label>
                        <input
                          type="text"
                          value={formData.hackathons.join(', ')}
                          onChange={(e) => handleArrayFieldChange('hackathons', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Hackathon 1, Hackathon 2, Hackathon 3"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Research Papers</label>
                        <input
                          type="text"
                          value={formData.research_papers.join(', ')}
                          onChange={(e) => handleArrayFieldChange('research_papers', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Paper 1, Paper 2, Paper 3"
                        />
                      </div>
                    </>
                  )}
                  
                  {user?.role === 'alumni' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Past Experience</label>
                        <input
                          type="text"
                          value={formData.past_experience.join(', ')}
                          onChange={(e) => handleArrayFieldChange('past_experience', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Experience 1, Experience 2, Experience 3"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Preferred Students</label>
                        <input
                          type="text"
                          value={formData.preferred_students.join(', ')}
                          onChange={(e) => handleArrayFieldChange('preferred_students', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Same Department, Interested in AI, Entrepreneurship"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Certifications</label>
                        <input
                          type="text"
                          value={formData.certifications.join(', ')}
                          onChange={(e) => handleArrayFieldChange('certifications', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Certification 1, Certification 2, Certification 3"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Publications</label>
                        <input
                          type="text"
                          value={formData.publications.join(', ')}
                          onChange={(e) => handleArrayFieldChange('publications', e.target.value)}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="Publication 1, Publication 2, Publication 3"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2">Entrepreneurship</label>
                        <input
                          type="text"
                          name="entrepreneurship"
                          value={formData.entrepreneurship}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., Founder of XYZ"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Networking Links</h3>
                        <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="LinkedIn" className="w-full px-4 py-2 border rounded-lg" />
                        <input type="url" name="github" value={formData.github} onChange={handleChange} placeholder="GitHub" className="w-full px-4 py-2 border rounded-lg" />
                        <input type="url" name="website" value={formData.website} onChange={handleChange} placeholder="Website" className="w-full px-4 py-2 border rounded-lg" />
                      </div>
                    </>
                  )}
                  
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
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* About Section */}
                {user.bio && (
                  <div className="bg-white rounded-xl p-6 shadow-md">
                    <h3 className="text-2xl font-bold mb-4">About</h3>
                    <p className="text-gray-700">{user.bio}</p>
                  </div>
                )}

                {/* Role-specific sections */}
                {user.role === 'student' && (
                  <>
                    {/* Academic Information */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-2xl font-bold mb-4">Academic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.department && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Department</span>
                            <p className="text-gray-900">{user.department}</p>
                          </div>
                        )}
                        {user.year && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Year of Study</span>
                            <p className="text-gray-900">{user.year}</p>
                          </div>
                        )}
                        {user.division && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Division</span>
                            <p className="text-gray-900">{user.division}</p>
                          </div>
                        )}
                        {user.batch && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Batch</span>
                            <p className="text-gray-900">{user.batch}</p>
                          </div>
                        )}
                        {user.rollNumber && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Roll Number</span>
                            <p className="text-gray-900">{user.rollNumber}</p>
                          </div>
                        )}
                        {user.specialization && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Specialization</span>
                            <p className="text-gray-900">{user.specialization}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Career Aspirations */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-2xl font-bold mb-4">Career Aspirations</h3>
                      <div className="space-y-4">
                        {user.desired_roles?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Desired Roles</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.desired_roles.map((role, idx) => (
                                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.preferred_industries?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Preferred Industries</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.preferred_industries.map((industry, idx) => (
                                <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                  {industry}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {user.higher_studies_interest && (
                            <div>
                              <span className="text-sm font-semibold text-gray-600">Higher Studies Interest</span>
                              <p className="text-gray-900">{user.higher_studies_interest}</p>
                            </div>
                          )}
                          {user.entrepreneurship_interest && (
                            <div>
                              <span className="text-sm font-semibold text-gray-600">Entrepreneurship Interest</span>
                              <p className="text-gray-900">{user.entrepreneurship_interest}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Experience */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-2xl font-bold mb-4">Experience</h3>
                      <div className="space-y-4">
                        {user.projects?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Projects</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.projects.map((project, idx) => (
                                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                                  {project}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.internships?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Internships</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.internships.map((internship, idx) => (
                                <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                                  {internship}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.hackathons?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Hackathons</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.hackathons.map((hackathon, idx) => (
                                <span key={idx} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                                  {hackathon}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.research_papers?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Research Papers</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.research_papers.map((paper, idx) => (
                                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                                  {paper}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mentorship Needs */}
                    {user.mentorship_needs?.length > 0 && (
                      <div className="bg-white rounded-xl p-6 shadow-md">
                        <h3 className="text-2xl font-bold mb-4">Mentorship Needs</h3>
                        <div className="flex flex-wrap gap-2">
                          {user.mentorship_needs.map((need, idx) => (
                            <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                              {need}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preferences */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-2xl font-bold mb-4">Preferences</h3>
                      <div className="space-y-4">
                        {user.preferred_location && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Preferred Location</span>
                            <p className="text-gray-900">{user.preferred_location}</p>
                          </div>
                        )}
                        {user.preferred_mode?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Preferred Communication Mode</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.preferred_mode.map((mode, idx) => (
                                <span key={idx} className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                                  {mode}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {user.role === 'alumni' && (
                  <>
                    {/* Academic Background */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-2xl font-bold mb-4">Academic Background</h3>
                      <div className="space-y-4">
                        {user.specialization && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Specialization</span>
                            <p className="text-gray-900">{user.specialization}</p>
                          </div>
                        )}
                        {user.higher_studies && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Higher Studies</span>
                            <div className="mt-1 space-y-1">
                              {user.higher_studies.degree && <p className="text-gray-900">Degree: {user.higher_studies.degree}</p>}
                              {user.higher_studies.university && <p className="text-gray-900">University: {user.higher_studies.university}</p>}
                              {user.higher_studies.specialization && <p className="text-gray-900">Specialization: {user.higher_studies.specialization}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Career Information */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-2xl font-bold mb-4">Career Information</h3>
                      <div className="space-y-4">
                        {user.current_job_title && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Current Job Title</span>
                            <p className="text-gray-900">{user.current_job_title}</p>
                          </div>
                        )}
                        {user.company && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Company</span>
                            <p className="text-gray-900">{user.company}</p>
                          </div>
                        )}
                        {user.industry && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Industry</span>
                            <p className="text-gray-900">{user.industry}</p>
                          </div>
                        )}
                        {user.past_experience?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Past Experience</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.past_experience.map((exp, idx) => (
                                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                  {exp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mentorship */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-2xl font-bold mb-4">Mentorship</h3>
                      <div className="space-y-4">
                        {user.mentorship_interests?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Mentorship Interests</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.mentorship_interests.map((interest, idx) => (
                                <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.preferred_students?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Preferred Students</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.preferred_students.map((student, idx) => (
                                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                                  {student}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.availability && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Availability</span>
                            <p className="text-gray-900">{user.availability}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Achievements */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-2xl font-bold mb-4">Achievements</h3>
                      <div className="space-y-4">
                        {user.certifications?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Certifications</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.certifications.map((cert, idx) => (
                                <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                  {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.publications?.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Publications</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.publications.map((pub, idx) => (
                                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                                  {pub}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.entrepreneurship && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Entrepreneurship</span>
                            <p className="text-gray-900">{user.entrepreneurship}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Skills Section */}
                {user.skills?.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-md">
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

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Contact */}
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <h3 className="text-xl font-bold mb-4">Contact</h3>
                  <div className="space-y-3">
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
                </div>

                {/* Social Links */}
                {(user.socials && Object.values(user.socials).some(Boolean)) || user.linkedin || user.github || user.website ? (
                  <div className="bg-white rounded-xl p-6 shadow-md">
                    <h3 className="text-xl font-bold mb-4">Social Links</h3>
                    <div className="space-y-2">
                      {user.socials?.linkedin && <a href={user.socials.linkedin} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">LinkedIn</a>}
                      {user.linkedin && <a href={user.linkedin} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">LinkedIn</a>}
                      {user.socials?.github && <a href={user.socials.github} target="_blank" rel="noreferrer" className="block text-gray-800 hover:underline">GitHub</a>}
                      {user.github && <a href={user.github} target="_blank" rel="noreferrer" className="block text-gray-800 hover:underline">GitHub</a>}
                      {user.socials?.twitter && <a href={user.socials.twitter} target="_blank" rel="noreferrer" className="block text-blue-400 hover:underline">Twitter</a>}
                      {user.website && <a href={user.website} target="_blank" rel="noreferrer" className="block text-purple-600 hover:underline">Website</a>}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
