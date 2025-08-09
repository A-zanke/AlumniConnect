const BACKEND_URL = 'http://localhost:5000';

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return '/default-avatar.png';
  if (avatarPath.startsWith('/uploads')) {
    return `${BACKEND_URL}${avatarPath}`;
  }
  return avatarPath;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}; 