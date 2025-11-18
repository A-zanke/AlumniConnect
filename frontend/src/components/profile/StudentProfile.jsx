import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_PROFILE_IMAGE } from '../../constants/images';

const StudentProfile = ({ user, onUpdateProfile }) => {
  const [profileImage, setProfileImage] = useState(user?.avatarUrl || DEFAULT_PROFILE_IMAGE);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setProfileImage(user?.avatarUrl || DEFAULT_PROFILE_IMAGE);
  }, [user?.avatarUrl]);

  const handleRemoveProfilePicture = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/remove-avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setProfileImage(DEFAULT_PROFILE_IMAGE);
        if (onUpdateProfile) {
          onUpdateProfile({ ...user, avatarUrl: null });
        }
      } else {
        console.error('Failed to remove profile picture');
      }
    } catch (error) {
      console.error('Error removing profile picture:', error);
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

      <div className="profile-content">
        <div className="about-section">
          {/* Basic Information */}
          <div className="info-box">
            <h3>Basic Information</h3>
            {/* ... basic info content ... */}
          </div>

          {/* Academic Information */}
          <div className="info-box">
            <h3>Academic Information</h3>
            {/* ... academic info content ... */}
          </div>

          {/* Skills & Interests */}
          <div className="info-box">
            <h3>Skills & Interests</h3>
            {/* ... skills content ... */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;