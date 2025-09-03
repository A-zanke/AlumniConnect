import React from 'react';
import { getAvatarUrl, generateAvatarColor } from '../utils/helpers';

const Avatar = ({ name = '', avatarUrl, size = 40, style = {} }) => {
  const src = avatarUrl ? getAvatarUrl(avatarUrl) : null;
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const backgroundColor = generateAvatarColor(name || 'User');
  
  const box = {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    ...style
  };

  if (src) {
    return <img src={src} alt={name} style={box} />;
  }

  return (
    <div
      style={{
        ...box,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.4,
        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}
      aria-label="default avatar"
      title={name}
    >
      {initial}
    </div>
  );
};

export default Avatar;
