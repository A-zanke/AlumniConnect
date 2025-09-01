import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { userAPI, postsAPI, connectionAPI } from '../components/utils/api';
import { toast } from 'react-toastify';
import { getAvatarUrl } from '../utils/helpers';
import './ProfilePage.css';
import { 
  FaUserCheck, 
  FaUserFriends, 
  FaUserPlus, 
  FaEdit, 
  FaLinkedin, 
  FaTwitter, 
  FaGithub, 
  FaGlobe, 
  FaBriefcase, 
  FaGraduationCap, 
  FaStar,
  FaMapMarkerAlt,
  FaBuilding,
  FaCalendarAlt
} from 'react-icons/fa';

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    company: '',
    position: '',
    college: '',
    specialization: '',
    graduationYear: '',
    location: '',
    isPrivate: false,
    skills: '',
    linkedin: '',
    twitter: '',
    github: '',
    website: '',
  });
  const [connectionStatus, setConnectionStatus] = useState('not_connected');
  const [pendingRequestFromUser, setPendingRequestFromUser] = useState(false);

  // Determine if this is the current user's profile
  const isOwnProfile = !username || (currentUser && currentUser.username === username);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        let userData;

        if (isOwnProfile) {
          userData = currentUser || (await userAPI.getProfile()).data;
        } else {
          const response = await userAPI.getUserByUsername(username);
          userData = response.data;
        }

        setUser(userData);

        if (isOwnProfile) {
          setFormData({
            name: userData.name || '',
            bio: userData.bio || '',
            company: userData.company || '',
            position: userData.position || '',
            college: userData.college || '',
            specialization: userData.specialization || '',
            graduationYear: userData.graduationYear || '',
            location: userData.location || '',
            isPrivate: userData.isPrivate || false,
            skills: userData.skills ? userData.skills.join(', ') : '',
            linkedin: userData.socials?.linkedin || '',
            twitter: userData.socials?.twitter || '',
            github: userData.socials?.github || '',
            website: userData.socials?.website || '',
          });
        }

        const posts = await postsAPI.getUserPosts(userData._id);
        setUserPosts(posts.data);

        if (!isOwnProfile && userData) {
          const res = await connectionAPI.getConnectionStatus(userData._id);
          setConnectionStatus(res.status);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, isOwnProfile, username]);

  useEffect(() => {
    if (!isOwnProfile && user) {
      const fetchPending = async () => {
        try {
          const res = await connectionAPI.getPendingRequests();
          setPendingRequestFromUser(res.data.some(req => req.requesterId === user._id));
        } catch (err) {
          setPendingRequestFromUser(false);
        }
      };
      fetchPending();
    }
  }, [isOwnProfile, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  const handleCoverPhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCoverPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedData = {
      ...formData,
      skills: formData.skills.split(',').map((s) => s.trim()),
      socials: {
        linkedin: formData.linkedin,
        twitter: formData.twitter,
        github: formData.github,
        website: formData.website,
      },
    };
    await updateProfile(updatedData, avatar);
    setIsEditing(false);
  };

  const handleConnect = async (userId) => {
    try {
      await connectionAPI.sendRequest(userId);
      toast.success('Connection request sent!');
      setConnectionStatus('pending');
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    }
  };

  const handleAcceptRequest = async () => {
    try {
      await connectionAPI.acceptFollowRequest(user._id);
      toast.success('Connection request accepted!');
      setPendingRequestFromUser(false);
      setConnectionStatus('connected');
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async () => {
    try {
      await connectionAPI.rejectFollowRequest(user._id);
      toast.info('Connection request removed.');
      setPendingRequestFromUser(false);
      setConnectionStatus('not_connected');
    } catch (error) {
      toast.error('Failed to remove request');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">User not found</h1>
          <p className="mt-4">The user you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="relative overflow-hidden rounded-2xl theme-card mb-6 float-in">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-purple-50" />
        <div className="relative p-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full skeleton" />
          <div>
            <h1 className="text-2xl font-extrabold gradient-text">Your Profile</h1>
            <p className="text-gray-600">Showcase your journey and connect</p>
          </div>
        </div>
      </div>
      {/* Cover Photo Section */}
      <div className="cover-photo-section">
        <div className="cover-photo">
          <div className="cover-photo-overlay">
            {isEditing && (
              <div className="cover-photo-edit">
                <label htmlFor="cover-photo-input" className="cover-photo-edit-btn">
                  <FaEdit /> Change Cover Photo
                </label>
                <input
                  id="cover-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverPhotoChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="profile-header-section">
        <div className="profile-header-content">
          <div className="profile-avatar-container">
            <img
              src={avatar ? URL.createObjectURL(avatar) : getAvatarUrl(user.avatarUrl)}
              alt={user.name}
              className="profile-avatar"
            />
            {isEditing && (
              <div className="avatar-edit-overlay">
                <label htmlFor="avatar-input" className="avatar-edit-btn">
                  <FaEdit />
                </label>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>
          
          <div className="profile-header-info">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-headline">{user.position} at {user.company}</p>
            <p className="profile-location">
              <FaMapMarkerAlt className="inline mr-2" />
              {user.location || 'Location not specified'}
            </p>
            <p className="profile-username">@{user.username}</p>
            
            {!isEditing && (
              <div className="profile-actions">
                {isOwnProfile ? (
                  <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                    <FaEdit className="mr-2" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="connection-actions">
                    <button
                      onClick={() => handleConnect(user._id)}
                      className={`btn ${
                        connectionStatus === 'pending'
                          ? 'btn-secondary'
                          : connectionStatus === 'connected'
                          ? 'btn-success'
                          : 'btn-primary'
                      }`}
                      disabled={connectionStatus === 'pending' || connectionStatus === 'connected' || pendingRequestFromUser}
                    >
                      {connectionStatus === 'pending' ? (
                        <>
                          <FaUserCheck className="mr-2" />
                          Requested
                        </>
                      ) : connectionStatus === 'connected' ? (
                        <>
                          <FaUserFriends className="mr-2" />
                          Connected
                        </>
                      ) : (
                        <>
                          <FaUserPlus className="mr-2" />
                          Connect
                        </>
                      )}
                    </button>
                    {pendingRequestFromUser && (
                      <div className="pending-actions">
                        <button className="btn btn-primary" onClick={handleAcceptRequest}>
                          Accept
                        </button>
                        <button className="btn btn-outline" onClick={handleRejectRequest}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-content">
        <div className="profile-main">
          {/* About Section */}
          <div className="profile-section">
            <h2 className="section-title">About</h2>
            {isEditing ? (
              <div className="form-group">
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  className="form-textarea"
                  rows="4"
                />
              </div>
            ) : (
              <p className="section-content">{user.bio || 'No bio available.'}</p>
            )}
          </div>

          {/* Experience Section */}
          <div className="profile-section">
            <h2 className="section-title">
              <FaBriefcase className="inline mr-3" />
              Experience
            </h2>
            {isEditing ? (
              <div className="form-row">
                <div className="form-group">
                  <label>Company</label>
                  <input
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Company name"
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Job title"
                  />
                </div>
              </div>
            ) : (
              <div className="experience-item">
                <div className="experience-icon">
                  <FaBuilding />
                </div>
                <div className="experience-content">
                  <h3 className="experience-title">{user.position || 'Position not specified'}</h3>
                  <p className="experience-company">{user.company || 'Company not specified'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Education Section */}
          <div className="profile-section">
            <h2 className="section-title">
              <FaGraduationCap className="inline mr-3" />
              Education
            </h2>
            {isEditing ? (
              <div className="form-row">
                <div className="form-group">
                  <label>College/University</label>
                  <input
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Institution name"
                  />
                </div>
                <div className="form-group">
                  <label>Specialization</label>
                  <input
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Field of study"
                  />
                </div>
                <div className="form-group">
                  <label>Graduation Year</label>
                  <input
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Year"
                  />
                </div>
              </div>
            ) : (
              <div className="education-item">
                <div className="education-icon">
                  <FaGraduationCap />
                </div>
                <div className="education-content">
                  <h3 className="education-title">{user.specialization || 'Field not specified'}</h3>
                  <p className="education-institution">{user.college || 'Institution not specified'}</p>
                  {user.graduationYear && (
                    <p className="education-year">
                      <FaCalendarAlt className="inline mr-2" />
                      {user.graduationYear}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Skills Section */}
          <div className="profile-section">
            <h2 className="section-title">
              <FaStar className="inline mr-3" />
              Skills
            </h2>
            {isEditing ? (
              <div className="form-group">
                <input
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Skills (comma separated)"
                />
              </div>
            ) : (
              <div className="skills-container">
                {user.skills && user.skills.length > 0 ? (
                  user.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill.trim()}
                    </span>
                  ))
                ) : (
                  <p className="section-content">No skills listed.</p>
                )}
              </div>
            )}
          </div>

          {/* Social Links Section */}
          <div className="profile-section">
            <h2 className="section-title">Social Links</h2>
            {isEditing ? (
              <div className="form-row">
                <div className="form-group">
                  <label>LinkedIn</label>
                  <input
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="LinkedIn profile URL"
                  />
                </div>
                <div className="form-group">
                  <label>Twitter</label>
                  <input
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Twitter profile URL"
                  />
                </div>
                <div className="form-group">
                  <label>GitHub</label>
                  <input
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="GitHub profile URL"
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Personal website URL"
                  />
                </div>
              </div>
            ) : (
              <div className="social-links">
                {user.socials?.linkedin && (
                  <a href={user.socials.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                    <FaLinkedin />
                    <span>LinkedIn</span>
                  </a>
                )}
                {user.socials?.twitter && (
                  <a href={user.socials.twitter} target="_blank" rel="noopener noreferrer" className="social-link twitter">
                    <FaTwitter />
                    <span>Twitter</span>
                  </a>
                )}
                {user.socials?.github && (
                  <a href={user.socials.github} target="_blank" rel="noopener noreferrer" className="social-link github">
                    <FaGithub />
                    <span>GitHub</span>
                  </a>
                )}
                {user.socials?.website && (
                  <a href={user.socials.website} target="_blank" rel="noopener noreferrer" className="social-link website">
                    <FaGlobe />
                    <span>Website</span>
                  </a>
                )}
                {!user.socials?.linkedin && !user.socials?.twitter && !user.socials?.github && !user.socials?.website && (
                  <p className="section-content">No social links available.</p>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="form-actions">
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" onClick={handleSubmit} className="btn btn-primary">
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="profile-sidebar">
          {/* Connection Stats */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Profile Info</h3>
            <div className="sidebar-content">
              <div className="info-item">
                <span className="info-label">Role:</span>
                <span className="info-value">{user.role}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Member since:</span>
                <span className="info-value">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Posts */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Recent Posts</h3>
            <div className="sidebar-content">
              {userPosts.length === 0 ? (
                <p className="text-gray-500 text-sm">No posts yet.</p>
              ) : (
                <div className="recent-posts">
                  {userPosts.slice(0, 3).map((post) => (
                    <div key={post._id} className="recent-post">
                      <p className="post-preview">{post.content.substring(0, 100)}...</p>
                      <span className="post-date">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;