import React from 'react';
import { motion } from 'framer-motion';

const items = [
  { icon: '✅', text: 'Be respectful and professional.' },
  { icon: '🚫', text: 'No spam, harassment, or solicitation.' },
  { icon: '🏷️', text: 'Use tags and categories for clarity.' },
  { icon: '📢', text: 'Use @mentions to notify relevant peers.' }
];

const Guidelines = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className="mb-6 p-5 rounded-2xl border shadow bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
  >
    <div className="font-semibold text-lg">Forum Guidelines</div>
    <ul className="mt-3 grid sm:grid-cols-2 gap-2">
      {items.map((g, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="text-xl">{g.icon}</span>
          <span className="text-sm/6">{g.text}</span>
        </li>
      ))}
    </ul>
  </motion.div>
);

export default Guidelines;