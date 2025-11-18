import React, { useMemo, useState, useEffect, createContext, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  RiDashboard2Line,
  RiTeamLine,
  RiCalendarEventLine,
  RiCustomerService2Line,
  RiFileList3Line,
  RiFlagLine,
  RiSettings3Line,
  RiInboxLine,
  RiLogoutBoxLine,
  RiMenuLine,
  RiSearch2Line,
} from "react-icons/ri";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: RiDashboard2Line },
      { label: "Users", path: "/admin/users", icon: RiTeamLine },
      { label: "Posts", path: "/admin/posts", icon: RiFileList3Line },
      { label: "Forum", path: "/admin/forum", icon: RiInboxLine },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Events", path: "/admin/events", icon: RiCalendarEventLine },
      { label: "Network", path: "/admin/network", icon: RiCustomerService2Line },
      { label: "Reports", path: "/admin/reports", icon: RiFlagLine },
      { label: "Settings", path: "/admin/settings", icon: RiSettings3Line },
    ],
  },
];

export const AdminSettingsContext = createContext({
  density: "comfortable",
  animateCharts: true,
  accent: "indigo",
  setSettings: () => {},
});

const gradientBackground =
  "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_rgba(15,23,42,0)_60%)]";

const AdminShell = ({ title, subtitle, rightSlot, children, metrics = {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const [searchPosition, setSearchPosition] = useState({ top: 0, left: 0, width: 0 });
  const [settings, setSettingsState] = useState(() => {
    if (typeof window === "undefined") return { density: "comfortable", animateCharts: true, accent: "indigo" };
    return {
      density: localStorage.getItem("admin.density") || "comfortable",
      animateCharts: localStorage.getItem("admin.animateCharts") !== "false",
      accent: localStorage.getItem("admin.accent") || "indigo",
    };
  });

  const setSettings = (partial) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      if (typeof window !== "undefined") {
        localStorage.setItem("admin.density", next.density);
        localStorage.setItem("admin.animateCharts", String(next.animateCharts));
        localStorage.setItem("admin.accent", next.accent);
        window.dispatchEvent(new Event("admin-settings-changed"));
      }
      return next;
    });
  };

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const [usersRes, eventsRes] = await Promise.all([
        axios.get(`/api/admin/users?search=${encodeURIComponent(query)}`),
        axios.get(`/api/admin/events?search=${encodeURIComponent(query)}`)
      ]);

      const users = (usersRes.data || []).slice(0, 5).map(user => ({
        type: 'user',
        id: user._id,
        title: user.name,
        subtitle: `${user.role} • ${user.department}`,
        link: `/admin/users?id=${user._id}`
      }));

      const events = (eventsRes.data || []).slice(0, 5).map(event => ({
        type: 'event',
        id: event._id,
        title: event.title,
        subtitle: `${event.status} • ${new Date(event.startAt).toLocaleDateString()}`,
        link: `/admin/events?id=${event._id}`
      }));

      setSearchResults([...users, ...events]);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  }, []);

  // Update search position
  const updateSearchPosition = useCallback(() => {
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setSearchPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
        updateSearchPosition();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch, updateSearchPosition]);

  // Update position on resize
  useEffect(() => {
    const handleResize = () => updateSearchPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateSearchPosition]);

  const activePath = useMemo(() => {
    const pathname = location.pathname;
    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <AdminSettingsContext.Provider value={{ ...settings, setSettings }}>
    <div className={`relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 ${gradientBackground}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-transparent blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-gradient-to-bl from-purple-500/30 via-pink-500/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-gradient-to-t from-blue-500/10 via-transparent to-transparent blur-2xl" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed top-20 bottom-0 right-0 z-30 flex w-72 flex-col bg-slate-900/80 backdrop-blur-xl transition-transform duration-300 ease-out lg:fixed lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-xl">
              <span className="text-lg font-bold">AC</span>
            </div>
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-400">Admin Console</p>
              <p className="text-lg font-semibold text-white">AlumniConnect</p>
            </div>
          </div>

          <nav className="flex-1 space-y-8 overflow-y-auto px-4 pb-12">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="px-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  {section.title}
                </p>
                <div className="mt-3 space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      item.path === "/admin"
                        ? activePath === "/admin"
                        : activePath.startsWith(item.path);
                    const badge =
                      item.path === '/admin/events' && metrics.pendingEvents
                        ? metrics.pendingEvents
                        : item.path === '/admin/posts' && metrics.pendingPosts
                        ? metrics.pendingPosts
                        : item.path === '/admin/reports' && metrics.unresolvedReports
                        ? metrics.unresolvedReports
                        : null;
                    return (
                      <Link key={item.path} to={item.path} className="block">
                        <motion.div
                          whileHover={{ x: 4 }}
                          className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-blue-500/60 via-indigo-500/50 to-purple-500/40 text-white shadow-lg shadow-blue-500/10"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon
                            className={`text-lg ${
                              isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                            }`}
                          />
                          <span className="flex-1">{item.label}</span>
                          {badge ? (
                            <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-amber-500/80 px-2 py-1 text-xs font-semibold text-slate-900 shadow-lg">
                              {badge > 99 ? '99+' : badge}
                            </span>
                          ) : null}
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/5 px-6 py-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              <span>Logout</span>
              <RiLogoutBoxLine className="text-lg" />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex min-h-screen flex-1 flex-col lg:mr-72 overflow-y-auto">
          <header className="sticky top-0 z-40 border-b border-white/5 bg-gradient-to-r from-slate-900/70 via-slate-800/70 to-slate-900/70 px-4 py-4 backdrop-blur-xl lg:pl-0 lg:pr-10 relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -left-4 top-0 h-full w-1 bg-gradient-to-b from-transparent via-blue-500/50 to-transparent animate-pulse"></div>
              <div className="absolute -right-4 top-0 h-full w-1 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center justify-between flex-1 gap-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSidebarOpen((prev) => !prev)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
                  >
                    <RiMenuLine className="text-xl" />
                  </button>
                  
                  {/* Enhanced Search Bar */}
                  <div className="relative group z-50">
                    <div 
                      ref={searchRef}
                      className="flex items-center rounded-3xl border border-white/20 bg-gradient-to-r from-white/10 to-white/5 px-6 py-3 text-sm text-slate-200 backdrop-blur-xl shadow-2xl transition-all duration-500 group-focus-within:border-blue-400/50 group-focus-within:shadow-blue-500/20 group-focus-within:shadow-2xl group-focus-within:scale-105 group-focus-within:-translate-y-0.5"
                    >
                      <RiSearch2Line className="mr-3 text-lg text-slate-300 transition-colors group-focus-within:text-blue-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          updateSearchPosition();
                          if (searchQuery) setShowSearchResults(true);
                        }}
                        onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                        placeholder="Search across campus..."
                        className="w-80 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      {searchQuery && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-2 w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Status Indicators */}
                <div className="hidden lg:flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20"
                    >
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-300 font-medium">Live</span>
                    </motion.div>
                    
                    <div className="w-px h-6 bg-white/10"></div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-2"
                    >
                      <RiTeamLine className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-slate-300">
                        <span className="font-semibold text-white">{metrics?.totalUsers || '0'}</span> Users
                      </span>
                    </motion.div>
                    
                    <div className="w-px h-6 bg-white/10"></div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center gap-2"
                    >
                      <RiCalendarEventLine className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-slate-300">
                        <span className="font-semibold text-white">{metrics?.activeEvents || '0'}</span> Events
                      </span>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">

                <div className="relative">
                  <button
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 font-semibold">
                      AD
                    </div>
                    <div className="hidden sm:flex sm:flex-col">
                      <span className="text-sm font-semibold text-white">Admin</span>
                      <span className="text-xs text-slate-400">System Supervisor</span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 mt-3 w-60 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-sm text-slate-200 shadow-2xl backdrop-blur"
                      >
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-lg font-semibold">
                            AD
                          </div>
                          <div>
                            <p className="font-semibold text-white">Administrator</p>
                            <p className="text-xs text-slate-400">admin@alumniconnect.edu</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <Link
                            to="/profile"
                            className="block rounded-xl px-3 py-2 transition hover:bg-white/5"
                            onClick={() => setProfileOpen(false)}
                          >
                            Profile Overview
                          </Link>
                          <Link
                            to="/admin/settings"
                            className="block rounded-xl px-3 py-2 transition hover:bg-white/5"
                            onClick={() => setProfileOpen(false)}
                          >
                            Admin Settings
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-red-300 transition hover:bg-red-500/10"
                          >
                            <span>Logout</span>
                            <RiLogoutBoxLine />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 lg:hidden">
              <div className="flex w-full items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
                <RiSearch2Line className="mr-2 text-base text-slate-400" />
                <input
                  type="text"
                  placeholder="Search insights, users, events..."
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              {rightSlot}
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden pb-14 pt-8">
            {rightSlot && <div className="hidden justify-end px-6 pb-6 lg:flex lg:px-10">{rightSlot}</div>}
            <div className="space-y-10 px-4 sm:px-6 lg:px-0">{children}</div>
          </main>
        </div>
      </div>

      {/* Search Results Dropdown - Positioned outside all containers */}
      {showSearchResults && searchResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl max-h-80 overflow-y-auto"
          style={{ 
            zIndex: 9999,
            top: `${searchPosition.top}px`,
            left: `${searchPosition.left}px`,
            width: `${Math.max(searchPosition.width, 400)}px`
          }}
        >
          {searchResults.map((result) => (
            <Link
              key={`${result.type}-${result.id}`}
              to={result.link}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 group/item"
              onClick={() => {
                setShowSearchResults(false);
                setSearchQuery('');
              }}
            >
              <div className={`w-2 h-2 rounded-full transition-all group-hover/item:scale-150 ${result.type === 'user' ? 'bg-blue-400' : 'bg-green-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{result.title}</p>
                <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
              </div>
              <span className="text-xs text-slate-500 capitalize">{result.type}</span>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
    </AdminSettingsContext.Provider>
  );
};

export default AdminShell;