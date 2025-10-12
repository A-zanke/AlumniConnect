import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaChartBar, FaUsers, FaCalendar, FaComments, FaExclamationTriangle, 
  FaStar, FaNewspaper, FaNetworkWired, FaCog, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: FaChartBar, exact: true },
    { path: '/admin/users', label: 'Users', icon: FaUsers },
    { path: '/admin/posts', label: 'Posts', icon: FaNewspaper },
    { path: '/admin/forum', label: 'Forum', icon: FaComments },
    { path: '/admin/events', label: 'Events', icon: FaCalendar },
    { path: '/admin/network', label: 'Network', icon: FaNetworkWired },
    { path: '/admin/reports', label: 'Reports', icon: FaExclamationTriangle },
    { path: '/admin/testimonials', label: 'Testimonials', icon: FaStar },
    { path: '/admin/settings', label: 'Settings', icon: FaCog },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside 
      className={`fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
      >
        {collapsed ? <FaChevronRight className="text-xs" /> : <FaChevronLeft className="text-xs" />}
      </button>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path, item.exact);
          
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  active 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <item.icon className={`text-lg flex-shrink-0 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                
                {!collapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;