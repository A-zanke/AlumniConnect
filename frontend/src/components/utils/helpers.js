const BACKEND_URL = process.env.REACT_APP_API_URL || "http://10.183.168.134:5000";

const avatarCache = new Map();

export const getAvatarUrl = (avatarPath) => {
  if (avatarCache.has(avatarPath)) return avatarCache.get(avatarPath);

  if (!avatarPath || typeof avatarPath !== "string") {
    const defaultUrl = "/default-avatar.png";
    avatarCache.set(avatarPath, defaultUrl);
    return defaultUrl;
  }

  if (/^https?:\/\//i.test(avatarPath)) {
    // already absolute
    avatarCache.set(avatarPath, avatarPath);
    return avatarPath;
  }

  if (avatarPath.startsWith("/uploads")) {
    const fullUrl = `${BACKEND_URL}${avatarPath}`;
    avatarCache.set(avatarPath, fullUrl);
    return fullUrl;
  }

  avatarCache.set(avatarPath, avatarPath);
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
    "#FF6B6B", // Coral Red
    "#4ECDC4", // Turquoise
    "#45B7D1", // Sky Blue
    "#96CEB4", // Mint Green
    "#FFEAA7", // Warm Yellow
    "#DDA0DD", // Plum
    "#98D8C8", // Mint
    "#F7DC6F", // Banana Yellow
    "#BB8FCE", // Lavender
    "#85C1E9", // Light Blue
    "#F8C471", // Peach
    "#82E0AA", // Light Green
    "#F1948A", // Salmon
    "#85CBCC", // Teal
    "#D7BDE2", // Light Purple
    "#A3E4D7", // Aqua
    "#FAD7A0", // Light Orange
    "#AED6F1", // Powder Blue
    "#ABEBC6", // Pale Green
    "#F9E79F", // Pale Yellow
  ];

  // Create a hash from the name for consistent colors
  let hash = 0;
  const cleanName = (name || "User").toLowerCase().trim();

  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get color index
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export const truncateText = (text, maxLength, middle = false) => {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxLength) return text;

  if (middle) {
    // Truncate from middle for file names
    const extIndex = text.lastIndexOf(".");
    if (extIndex > 0 && extIndex < text.length - 1) {
      const name = text.slice(0, extIndex);
      const ext = text.slice(extIndex);
      const keepChars = Math.floor((maxLength - 3) / 2); // 3 for '...'
      if (name.length > keepChars * 2) {
        return name.slice(0, keepChars) + "..." + name.slice(-keepChars) + ext;
      }
    }
  }

  // Normal truncation, preserve word boundaries
  let truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    // If space is reasonably close
    truncated = truncated.slice(0, lastSpace);
  }
  return truncated + "...";
};

export const formatReactionPreview = (message, currentUserId) => {
  if (
    !message ||
    !message.reactions ||
    !Array.isArray(message.reactions) ||
    message.deleted
  )
    return null;

  const userReaction = message.reactions.find(
    (r) =>
      r.userId === currentUserId || (r.userId && r.userId._id === currentUserId)
  );

  if (!userReaction) return null;

  const emoji = userReaction.emoji;
  let content = "";

  if (message.attachments && message.attachments.length > 0) {
    const att = message.attachments[0];
    if (att.type && att.type.startsWith("image/")) {
      content = "📷 Photo";
    } else if (att.type && att.type.startsWith("video/")) {
      content = "🎥 Video";
    } else {
      content = "📄 Document";
    }
  } else if (message.content && message.content.trim()) {
    content = `"${truncateText(message.content, 30)}"`;
  } else {
    content = '"Message"';
  }

  return `You reacted ${emoji} to ${content}`;
};
