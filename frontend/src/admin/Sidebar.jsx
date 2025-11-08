import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiUsers,
  FiCalendar,
  FiFileText,
  FiMessageSquare,
  FiAlertCircle,
  FiBarChart2,
  FiSettings,
} from 'react-icons/fi';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: FiHome },
    { label: 'Users', path: '/admin/users', icon: FiUsers },
    { label: 'Events', path: '/admin/events', icon: FiCalendar },
    { label: 'Forum', path: '/admin/forum', icon: FiMessageSquare },
    { label: 'Posts', path: '/admin/posts', icon: FiFileText },
    { label: 'Reports', path: '/admin/reports', icon: FiAlertCircle },
    { label: 'Analytics', path: '/admin/analytics', icon: FiBarChart2 },
    { label: 'Settings', path: '/admin/settings', icon: FiSettings },
  ];

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 transform border-r border-slate-700 bg-slate-900 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col overflow-y-auto py-6">
          <div className="mb-6 px-6">
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            <p className="mt-1 text-sm text-slate-400">Manage your platform</p>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon
                    size={20}
                    className={`${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-700 px-6 pt-4">
            <p className="text-xs text-slate-500">Admin Dashboard v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
