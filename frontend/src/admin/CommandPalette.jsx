import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes } from 'react-icons/fa';

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const commands = [
    { label: 'Dashboard', path: '/admin', keywords: 'home overview stats' },
    { label: 'Users', path: '/admin/users', keywords: 'people accounts' },
    { label: 'Posts', path: '/admin/posts', keywords: 'content articles' },
    { label: 'Forum', path: '/admin/forum', keywords: 'discussion threads' },
    { label: 'Events', path: '/admin/events', keywords: 'calendar schedule' },
    { label: 'Reports', path: '/admin/reports', keywords: 'issues flags moderation' },
    { label: 'Testimonials', path: '/admin/testimonials', keywords: 'reviews feedback' },
    { label: 'Settings', path: '/admin/settings', keywords: 'config preferences' },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.keywords.includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (path) => {
    navigate(path);
    setOpen(false);
    setSearch('');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
              <FaSearch className="text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commands..."
                className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                autoFocus
              />
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <FaTimes className="text-gray-400" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto p-2">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(cmd.path)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{cmd.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{cmd.path}</div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No commands found
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              <span>Type to search</span>
              <span>ESC to close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
