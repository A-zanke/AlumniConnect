import React from 'react';
import { getAvatarUrl, generateAvatarColor } from '../utils/helpers';

const Avatar = ({ name = '', avatarUrl, size = 40, style = {} }) => {
  let src = null;
  if (avatarUrl) {
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      src = avatarUrl;
    } else {
      src = getAvatarUrl(avatarUrl);
    }
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const backgroundColor = generateAvatarColor(name || 'User');
  
  const box = {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    backgroundColor: src ? 'transparent' : '#f3f4f6',
    ...style
  };

  return (
    <img
      src={src || '/default-avatar.png'}
      alt={name}
      style={box}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/default-avatar.png';
      }}
      title={name}
    />
  );
};

export default Avatar;
