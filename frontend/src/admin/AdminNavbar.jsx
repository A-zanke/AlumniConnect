import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaChartBar, FaUsers, FaCalendar, FaComments, FaExclamationTriangle, 
  FaStar, FaHome, FaBars, FaTimes, FaSignOutAlt, FaPlus 
} from 'react-icons/fa';

const AdminNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: FaChartBar },
    { path: '/admin/users', label: 'Users', icon: FaUsers },
    { 
      label: 'Content', 
      icon: FaComments,
      dropdown: [
        { path: '/admin/posts', label: 'Posts', icon: FaComments },
        { path: '/admin/forum', label: 'Forum', icon: FaComments },
      ]
    },
    { path: '/admin/events', label: 'Events', icon: FaCalendar },
    { path: '/admin/reports', label: 'Reports', icon: FaExclamationTriangle },
    { path: '/admin/testimonials', label: 'Testimonials', icon: FaStar },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl rounded-2xl mb-6 overflow-hidden"
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <FaHome className="text-2xl" />
              </div>
              <span className="text-2xl font-bold tracking-tight hidden md:block">Admin Panel</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              {navItems.map((item, idx) => (
                item.dropdown ? (
                  <div key={idx} className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDropdownOpen(dropdownOpen === idx ? null : idx)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:bg-white/20 backdrop-blur-sm"
                    >
                      <item.icon className="text-lg" />
                      {item.label}
                      <motion.span 
                        animate={{ rotate: dropdownOpen === idx ? 180 : 0 }}
                        className="text-xs"
                      >
                        ▼
                      </motion.span>
                    </motion.button>
                    
                    <AnimatePresence>
                      {dropdownOpen === idx && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full mt-2 left-0 bg-white text-gray-800 rounded-xl shadow-2xl overflow-hidden min-w-[200px] z-50"
                        >
                          {item.dropdown.map((subItem) => (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              onClick={() => setDropdownOpen(null)}
                              className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                                isActive(subItem.path) 
                                  ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              <subItem.icon />
                              {subItem.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                        isActive(item.path) 
                          ? 'bg-white text-indigo-600 shadow-lg' 
                          : 'hover:bg-white/20 backdrop-blur-sm'
                      }`}
                    >
                      <item.icon className="text-lg" />
                      {item.label}
                    </motion.div>
                  </Link>
                )
              ))}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="ml-4 flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition-all duration-200 shadow-lg"
              >
                <FaSignOutAlt />
                Logout
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/20"
            >
              {mobileOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-white/10 backdrop-blur-lg"
            >
              <div className="px-4 py-2 space-y-1">
                {navItems.map((item, idx) => (
                  item.dropdown ? (
                    <div key={idx}>
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === idx ? null : idx)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg hover:bg-white/20 font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon />
                          {item.label}
                        </div>
                        <motion.span animate={{ rotate: dropdownOpen === idx ? 180 : 0 }}>▼</motion.span>
                      </button>
                      <AnimatePresence>
                        {dropdownOpen === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="ml-4 space-y-1"
                          >
                            {item.dropdown.map((subItem) => (
                              <Link
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => {
                                  setMobileOpen(false);
                                  setDropdownOpen(null);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                                  isActive(subItem.path) ? 'bg-white text-indigo-600' : 'hover:bg-white/20'
                                }`}
                              >
                                <subItem.icon />
                                {subItem.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold ${
                        isActive(item.path) ? 'bg-white text-indigo-600' : 'hover:bg-white/20'
                      }`}
                    >
                      <item.icon />
                      {item.label}
                    </Link>
                  )
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold"
                >
                  <FaSignOutAlt />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
};

export default AdminNavbar;