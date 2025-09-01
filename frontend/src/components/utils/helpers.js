const BACKEND_URL = 'http://localhost:5000';

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;            // let Avatar component show default
  if (/^https?:\/\//i.test(avatarPath)) {  // already absolute
    return avatarPath;
  }
  if (avatarPath.startsWith('/uploads')) {
    return `${BACKEND_URL}${avatarPath}`;
  }
  return avatarPath;
};