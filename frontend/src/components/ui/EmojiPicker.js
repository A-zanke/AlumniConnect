import React from 'react';
import { motion } from 'framer-motion';

const EMOJI_CATEGORIES = {
  faces: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  gestures: ['👍', '👎', '👌', '🤞', '✌️', '🤟', '🤘', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🦶', '🦵'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  objects: ['💻', '📱', '⌚', '📷', '📹', '🎮', '🕹️', '🎧', '🎤', '🎬', '📺', '📻', '☎️', '📞', '📟', '📠', '🔋', '🔌', '💡', '🔦', '🕯️', '🗑️', '🛒', '💎', '⚖️', '🔧', '🔨', '⚒️', '🛠️', '⛏️'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷']
};

const EmojiPicker = ({ onEmojiSelect }) => {
  const [activeCategory, setActiveCategory] = React.useState('faces');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-80"
    >
      {/* Category Tabs */}
      <div className="flex gap-1 mb-3 border-b pb-2">
        {Object.keys(EMOJI_CATEGORIES).map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
              activeCategory === category 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'hover:bg-gray-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
          <motion.button
            key={`${activeCategory}-${index}`}
            onClick={() => onEmojiSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-lg"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default EmojiPicker;