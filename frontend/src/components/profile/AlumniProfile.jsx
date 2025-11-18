import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { DEFAULT_PROFILE_IMAGE } from '../../constants/images';

const AlumniProfile = ({ user, onUpdateProfile }) => {
  const [profileImage, setProfileImage] = useState(user?.avatarUrl || DEFAULT_PROFILE_IMAGE);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setProfileImage(user?.avatarUrl || DEFAULT_PROFILE_IMAGE);
  }, [user?.avatarUrl]);

  const handleRemoveProfilePicture = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.delete('/api/users/remove-avatar', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setProfileImage(DEFAULT_PROFILE_IMAGE);
        // Update parent component
        if (onUpdateProfile) {
          onUpdateProfile({
            ...user,
            avatarUrl: null
          });
        }
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Failed to remove profile picture:', error);
      alert('Failed to remove profile picture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, onUpdateProfile]);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-image-container">
          <img
            src={profileImage}
            alt="Profile"
            className="profile-picture"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_PROFILE_IMAGE;
            }}
          />
          <button
            onClick={handleRemoveProfilePicture}
            disabled={isLoading}
            className="btn btn-danger remove-photo-btn"
          >
            {isLoading ? 'Removing...' : 'Remove Profile Picture'}
          </button>
        </div>
      </div>
      {/* ... rest of the component ... */}
    </div>
  );
};

export default AlumniProfile;