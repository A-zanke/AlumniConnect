import React from 'react';
import { FiMenu, FiBell, FiSearch, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Topbar = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <FiMenu size={24} />
          </button>

          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="hidden text-lg font-bold text-white sm:block">
              AlumniConnect Admin
            </span>
          </Link>
        </div>

        {/* Center Section - Search */}
        <div className="hidden flex-1 max-w-xl px-8 md:block">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search users, events, posts..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <FiBell size={20} />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <FiUser size={20} />
            <span className="hidden text-sm font-medium sm:block">
              {user?.name || 'Admin'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
