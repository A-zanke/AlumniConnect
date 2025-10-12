const BACKEND_URL = 'http://localhost:5000';

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath || typeof avatarPath !== 'string') return null;            // let Avatar component show default
  if (/^https?:\/\//i.test(avatarPath)) {  // already absolute
    return avatarPath;
  }
  if (avatarPath.startsWith('/uploads')) {
    return `${BACKEND_URL}${avatarPath}`;
  }
  return avatarPath;
};

// Get dynamic avatar URL for fallback (optional)
export const getDynamicAvatarUrl = (name, size = 100) => {
  if (!name) return null;
  const encodedName = encodeURIComponent(name);
  return `${BACKEND_URL}/api/avatar/${encodedName}?size=${size}`;
};

// Generate dynamic avatar colors like WhatsApp/Instagram
export const generateAvatarColor = (name) => {
  // Beautiful color palette inspired by modern apps
  const colors = [
    '#FF6B6B', // Coral Red
    '#4ECDC4', // Turquoise
    '#45B7D1', // Sky Blue
    '#96CEB4', // Mint Green
    '#FFEAA7', // Warm Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Banana Yellow
    '#BB8FCE', // Lavender
    '#85C1E9', // Light Blue
    '#F8C471', // Peach
    '#82E0AA', // Light Green
    '#F1948A', // Salmon
    '#85CBCC', // Teal
    '#D7BDE2', // Light Purple
    '#A3E4D7', // Aqua
    '#FAD7A0', // Light Orange
    '#AED6F1', // Powder Blue
    '#ABEBC6', // Pale Green
    '#F9E79F'  // Pale Yellow
  ];
  
  // Create a hash from the name for consistent colors
  let hash = 0;
  const cleanName = (name || 'User').toLowerCase().trim();
  
  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get color index
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};