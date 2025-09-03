const express = require('express');
const router = express.Router();

// Generate dynamic avatar colors (same logic as frontend)
const generateAvatarColor = (name) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85CBCC', '#D7BDE2',
    '#A3E4D7', '#FAD7A0', '#AED6F1', '#ABEBC6', '#F9E79F'
  ];
  
  let hash = 0;
  const cleanName = (name || 'User').toLowerCase().trim();
  
  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

// Generate dynamic SVG avatar
router.get('/avatar/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name || 'User');
    const size = parseInt(req.query.size) || 100;
    const initial = name.trim().charAt(0).toUpperCase();
    const backgroundColor = generateAvatarColor(name);
    
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${backgroundColor}"/>
        <text 
          x="50%" 
          y="50%" 
          dominant-baseline="middle" 
          text-anchor="middle" 
          fill="white" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="${size * 0.4}" 
          font-weight="600"
        >
          ${initial}
        </text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(svg);
    
  } catch (error) {
    console.error('Error generating avatar:', error);
    res.status(500).send('Error generating avatar');
  }
});

module.exports = router;