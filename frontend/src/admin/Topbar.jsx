import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaMoon, FaSun, FaBell, FaUser, FaCog, FaKeyboard, FaSignOutAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const Topbar = () => {
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Left: Logo */}
      <Link to="/admin" className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl">
          <span className="text-white font-bold text-sm">AC</span>
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Admin
        </span>
      </Link>

      {/* Center: Search */}
      <div className="hidden md:flex items-center flex-1 max-w-xl mx-8">
        <div className="relative w-full">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search... (Ctrl+K)"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            onFocus={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <FaMoon className="text-gray-600" /> : <FaSun className="text-yellow-400" />}
        </motion.button>

        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
          >
            <FaBell className="text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </motion.button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No new notifications
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FaUser className="text-white text-sm" />
            </div>
          </motion.button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <Link to="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <FaUser className="text-gray-600 dark:text-gray-300" />
                  <span className="text-gray-900 dark:text-white">Profile</span>
                </Link>
                <Link to="/admin/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <FaCog className="text-gray-600 dark:text-gray-300" />
                  <span className="text-gray-900 dark:text-white">Settings</span>
                </Link>
                <button className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full">
                  <FaKeyboard className="text-gray-600 dark:text-gray-300" />
                  <span className="text-gray-900 dark:text-white">Shortcuts</span>
                </button>
                <hr className="border-gray-200 dark:border-gray-700" />
                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-red-600 dark:text-red-400">
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
