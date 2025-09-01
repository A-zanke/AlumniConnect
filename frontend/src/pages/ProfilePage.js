import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { userAPI, postsAPI, connectionAPI } from '../components/utils/api';
import { toast } from 'react-toastify';
import { getAvatarUrl } from '../components/utils/helpers';
import {
  FaUserCheck, FaUserFriends, FaUserPlus, FaEdit, FaLinkedin, FaTwitter, FaGithub,
  FaGlobe, FaBriefcase, FaGraduationCap, FaStar, FaMapMarkerAlt, FaBuilding, FaCalendarAlt, FaComments
} from 'react-icons/fa';

const PlaceholderAvatar = ({ name = '', size = 96, fontSize = 36 }) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const bg = 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)';
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'white', fontWeight: 800,
        fontSize, boxShadow: '0 10px 30px rgba(59,130,246,.25)'
      }}
      aria-label="default avatar"
    >
      {initial}
    </div>
  );
};

const ProfilePage = () => {
  const { username, userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, updateProfile } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(null);

  const [formData, setFormData] = useState({
    name: '', bio: '', company: '', position: '', college: '', specialization: '',
    graduationYear: '', location: '', isPrivate: false, skills: '',
    linkedin: '', twitter: '', github: '', website: '',
  });

  const [connectionStatus, setConnectionStatus] = useState('not_connected');
  const [pendingRequestFromUser, setPendingRequestFromUser] = useState(false);

  const isOwnProfile = useMemo(
    () => (!username && !userId) || (authUser && (authUser.username === username || authUser._id === userId)),
    [username, userId, authUser]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let u;
        if (isOwnProfile) {
          u = authUser || (await userAPI.getProfile()).data;
        } else {
          if (username) {
            const res = await userAPI.getUserByUsername(username);
            u = res.data;
          } else if (userId) {
            const res = await userAPI.getUserById(userId);
            u = res.data;
          } else {
            throw new Error('No username or userId provided');
          }
        }
        setUser(u);

        if (isOwnProfile && u) {
          setFormData({
            name: u.name || '',
            bio: u.bio || '',
            company: u.company || '',
            position: u.position || '',
            college: u.college || '',
            specialization: u.specialization || '',
            graduationYear: u.graduationYear || '',
            location: u.location || '',
            isPrivate: u.isPrivate || false,
            skills: Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || ''),
            linkedin: u.socials?.linkedin || '',
            twitter: u.socials?.twitter || '',
            github: u.socials?.github || '',
            website: u.socials?.website || '',
          });
        }

        if (u?._id) {
          const posts = await postsAPI.getUserPosts(u._id);
          setUserPosts(posts.data || []);
        }

        if (!isOwnProfile && u?._id) {
          const statusRes = await connectionAPI.getConnectionStatus(u._id);
          setConnectionStatus(statusRes.status || 'not_connected');
          const pending = await connectionAPI.getPendingRequests();
          setPendingRequestFromUser(pending.data?.some(req => req.requesterId === u._id) || false);
        }
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authUser, isOwnProfile, username, userId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAvatarChange = (file) => setAvatar(file || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedData = {
      ...formData,
      skills: formData.skills
        ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      socials: {
        linkedin: formData.linkedin, twitter: formData.twitter,
        github: formData.github, website: formData.website,
      },
    };
    try {
      await updateProfile(updatedData, avatar);
      toast.success('Profile updated');

      // IMPORTANT: refetch fresh profile to show new avatar immediately
      if (isOwnProfile) {
        const refreshed = await userAPI.getProfile();
        setUser(refreshed.data);
      } else if (username) {
        const refreshed = await userAPI.getUserByUsername(username);
        setUser(refreshed.data);
      } else if (userId) {
        const refreshed = await userAPI.getUserById(userId);
        setUser(refreshed.data);
      }
      setIsEditing(false);
      setAvatar(null);
    } catch {
      toast.error('Update failed');
    }
  };

  const handleConnect = async (userId) => {
    try {
      await connectionAPI.followUser(userId);
      toast.success('Connection request sent!');
      setConnectionStatus('requested');
    } catch (error) {
      console.error('Connection error:', error);
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
      console.error('Accept error:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async () => {
    try {
      await connectionAPI.rejectFollowRequest(user._id);
      toast.info('Connection request removed.');
      setPendingRequestFromUser(false);
      setConnectionStatus('none');
    } catch (error) {
      console.error('Reject error:', error);
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

  const showChat = !isOwnProfile && connectionStatus === 'connected';

  return (
    <div style={{ backgroundColor: '#f3f2ef', minHeight: '100vh' }}>
      <div className="container mx-auto px-4 py-8">
        {/* LinkedIn-style header */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '16px',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <div>
              {user.avatarUrl ? (
                <img
                  src={getAvatarUrl(user.avatarUrl)}
                  alt={user.name}
                  style={{
                    width: 120, height: 120, borderRadius: '50%',
                    objectFit: 'cover', border: '4px solid white',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.15)'
                  }}
                />
              ) : (
                <div style={{
                  width: 120, height: 120, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0a66c2, #004182)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 'bold', fontSize: '48px',
                  border: '4px solid white', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)'
                }}>
                  {(user.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              {isOwnProfile && isEditing && (
                <div style={{ marginTop: 8 }}>
                  <FileInput accept="image/*" onChange={handleAvatarChange} />
                </div>
              )}
            </div>

            {/* Identity */}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontWeight: '400', fontSize: '32px', color: '#000000', margin: '0 0 4px 0' }}>{user.name}</h1>
              <div style={{ color: '#666666', fontSize: '16px', marginBottom: '8px' }}>
                {user.position && user.company ? `${user.position} at ${user.company}` : user.position || user.company || user.role}
              </div>
              <div style={{ color: '#666666', fontSize: '14px', marginBottom: '4px' }}>
                <FaMapMarkerAlt style={{ marginRight: '4px' }} />
                {user.location || 'Location not specified'}
              </div>
              <div style={{ color: '#666666', fontSize: '14px' }}>
                {user.connections?.length || 0} connections
              </div>
            </div>

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditing(prev => !prev)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '24px',
                  border: '1px solid #0a66c2',
                  backgroundColor: isEditing ? '#f3f2ef' : '#0a66c2',
                  color: isEditing ? '#0a66c2' : 'white',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={(e) => {
                  if (!isEditing) {
                    e.target.style.backgroundColor = '#004182';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isEditing) {
                    e.target.style.backgroundColor = '#0a66c2';
                  }
                }}
              >
                <FaEdit size={14} />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            ) : (
              <>
                {showChat && (
                  <button
                    style={{
                      padding: '8px 16px',
                      borderRadius: '24px',
                      border: '1px solid #0a66c2',
                      backgroundColor: 'white',
                      color: '#0a66c2',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={() => navigate('/messages')}
                    title="Open chat"
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#f3f2ef';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'white';
                    }}
                  >
                    <FaComments size={14} />
                    Message
                  </button>
                )}
                <button
                  onClick={() => handleConnect(user._id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '24px',
                    border: connectionStatus === 'connected' ? '1px solid #666666' : '1px solid #0a66c2',
                    backgroundColor: connectionStatus === 'connected' ? 'white' : '#0a66c2',
                    color: connectionStatus === 'connected' ? '#666666' : 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: connectionStatus === 'pending' || connectionStatus === 'connected' || pendingRequestFromUser ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: connectionStatus === 'pending' || connectionStatus === 'connected' || pendingRequestFromUser ? 0.6 : 1
                  }}
                  disabled={
                    connectionStatus === 'pending' ||
                    connectionStatus === 'connected' ||
                    pendingRequestFromUser
                  }
                  onMouseOver={(e) => {
                    if (connectionStatus !== 'pending' && connectionStatus !== 'connected' && !pendingRequestFromUser) {
                      e.target.style.backgroundColor = '#004182';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (connectionStatus !== 'pending' && connectionStatus !== 'connected' && !pendingRequestFromUser) {
                      e.target.style.backgroundColor = '#0a66c2';
                    }
                  }}
                >
                  {connectionStatus === 'pending' ? (
                    <>
                      <FaUserCheck size={14} />
                      Pending
                    </>
                  ) : connectionStatus === 'requested' ? (
                    <>
                      <FaUserCheck size={14} />
                      Requested
                    </>
                  ) : connectionStatus === 'connected' ? (
                    <>
                      <FaUserFriends size={14} />
                      Connected
                    </>
                  ) : (
                    <>
                      <FaUserPlus size={14} />
                      Connect
                    </>
                  )}
                </button>

                {pendingRequestFromUser && (
                  <>
                    <button 
                      style={{
                        padding: '8px 16px',
                        borderRadius: '24px',
                        border: '1px solid #0a66c2',
                        backgroundColor: '#0a66c2',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onClick={handleAcceptRequest}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#004182';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#0a66c2';
                      }}
                    >
                      Accept
                    </button>
                    <button 
                      style={{
                        padding: '8px 16px',
                        borderRadius: '24px',
                        border: '1px solid #666666',
                        backgroundColor: 'white',
                        color: '#666666',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onClick={handleRejectRequest}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#f3f2ef';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'white';
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

        {/* Main content */}
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
          {/* Editable sections */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* About */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' 
            }}>
              <h2 style={{ fontWeight: '600', fontSize: '20px', marginBottom: '16px', color: '#000000' }}>About</h2>
            {isEditing ? (
              <textarea name="bio" value={formData.bio} onChange={handleChange} className="form-textarea" rows="4" placeholder="Tell us about yourself..." />
            ) : (
              <p style={{ color: '#334155' }}>{user.bio || 'No bio available.'}</p>
            )}
          </div>

            {/* Experience */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' 
            }}>
              <h2 style={{ fontWeight: '600', fontSize: '20px', marginBottom: '16px', color: '#000000' }}>
                <FaBriefcase style={{ marginRight: '8px' }} /> Experience
              </h2>
            {isEditing ? (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label>Company</label>
                  <input name="company" value={formData.company} onChange={handleChange} className="form-input" placeholder="Company name" />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input name="position" value={formData.position} onChange={handleChange} className="form-input" placeholder="Job title" />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#22d3ee,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <FaBuilding />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{user.position || 'Position not specified'}</div>
                  <div style={{ color: '#64748b' }}>{user.company || 'Company not specified'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="theme-card float-in" style={{ padding: 16 }}>
            <h2 className="gradient-text" style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              <FaGraduationCap className="inline mr-2" /> Education
            </h2>
            {isEditing ? (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group"><label>College/University</label><input name="college" value={formData.college} onChange={handleChange} className="form-input" /></div>
                <div className="form-group"><label>Specialization</label><input name="specialization" value={formData.specialization} onChange={handleChange} className="form-input" /></div>
                <div className="form-group"><label>Graduation Year</label><input name="graduationYear" value={formData.graduationYear} onChange={handleChange} className="form-input" /></div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700 }}>{user.specialization || 'Field not specified'}</div>
                <div style={{ color: '#64748b' }}>{user.college || 'Institution not specified'}</div>
                {user.graduationYear && (
                  <div style={{ color: '#64748b', marginTop: 6 }}>
                    <FaCalendarAlt className="inline mr-2" /> {user.graduationYear}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="theme-card float-in" style={{ padding: 16 }}>
            <h2 className="gradient-text" style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              <FaStar className="inline mr-2" /> Skills
            </h2>
            {isEditing ? (
              <input name="skills" value={formData.skills} onChange={handleChange} className="form-input" placeholder="Skills (comma separated)" />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {user.skills && user.skills.length > 0 ? (
                  user.skills.map((skill, i) => (
                    <span key={i} style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(6,182,212,.12)', color: '#0e7490', fontWeight: 600, fontSize: 12 }}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <p style={{ color: '#334155' }}>No skills listed.</p>
                )}
              </div>
            )}
          </div>

          {/* Socials */}
          <div className="theme-card float-in" style={{ padding: 16 }}>
            <h2 className="gradient-text" style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Social Links</h2>
            {isEditing ? (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group"><label>LinkedIn</label><input name="linkedin" value={formData.linkedin} onChange={handleChange} className="form-input" /></div>
                <div className="form-group"><label>Twitter</label><input name="twitter" value={formData.twitter} onChange={handleChange} className="form-input" /></div>
                <div className="form-group"><label>GitHub</label><input name="github" value={formData.github} onChange={handleChange} className="form-input" /></div>
                <div className="form-group"><label>Website</label><input name="website" value={formData.website} onChange={handleChange} className="form-input" /></div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {user.socials?.linkedin && <a href={user.socials.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin"><FaLinkedin /> <span style={{ marginLeft: 6 }}>LinkedIn</span></a>}
                {user.socials?.twitter && <a href={user.socials.twitter} target="_blank" rel="noopener noreferrer" className="social-link twitter"><FaTwitter /> <span style={{ marginLeft: 6 }}>Twitter</span></a>}
                {user.socials?.github && <a href={user.socials.github} target="_blank" rel="noopener noreferrer" className="social-link github"><FaGithub /> <span style={{ marginLeft: 6 }}>GitHub</span></a>}
                {user.socials?.website && <a href={user.socials.website} target="_blank" rel="noopener noreferrer" className="social-link website"><FaGlobe /> <span style={{ marginLeft: 6 }}>Website</span></a>}
                {!user.socials?.linkedin && !user.socials?.twitter && !user.socials?.github && !user.socials?.website && (<p style={{ color: '#334155' }}>No social links available.</p>)}
              </div>
            )}
          </div>

          {/* Save/Cancel */}
          {isOwnProfile && isEditing && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }} className="float-in">
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline hover-tilt">Cancel</button>
              <button type="submit" onClick={handleSubmit} className="btn btn-primary hover-tilt">Save Changes</button>
            </div>
          )}
        </div>

          {/* Sidebar */}
          <aside style={{ display: 'grid', gap: '16px' }}>
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' 
            }}>
              <h3 style={{ fontWeight: '600', fontSize: '18px', marginBottom: '16px', color: '#000000' }}>Profile Info</h3>
            <div style={{ color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: '#64748b' }}>Role</span><span style={{ fontWeight: 700 }}>{user.role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: '#64748b' }}>Member since</span><span style={{ fontWeight: 700 }}>{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' 
            }}>
              <h3 style={{ fontWeight: '600', fontSize: '18px', marginBottom: '16px', color: '#000000' }}>Recent Posts</h3>
            {userPosts.length === 0 ? (
              <p style={{ color: '#64748b' }}>No posts yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {userPosts.slice(0, 4).map((post) => (
                  <div key={post._id} className="hover-tilt" style={{ background: 'white', borderRadius: 12, padding: 12, border: '1px solid rgba(6,182,212,.12)' }}>
                    <div style={{ fontWeight: 700, color: '#334155' }}>{post.content.substring(0, 100)}{post.content.length > 100 ? '…' : ''}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>{new Date(post.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;