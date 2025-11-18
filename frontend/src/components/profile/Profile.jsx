import React, { useState, useEffect } from 'react';
import EducationSection from './EducationSection';
import './Profile.css';

const Profile = ({ user }) => {
  // Remove formData state since we'll handle it differently for each role
  const isAlumni = String(user?.role || '').toLowerCase() === 'alumni';

  return (
    <div className="profile-content">
      {/* Only render education section for non-alumni */}
      {!isAlumni && (
        <EducationSection
          user={user}
          department={user?.department}
          graduationYear={user?.graduationYear}
          readonly={true} // Force readonly for education fields
        />
      )}
      {/* ...other sections... */}
    </div>
  );
};

export default Profile;