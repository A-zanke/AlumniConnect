import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiMenu,
  FiX,
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
import "./Navbar.css";
import { getAvatarUrl } from "../utils/helpers";
import { unreadAPI } from "../utils/api";
import { io } from "socket.io-client";

const Navbar = () => {
  const navRef = useRef(null);
  const [navHeight, setNavHeight] = useState(80);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [msgUnreadTotal, setMsgUnreadTotal] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (navRef.current) {
        const h = Math.max(
          1,
          Math.round(navRef.current.getBoundingClientRect().height)
        );
        setNavHeight(h);
        document.documentElement.style.setProperty("--navbar-height", `${h}px`);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Fetch total unread + setup real-time socket updates for navbar badge
  useEffect(() => {
    let mounted = true;
    const refreshUnread = async () => {
      try {
        const rows = await unreadAPI.getSnapshotFromConversations();
        const total = (rows || []).reduce((sum, r) => sum + (r.count || 0), 0);
        if (mounted) setMsgUnreadTotal(total);
      } catch {
        if (mounted) setMsgUnreadTotal(0);
      }
    };

    if (!user) {
      setMsgUnreadTotal(0);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    refreshUnread();

    // Setup socket for real-time total updates
    const baseURL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || "http://localhost:5000";
    const s = io(baseURL, {
      auth: { token: localStorage.getItem("token") },
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = s;
    s.on("unread:total", ({ total }) => {
      if (typeof total === "number") setMsgUnreadTotal(total);
    });
    s.on("unread:snapshot", (rows) => {
      try {
        const total = (rows || []).reduce((sum, r) => sum + (r.count || 0), 0);
        setMsgUnreadTotal(total);
      } catch {}
    });

    return () => {
      mounted = false;
      try {
        s.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [user]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const role = (user?.role || "").toLowerCase();

  const navItems = useMemo(() => {
    const baseLinks = [
      { key: "home", type: "link", to: "/", label: "Home", icon: FiHome },
      { key: "about", type: "link", to: "/about", label: "About", icon: FiUsers },
    ];

    if (!user) {
      return [
        ...baseLinks,
        { key: "events", type: "link", to: "/events", label: "Events", icon: FiCalendar },
      ];
    }

    if (role === "student") {
      return [
        ...baseLinks,
        { key: "posts", type: "link", to: "/posts", label: "Posts", icon: FiFileText },
        { key: "events", type: "link", to: "/events", label: "Events", icon: FiCalendar },
        {
          key: "forum",
          type: "dropdown",
          label: "Forum",
          icon: FiMessageCircle,
          to: "/forum",
          items: [
            { key: "forum-network", to: "/network", label: "Network", icon: FiUsers },
          ],
        },
      ];
    }

    if (role === "teacher" || role === "alumni") {
      return [
        ...baseLinks,
        { key: "events", type: "link", to: "/events", label: "Events", icon: FiCalendar },
        {
          key: "post",
          type: "dropdown",
          label: "Post",
          icon: FiFileText,
          to: "/posts",
          items: [
            { key: "post-network", to: "/network", label: "Network", icon: FiUsers },
          ],
        },
      ];
    }

    if (role === "admin") {
      return [
        { key: "home", type: "link", to: "/", label: "Home", icon: FiHome },
        { key: "about", type: "link", to: "/about", label: "About", icon: FiUsers },
        {
          key: "events",
          type: "dropdown",
          label: "Events",
          icon: FiCalendar,
          to: "/events",
          items: [
            { key: "events-network", to: "/network", label: "Network", icon: FiUsers },
            { key: "events-forum", to: "/forum", label: "Forum", icon: FiMessageCircle },
            { key: "events-posts", to: "/posts", label: "Posts", icon: FiFileText },
          ],
        },
        { key: "admin", type: "link", to: "/admin", label: "Admin Panel", icon: FiUser },
      ];
    }

    return [
      ...baseLinks,
      { key: "events", type: "link", to: "/events", label: "Events", icon: FiCalendar },
    ];
  }, [role, user]);

  const mobileNavLinks = useMemo(() => {
    const unique = [];
    const seen = new Set();

    const push = (item) => {
      if (!item || !item.to) return;
      const key = item.key || item.to;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push({
        key,
        to: item.to,
        label: item.label,
        icon: item.icon || FiChevronDown,
      });
    };

    navItems.forEach((item) => {
      if (item.type === "link") {
        push(item);
      } else if (item.type === "dropdown") {
        if (item.to) push(item);
        (item.items || []).forEach(push);
      }
    });

    if (user) {
      push({ key: "profile", to: "/profile", label: "My Profile", icon: FiUser });
      push({ key: "messages", to: "/messages", label: "Messages", icon: FiMessageSquare });
    }

    push({ key: "search", to: "/search", label: "Search", icon: FiSearch });

    return unique;
  }, [navItems, user]);

  useEffect(() => {
    setActiveDropdown(null);
  }, [location.pathname]);

  // Keep global navbar visible on admin pages; admin has its own side nav

  return (
    <motion.nav
      ref={navRef}
      className="relative z-50 transition-all duration-500 backdrop-blur-md bg-transparent"
      style={{ "--navbar-height": `${navHeight}px` }}
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
        <div className="flex justify-between h-16 sm:h-20 items-center">
          {/* Enhanced Logo */}
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
              >
                <span className="text-white font-black text-lg sm:text-xl">A</span>
              </motion.div>

              <motion.span
                className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent tracking-tight"
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
            {navItems.map((item, index) => {
              if (item.type === "link") {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <NavLink
                      to={item.to}
                      label={item.label}
                      icon={Icon}
                      isActive={location.pathname === item.to}
                    />
                  </motion.div>
                );
              }

              const dropdownItems = [
                ...(item.to
                  ? [
                      {
                        key: `${item.key}-parent`,
                        to: item.to,
                        label: item.label,
                        icon: item.icon,
                      },
                    ]
                  : []),
                ...(item.items || []),
              ];
              const activeChild = dropdownItems.find((child) =>
                location.pathname.startsWith(child.to)
              );
              const dropdownActive = Boolean(activeChild);
              const DisplayIcon = (activeChild?.icon || item.icon);
              const displayLabel = activeChild?.label || item.label;
              const targetLink = activeChild?.to || item.to || location.pathname;

              return (
                <motion.div
                  key={item.key}
                  className="relative"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onMouseEnter={() => setActiveDropdown(item.key)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={targetLink}
                    onClick={(e) => {
                      if (!item.to) {
                        e.preventDefault();
                        setActiveDropdown((prev) =>
                          prev === item.key ? null : item.key
                        );
                      } else {
                        setActiveDropdown(null);
                      }
                    }}
                    className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 group ${
                      dropdownActive
                        ? "text-indigo-600 bg-indigo-100"
                        : "text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                    }`}
                  >
                    <DisplayIcon
                      size={18}
                      className="transition-transform duration-300 group-hover:rotate-12"
                    />
                    <span>{displayLabel}</span>
                    <FiChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${
                        activeDropdown === item.key ? "rotate-180" : ""
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveDropdown((prev) =>
                          prev === item.key ? null : item.key
                        );
                      }}
                    />
                  </Link>

                  <AnimatePresence>
                    {activeDropdown === item.key && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border z-50"
                      >
                        {dropdownItems.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.key}
                              to={child.to}
                              onClick={() => setActiveDropdown(null)}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                location.pathname.startsWith(child.to)
                                  ? "bg-indigo-50 text-indigo-600 font-semibold"
                                  : "text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                              }`}
                            >
                              <ChildIcon size={18} />
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            <motion.button
              onClick={() => navigate("/search")}
              className="ml-4 p-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all duration-300 group navbar-icon-btn search-icon"
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
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
                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                  <Link
                    to="/messages"
                    className="navbar-icon-btn message-icon group relative inline-flex items-center justify-center rounded-xl px-3 py-2 backdrop-blur border border-white/40 transition-colors"
                  >
                    <FiMessageSquare
                      size={20}
                      className="icon transition-colors duration-300 text-slate-800 group-hover:text-indigo-700"
                    />
                    {msgUnreadTotal > 0 && (
                      <span
                        className="message-badge"
                        aria-label={`${msgUnreadTotal} unread messages`}
                      >
                        {msgUnreadTotal > 99 ? "99+" : msgUnreadTotal}
                      </span>
                    )}
                  </Link>
                </motion.div>

                <NotificationBell />

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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

          {/* Mobile utility row */}
          <div className="lg:hidden flex items-center gap-2">
            {user ? (
              <>
                <div className="-mr-1">
                  <NotificationBell />
                </div>
                <Link
                  to="/profile"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 overflow-hidden"
                >
                  <img
                    src={user.avatarUrl ? getAvatarUrl(user.avatarUrl) : "/default-avatar.png"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                </Link>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow"
              >
                Login
              </button>
            )}

            <motion.button
              onClick={toggleMenu}
              className="p-3 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-100 focus:outline-none transition-all duration-300"
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
      </div>

      {/* Enhanced Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="lg:hidden absolute top-full left-0 right-0 px-4 pb-6"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="rounded-3xl shadow-2xl bg-white/95 backdrop-blur border border-indigo-100 overflow-hidden">
              <div className="px-4 pt-5 pb-4 flex items-center gap-3 border-b border-indigo-50">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-indigo-400">Quick Jump</p>
                  <p className="text-base font-semibold text-slate-800">Navigate Anywhere</p>
                </div>
                <button
                  onClick={() => {
                    toggleMenu();
                    navigate("/search");
                  }}
                  className="p-2 rounded-xl text-indigo-600 bg-indigo-50"
                >
                  <FiSearch size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 px-4 py-5">
                {mobileNavLinks.map((item, index) => (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={item.to}
                      onClick={toggleMenu}
                      className={`flex items-center gap-3 px-3 py-3 rounded-2xl border transition-all duration-300 ${
                        location.pathname.startsWith(item.to)
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                          : "border-indigo-100 bg-white hover:border-indigo-300 hover:shadow"
                      }`}
                    >
                      <item.icon size={18} />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {user ? (
                <div className="px-4 pt-4 pb-5 border-t border-indigo-50 bg-indigo-50/60">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm">
                    <img
                      src={user.avatarUrl ? getAvatarUrl(user.avatarUrl) : "/default-avatar.png"}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border border-indigo-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                      <p className="text-xs text-indigo-500 uppercase tracking-wide">{user.role}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={toggleMenu}
                      className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                    >
                      View
                    </Link>
                  </div>

                  <button
                    onClick={() => {
                      toggleMenu();
                      handleLogout();
                    }}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-600 bg-white hover:bg-red-50 border border-red-100 font-semibold"
                  >
                    <FiLogOut /> Sign out
                  </button>
                </div>
              ) : (
                <div className="px-4 pt-4 pb-5 border-t border-indigo-50 bg-indigo-50/60 grid grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    onClick={toggleMenu}
                    className="px-3 py-3 rounded-xl border border-indigo-200 text-indigo-600 text-center font-semibold"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={toggleMenu}
                    className="px-3 py-3 rounded-xl bg-indigo-600 text-white text-center font-semibold shadow"
                  >
                    Join Now
                  </Link>
                </div>
              )}
            </div>
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

export default Navbar;
