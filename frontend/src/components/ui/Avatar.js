import React from 'react';
import { getAvatarUrl } from '../utils/helpers';

const Avatar = ({ name = '', avatarUrl, size = 40, style = {} }) => {
  const src = avatarUrl ? getAvatarUrl(avatarUrl) : null;
  const initial = (name || '?').trim().charAt(0).toUpperCase();
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
        background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)',
        color: '#fff',
        fontWeight: 800
      }}
      aria-label="default avatar"
      title={name}
    >
      {initial}
    </div>
  );
};

export default Avatar;
