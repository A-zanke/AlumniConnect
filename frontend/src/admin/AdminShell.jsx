import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiDashboard2Line,
  RiUserSearchLine,
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
  RiNotification3Line,
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

const gradientBackground =
  "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_rgba(15,23,42,0)_60%)]";

const AdminShell = ({ title, subtitle, rightSlot, children, metrics = {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const activePath = useMemo(() => {
    const pathname = location.pathname;
    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className={`relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 ${gradientBackground}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-transparent blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-gradient-to-bl from-purple-500/30 via-pink-500/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-gradient-to-t from-blue-500/10 via-transparent to-transparent blur-2xl" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col bg-slate-900/80 backdrop-blur-xl transition-transform duration-300 ease-out lg:fixed lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
        <div className="flex min-h-screen flex-1 flex-col lg:ml-72 overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-900/70 px-4 py-4 backdrop-blur-xl lg:pl-0 lg:pr-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
                >
                  <RiMenuLine className="text-xl" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Control Center</p>
                  <h1 className="text-2xl font-semibold text-white lg:text-3xl">{title}</h1>
                  {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur lg:flex">
                  <RiSearch2Line className="mr-2 text-base text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search insights, users, events..."
                    className="w-72 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <button className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10">
                  <RiNotification3Line className="text-lg" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-400" />
                </button>

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
    </div>
  );
};

export default AdminShell;
