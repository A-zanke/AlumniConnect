import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { userAPI, postsAPI, connectionAPI } from '../components/utils/api';
import { toast } from 'react-toastify';
import { getAvatarUrl } from '../utils/helpers';
import './ProfilePage.css';
import { FaUserCheck, FaUserFriends, FaUserPlus } from 'react-icons/fa';

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    company: '',
    position: '',
    college: '',
    specialization: '',
    graduationYear: '',
    isPrivate: false,
    skills: '',
    linkedin: '',
    twitter: '',
    github: '',
    website: '',
  });
  const [connectionStatus, setConnectionStatus] = useState('not_connected');
  const [pendingRequestFromUser, setPendingRequestFromUser] = useState(false);

  // Add backend URL constant
  const BACKEND_URL = 'http://localhost:5000';

  // Determine if this is the current user's profile
  const isOwnProfile = !username || (currentUser && currentUser.username === username);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        let userData;

        if (isOwnProfile) {
          // If own profile, get from context or fetch current user
          userData = currentUser || (await userAPI.getProfile()).data;
        } else {
          // If other user's profile, fetch by username
          const response = await userAPI.getUserByUsername(username);
          userData = response.data;
        }

        setUser(userData);

        // Initialize form data if own profile
        if (isOwnProfile) {
          setFormData({
            name: userData.name || '',
            bio: userData.bio || '',
            company: userData.company || '',
            position: userData.position || '',
            college: userData.college || '',
            specialization: userData.specialization || '',
            graduationYear: userData.graduationYear || '',
            isPrivate: userData.isPrivate || false,
            skills: userData.skills ? userData.skills.join(', ') : '',
            linkedin: userData.socials?.linkedin || '',
            twitter: userData.socials?.twitter || '',
            github: userData.socials?.github || '',
            website: userData.socials?.website || '',
          });
        }

        // Fetch user posts
        const posts = await postsAPI.getUserPosts(userData._id);
        setUserPosts(posts.data);

        // Fetch connection status
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
      // Fetch pending requests for the current user
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
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-section">
            <img
              src={avatar ? URL.createObjectURL(avatar) : getAvatarUrl(user.avatarUrl)}
              alt={user.name}
              className="profile-avatar"
            />
            {isEditing && (
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
            )}
          </div>
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p>@{user.username} • {user.role}</p>
            <p>{user.bio}</p>
            {!isEditing && (
              <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            )}
            {/* Add connection button for other users' profiles */}
            {!isOwnProfile && user && (
              <>
                <button
                  onClick={() => handleConnect(user._id)}
                  className={`btn w-full mt-4 ${
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
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-primary" onClick={handleAcceptRequest}>Accept</button>
                    <button className="btn btn-secondary" onClick={handleRejectRequest}>Remove</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {isEditing ? (
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-form-row">
              <label>Name</label>
              <input name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="profile-form-row">
              <label>Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>Company</label>
              <input name="company" value={formData.company} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>Position</label>
              <input name="position" value={formData.position} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>College/University</label>
              <input name="college" value={formData.college} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>Specialization</label>
              <input name="specialization" value={formData.specialization} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>Graduation Year</label>
              <input name="graduationYear" value={formData.graduationYear} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>Skills (comma separated)</label>
              <input name="skills" value={formData.skills} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>LinkedIn</label>
              <input name="linkedin" value={formData.linkedin} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>Twitter</label>
              <input name="twitter" value={formData.twitter} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>GitHub</label>
              <input name="github" value={formData.github} onChange={handleChange} />
            </div>
            <div className="profile-form-row">
              <label>Website</label>
              <input name="website" value={formData.website} onChange={handleChange} />
            </div>
            <div className="profile-form-actions">
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        ) : (
          <div className="profile-details">
            <div><strong>Company:</strong> {user.company}</div>
            <div><strong>Position:</strong> {user.position}</div>
            <div><strong>College:</strong> {user.college}</div>
            <div><strong>Specialization:</strong> {user.specialization}</div>
            <div><strong>Graduation Year:</strong> {user.graduationYear}</div>
            <div><strong>Skills:</strong> {user.skills && user.skills.join(', ')}</div>
            <div><strong>LinkedIn:</strong> <a href={user.socials?.linkedin} target="_blank" rel="noopener noreferrer">{user.socials?.linkedin}</a></div>
            <div><strong>Twitter:</strong> <a href={user.socials?.twitter} target="_blank" rel="noopener noreferrer">{user.socials?.twitter}</a></div>
            <div><strong>GitHub:</strong> <a href={user.socials?.github} target="_blank" rel="noopener noreferrer">{user.socials?.github}</a></div>
            <div><strong>Website:</strong> <a href={user.socials?.website} target="_blank" rel="noopener noreferrer">{user.socials?.website}</a></div>
          </div>
        )}
      </div>
      
      {/* User posts section - add this when you implement posts */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900">Posts</h2>
        {userPosts.length === 0 ? (
          <p className="mt-4 text-gray-600">No posts yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6">
            {/* Map through userPosts and render them */}
            {userPosts.map((post) => (
              <div key={post._id} className="bg-white p-6 rounded-lg shadow-md">
                <p>{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;