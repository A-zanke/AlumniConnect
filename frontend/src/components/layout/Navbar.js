import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiX, FiBell, FiMessageSquare, FiUser, FiLogOut, FiSearch } from 'react-icons/fi';
import NotificationBell from '../NotificationBell';


const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleDropdown = () => setShowDropdown(!showDropdown);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="relative z-50">
      {/* Animated gradient bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-gradient-x" />
      <div className="backdrop-blur-lg bg-white/80 border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <span className="text-2xl font-extrabold bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-transparent bg-clip-text tracking-tight drop-shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:brightness-125 animate-logo-shine">
                  AlumniConnect
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <NavLinkA to="/" label="Home" />
              <NavLinkA to="/events" label="Events" />
              <NavLinkA to="/about" label="About" />
              <NavLinkA to="/forum" label="Forum" />
              {user && <NavLinkA to="/network" label="Network" />}
              {user && (user.role || '').toLowerCase() === 'admin' && <NavLinkA to="/admin" label="Admin" />}
              <button
                onClick={() => navigate('/search')}
                className="ml-2 p-2 rounded-full hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                aria-label="Search"
                title="Search"
              >
                <FiSearch size={22} className="text-cyan-600" />
              </button>
              {user ? (
                <>
                  <Link to="/messages" className="p-2 rounded-full text-gray-700 hover:text-cyan-600 relative">
                    <FiMessageSquare size={20} />
                  </Link>
                  <NotificationBell />
                  <div className="relative ml-3">
                    <button
                      onClick={toggleDropdown}
                      type="button"
                      className="flex text-sm rounded-full focus:outline-none border-2 border-cyan-200 hover:border-cyan-400 transition"
                      id="user-menu"
                      aria-expanded="false"
                      aria-haspopup="true"
                    >
                      <span className="sr-only">Open user menu</span>
                      {user.avatarUrl ? (
                        <img
                          className="h-9 w-9 rounded-full object-cover border border-cyan-200 shadow"
                          src={user.avatarUrl}
                          alt={user.name}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold text-lg">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className={`origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-2 bg-white/90 ring-1 ring-cyan-200 ring-opacity-50 focus:outline-none transition-all duration-200 ${showDropdown ? 'opacity-100 scale-100 pointer-events-auto animate-fade-in' : 'opacity-0 scale-95 pointer-events-none'}`}
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu"
                    >
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 rounded-lg transition"
                        role="menuitem"
                        onClick={() => setShowDropdown(false)}
                      >
                        <FiUser className="mr-2" /> Your Profile
                      </Link>
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 rounded-lg transition"
                        role="menuitem"
                      >
                        <FiLogOut className="mr-2" /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="login-btn">Login</Link>
                  <Link to="/register" className="register-btn">Register</Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-cyan-600 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden animate-slide-down bg-white/95 border-b border-cyan-100" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <NavLinkA to="/" label="Home" onClick={toggleMenu} mobile />
              <NavLinkA to="/events" label="Events" onClick={toggleMenu} mobile />
              <NavLinkA to="/about" label="About" onClick={toggleMenu} mobile />
              <NavLinkA to="/forum" label="Forum" onClick={toggleMenu} mobile />
              {user && <NavLinkA to="/network" label="Network" onClick={toggleMenu} mobile />}
              {user && (user.role || '').toLowerCase() === 'admin' && <NavLinkA to="/admin" label="Admin" onClick={toggleMenu} mobile />}
              <NavLinkA to="/search" label="Search" onClick={toggleMenu} mobile />
            </div>
            {user ? (
              <div className="pt-4 pb-3 border-t border-cyan-100">
                <div className="flex items-center px-5">
                  <div className="flex-shrink-0">
                    {user.avatarUrl ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover border border-cyan-200"
                        src={user.avatarUrl}
                        alt={user.name}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm font-medium text-gray-500">{user.role}</div>
                  </div>
                </div>
                <Link to="/profile" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-cyan-600" onClick={toggleMenu}>Your Profile</Link>
                <Link to="/messages" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-cyan-600" onClick={toggleMenu}>Messages</Link>
                <button
                  onClick={() => {
                    toggleMenu();
                    handleLogout();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-cyan-600"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-3 px-2 space-y-1 flex flex-col">
                <Link to="/login" className="block px-3 py-2 rounded-md text-base font-medium text-cyan-600 border border-cyan-400 bg-white hover:bg-cyan-50" onClick={toggleMenu}>Login</Link>
                <Link to="/register" className="block px-3 py-2 rounded-md text-base font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700" onClick={toggleMenu}>Register</Link>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        .nav-link, .mobile-nav-link {
          position: relative;
          display: inline-block;
          padding: 0.5rem 1rem;
          font-size: 1rem;
          font-weight: 500;
          color: #1e293b;
          border-radius: 0.5rem;
          transition: color 0.2s;
        }
        .nav-link:after, .mobile-nav-link:after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 0.2rem;
          transform: translateX(-50%) scaleX(0);
          width: 80%;
          height: 2px;
          background: linear-gradient(90deg, #06b6d4, #6366f1, #a78bfa);
          border-radius: 2px;
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .nav-link:hover:after, .mobile-nav-link:hover:after {
          transform: translateX(-50%) scaleX(1);
        }
        .nav-link:hover, .mobile-nav-link:hover {
          color: #06b6d4;
        }
        .login-btn {
          @apply px-4 py-2 border-2 border-cyan-500 rounded-lg text-cyan-600 font-semibold hover:bg-cyan-50 transition;
        }
        .register-btn {
          @apply px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow hover:from-cyan-600 hover:to-blue-700 transition;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slideDown 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-logo-shine {
          background-size: 200% 100%;
          animation: logoShine 2.5s linear infinite;
        }
        @keyframes logoShine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-gradient-x {
          background-size: 200% 100%;
          animation: gradientX 4s linear infinite;
        }
        @keyframes gradientX {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </nav>
  );
};

// Animated NavLink with underline
function NavLinkA({ to, label, onClick, mobile }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={mobile ? 'mobile-nav-link' : 'nav-link'}
    >
      {label}
    </Link>
  );
}

export default Navbar;