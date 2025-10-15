import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiMenu,
  FiX,
  FiBell,
  FiMessageSquare,
  FiUser,
  FiLogOut,
  FiSearch,
  FiHome,
  FiCalendar,
  FiUsers,
  FiMessageCircle,
  FiFileText,
  FiChevronDown,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "../NotificationBell";
import { getAvatarUrl } from "../utils/helpers";

const Navbar = () => {
  const navRef = useRef(null);
  const [navHeight, setNavHeight] = useState(80);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showEventsDropdown, setShowEventsDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    const handleResize = () => {
      if (navRef.current) {
        const h = Math.max(1, Math.round(navRef.current.getBoundingClientRect().height));
        setNavHeight(h);
        document.documentElement.style.setProperty("--navbar-height", `${h}px`);
      }
    };
    handleResize();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isStudent = user && (user.role || "").toLowerCase() === "student";
  const isPosterRole =
    user &&
    (["teacher", "alumni", "admin"].includes((user.role || "").toLowerCase()));

  // Build nav ensuring Home is always first for students
  const baseItems = [
    { to: "/", label: "Home", icon: FiHome },
    { to: "/about", label: "About", icon: FiUsers },
  ];
  const postsItem = user ? [{ to: "/posts", label: "Posts", icon: FiFileText }] : [];
  const forumItem = (user && (user.role || "").toLowerCase() !== "teacher" && (user.role || "").toLowerCase() !== "alumni") ? [{ to: "/forum", label: "Forum", icon: FiMessageCircle }] : [];
  const netItem = user ? [{ to: "/network", label: "Network", icon: FiUsers }] : [];
  const adminItem = (user && (user.role || "").toLowerCase() === "admin") ? [{ to: "/admin", label: "Admin", icon: FiUser }] : [];

  const navItems = [
    ...baseItems,
    // Non-students get direct Events link
    ...(!isStudent ? [{ to: "/events", label: "Events", icon: FiCalendar }] : []),
    // For students, Posts is in the Events dropdown, so exclude it here to avoid duplication
    ...(!isStudent ? postsItem : []),
    ...forumItem,
    ...netItem,
    ...adminItem,
  ];

  // Keep global navbar visible on admin pages; admin has its own side nav

  return (
    <motion.nav
      ref={navRef}
      className="relative z-50 transition-all duration-500 backdrop-blur-md bg-transparent"
      style={{ ['--navbar-height']: `${navHeight}px` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Enhanced Logo */}
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                className="w-12 h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
              >
                <span className="text-white font-black text-xl">A</span>
              </motion.div>

              <motion.span
                className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent tracking-tight"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  backgroundSize: "200% 100%",
                }}
              >
                AlumniConnect
              </motion.span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-2">
            {isStudent ? (
              <>
                {/* Home first for students */}
                <motion.div
                  key={navItems[0].to}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                >
                  <NavLink
                    to={navItems[0].to}
                    label={navItems[0].label}
                    icon={navItems[0].icon}
                    isActive={location.pathname === navItems[0].to}
                  />
                </motion.div>

                {/* Events Dropdown for Students - now second */}
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onMouseEnter={() => setShowEventsDropdown(true)}
                  onMouseLeave={() => setShowEventsDropdown(false)}
                >
                  <button
                    className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 group ${
                      location.pathname === "/events" ||
                      location.pathname === "/posts"
                        ? "text-indigo-600 bg-indigo-100"
                        : "text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                    }`}
                  >
                    <FiCalendar
                      size={18}
                      className="transition-transform duration-300 group-hover:rotate-12"
                    />
                    <span>Events</span>
                    <FiChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${
                        showEventsDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {showEventsDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border z-50"
                      >
                        <Link
                          to="/events"
                          className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-t-xl transition-colors"
                        >
                          <FiCalendar size={18} />
                          <span>All Events</span>
                        </Link>
                        <Link
                          to="/posts"
                          className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-b-xl transition-colors"
                        >
                          <FiFileText size={18} />
                          <span>Posts</span>
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Rest of navItems for students */}
                {navItems.slice(1).map((item, index) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index + 2) * 0.1 }}
                  >
                    <NavLink
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      isActive={location.pathname === item.to}
                    />
                  </motion.div>
                ))}
              </>
            ) : (
              navItems.map((item, index) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NavLink
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    isActive={location.pathname === item.to}
                  />
                </motion.div>
              ))
            )}

            {/* Search Button */}
            <motion.button
              onClick={() => navigate("/search")}
              className="ml-4 p-3 rounded-xl hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all duration-300 group"
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <FiSearch
                size={22}
                className="text-indigo-600 group-hover:text-purple-600 transition-colors duration-300"
              />
            </motion.button>

            {user ? (
              <motion.div
                className="flex items-center gap-3 ml-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* Messages */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Link
                    to="/messages"
                    className="p-3 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-100 transition-all duration-300 relative group"
                  >
                    <FiMessageSquare size={20} />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                </motion.div>

                {/* Notifications */}
                <NotificationBell />

                {/* User Button (direct link to profile) */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 p-2 rounded-xl border-2 border-transparent hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300"
                  >
                    <motion.img
                      className="h-10 w-10 rounded-full object-cover shadow-lg"
                      src={
                        user.avatarUrl
                          ? getAvatarUrl(user.avatarUrl)
                          : "/default-avatar.png"
                      }
                      alt={user.name}
                      whileHover={{ scale: 1.1 }}
                    />
                    <span className="hidden md:block font-semibold text-slate-700">
                      {user.name?.split(" ")[0]}
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/login"
                    className="px-6 py-3 border-2 border-indigo-500 rounded-xl text-indigo-600 font-semibold hover:bg-indigo-50 transition-all duration-300"
                  >
                    Login
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/register"
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all duration-300"
                  >
                    Join Now
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Mobile menu button */}
          <motion.button
            onClick={toggleMenu}
            className="lg:hidden p-3 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-100 focus:outline-none transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiX size={24} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiMenu size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Enhanced Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="lg:hidden absolute top-full left-0 right-0 backdrop-blur-2xl bg-white/95 border-b border-white/20 shadow-2xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-4 py-6 space-y-2">
              {isStudent ? (
                <>
                  {/* Home first for students in mobile */}
                  <motion.div
                    key={navItems[0].to}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0 }}
                  >
                    <MobileNavLink
                      to={navItems[0].to}
                      label={navItems[0].label}
                      icon={navItems[0].icon}
                      onClick={toggleMenu}
                      isActive={location.pathname === navItems[0].to}
                    />
                  </motion.div>

                  {/* Events Dropdown for Students in Mobile - now second */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-1"
                  >
                    <button
                      onClick={() => setShowEventsDropdown(!showEventsDropdown)}
                      className={`w-full flex items-center justify-between px-4 py-4 rounded-xl font-semibold transition-all duration-300 ${
                        location.pathname === "/events" ||
                        location.pathname === "/posts"
                          ? "text-indigo-600 bg-gradient-to-r from-indigo-100 to-purple-100"
                          : "text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FiCalendar size={20} />
                        <span>Events</span>
                      </div>
                      <FiChevronDown
                        size={16}
                        className={`transition-transform duration-300 ${
                          showEventsDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {showEventsDropdown && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-4 space-y-1"
                        >
                          <MobileNavLink
                            to="/events"
                            label="All Events"
                            icon={FiCalendar}
                            onClick={toggleMenu}
                            isActive={location.pathname === "/events"}
                          />
                          <MobileNavLink
                            to="/posts"
                            label="Posts"
                            icon={FiFileText}
                            onClick={toggleMenu}
                            isActive={location.pathname === "/posts"}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Rest of navItems for students in mobile */}
                  {navItems.slice(1).map((item, index) => (
                    <motion.div
                      key={item.to}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index + 2) * 0.1 }}
                    >
                      <MobileNavLink
                        to={item.to}
                        label={item.label}
                        icon={item.icon}
                        onClick={toggleMenu}
                        isActive={location.pathname === item.to}
                      />
                    </motion.div>
                  ))}
                </>
              ) : (
                <>
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.to}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <MobileNavLink
                        to={item.to}
                        label={item.label}
                        icon={item.icon}
                        onClick={toggleMenu}
                        isActive={location.pathname === item.to}
                      />
                    </motion.div>
                  ))}
                </>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navItems.length * 0.1 }}
              >
                <MobileNavLink
                  to="/search"
                  label="Search"
                  icon={FiSearch}
                  onClick={toggleMenu}
                  isActive={location.pathname === "/search"}
                />
              </motion.div>
            </div>

            {user ? (
              <motion.div
                className="border-t border-white/20 px-4 py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center mb-4 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
                  {user.avatarUrl ? (
                    <img
                      className="h-12 w-12 rounded-full object-cover border-2 border-indigo-200 shadow"
                      src={getAvatarUrl(user.avatarUrl)}
                      alt={user.name}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-4">
                    <div className="text-lg font-bold text-slate-800">
                      {user.name}
                    </div>
                    <div className="text-sm text-slate-500">{user.role}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <MobileNavLink
                    to="/profile"
                    label="Profile"
                    icon={FiUser}
                    onClick={toggleMenu}
                  />
                  <MobileNavLink
                    to="/messages"
                    label="Messages"
                    icon={FiMessageSquare}
                    onClick={toggleMenu}
                  />

                  <motion.button
                    onClick={() => {
                      toggleMenu();
                      handleLogout();
                    }}
                    className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-semibold"
                    whileHover={{ x: 5 }}
                  >
                    <FiLogOut className="mr-3" />
                    Sign out
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="border-t border-white/20 px-4 py-6 space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Link
                  to="/login"
                  className="block px-6 py-3 text-center rounded-xl border-2 border-indigo-500 text-indigo-600 font-semibold hover:bg-indigo-50 transition-all duration-300"
                  onClick={toggleMenu}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-6 py-3 text-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all duration-300"
                  onClick={toggleMenu}
                >
                  Join Now
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

// Enhanced Desktop NavLink Component
function NavLink({ to, label, icon: Icon, isActive }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Link
        to={to}
        className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 group ${
          isActive
            ? "text-indigo-600 bg-indigo-100"
            : "text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
        }`}
      >
        <Icon
          size={18}
          className="transition-transform duration-300 group-hover:rotate-12"
        />
        <span>{label}</span>

        {/* Animated underline */}
        <motion.div
          className="absolute bottom-1 left-1/2 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          initial={{ width: 0, x: "-50%" }}
          animate={{ width: isActive ? "80%" : 0, x: "-50%" }}
          whileHover={{ width: "80%" }}
          transition={{ duration: 0.3 }}
        />
      </Link>
    </motion.div>
  );
}

// Enhanced Mobile NavLink Component
function MobileNavLink({ to, label, icon: Icon, onClick, isActive }) {
  return (
    <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-4 rounded-xl font-semibold transition-all duration-300 ${
          isActive
            ? "text-indigo-600 bg-gradient-to-r from-indigo-100 to-purple-100"
            : "text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
        }`}
      >
        <Icon size={20} />
        <span>{label}</span>
        {isActive && (
          <motion.div
            className="ml-auto w-2 h-2 bg-indigo-500 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
          />
        )}
      </Link>
    </motion.div>
  );
}

export default Navbar;