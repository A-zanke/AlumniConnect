import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { connectionAPI } from "../components/utils/api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiUser,
  FiUsers,
  FiAward,
  FiBookOpen,
  FiStar,
  FiMapPin,
  FiBriefcase,
} from "react-icons/fi";

const FILTERS = [
  { label: "All", value: "all", color: "from-blue-500 to-cyan-500", icon: FiUsers },
  { label: "Alumni", value: "alumni", color: "from-purple-500 to-pink-500", icon: FiAward },
  { label: "Teacher", value: "teacher", color: "from-green-500 to-emerald-500", icon: FiBookOpen },
  { label: "Student", value: "student", color: "from-yellow-500 to-orange-500", icon: FiStar },
];

const typeLabels = {
  alumni: "Alumni",
  teacher: "Teacher",
  student: "Student",
  event: "Event",
  post: "Post",
};

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [connectionStatuses, setConnectionStatuses] = useState({});
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?._id;

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  useEffect(() => {
    const fetchStatuses = async () => {
      if (results.length > 0) {
        const statuses = {};
        await Promise.all(
          results.map(async (user) => {
            try {
              const res = await connectionAPI.getConnectionStatus(user._id);
              statuses[user._id] = res.data?.status || res.status || "none";
            } catch (error) {
              console.error("Error fetching status for user:", user._id, error);
              if (error.response?.status === 500) {
                try {
                  const retryRes = await connectionAPI.getConnectionStatus(user._id);
                  statuses[user._id] = retryRes.data?.status || retryRes.status || "none";
                } catch (retryError) {
                  statuses[user._id] = "none";
                }
              } else {
                statuses[user._id] = "none";
              }
            }
          })
        );
        setConnectionStatuses(statuses);
      }
    };
    fetchStatuses();
  }, [results]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/search/users?query=${encodeURIComponent(
          query
        )}&excludeId=${currentUserId}`,
        { withCredentials: true }
      );
      setResults(response.data);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (user) => {
    if (user.username) {
      navigate(`/profile/${user.username}`);
    } else {
      navigate(`/profile/id/${user._id}`);
    }
  };

  const handleConnect = async (e, userId) => {
    e.stopPropagation();
    try {
      if (!userId || userId === currentUserId) {
        toast.error("Invalid user or cannot connect to yourself.");
        return;
      }
      await connectionAPI.sendRequest(userId);
      toast.success("Connection request sent!");
      setConnectionStatuses((prev) => ({ ...prev, [userId]: "requested" }));
    } catch (error) {
      console.error("Connection error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to send connection request";
      toast.error(errorMessage);
    }
  };

  const filteredResults =
    activeFilter === "all"
      ? results
      : results.filter((user) => (user.role || "").toLowerCase() === activeFilter);

  const groupedResults = filteredResults.reduce((acc, user) => {
    const type = (user.role || "").toLowerCase();
    acc[type] = acc[type] || [];
    acc[type].push(user);
    return acc;
  }, {});

  const handleImgError = (e) => {
    e.target.onerror = null;
    e.target.src = "/default-avatar.png";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg"
            >
              <FiSearch className="text-2xl sm:text-4xl text-white" />
            </motion.div>
            <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Search Network
            </h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-lg max-w-2xl mx-auto">
            Discover and connect with alumni, teachers, and students
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 sm:mb-8"
        >
          <div className="relative max-w-3xl mx-auto">
            <FiSearch className="absolute left-4 sm:left-6 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl sm:text-2xl" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, username, skills, department..."
              className="w-full pl-12 sm:pl-16 pr-4 sm:pr-6 py-3 sm:py-5 rounded-2xl border-2 border-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-400 text-base sm:text-lg shadow-lg bg-white transition-all duration-300 placeholder-gray-400"
            />
          </div>
        </motion.div>

        {/* Filter Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 sm:gap-4 mb-8 sm:mb-12 justify-center"
        >
          {FILTERS.map((f) => {
            const IconComponent = f.icon;
            return (
              <motion.button
                key={f.value}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold transition-all duration-300 flex items-center gap-2 shadow-lg ${
                  activeFilter === f.value
                    ? `bg-gradient-to-r ${f.color} text-white ring-4 ring-offset-2 ring-blue-300`
                    : "bg-white text-gray-700 hover:shadow-xl border-2 border-gray-200"
                } text-sm sm:text-base`}
                onClick={() => setActiveFilter(f.value)}
              >
                <IconComponent className="text-base sm:text-lg" />
                {f.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 sm:py-16"
          >
            <div className="inline-flex items-center gap-4 bg-white px-6 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-xl">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-blue-600 border-t-transparent"></div>
              <span className="text-gray-700 font-semibold text-base sm:text-lg">Searching...</span>
            </div>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence mode="wait">
          {Object.keys(groupedResults).length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 sm:space-y-10"
            >
              {Object.entries(groupedResults).map(([type, users]) => (
                <div key={type}>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-xl sm:text-3xl font-black mb-4 sm:mb-6 capitalize flex items-center gap-3 ${
                      type === "alumni"
                        ? "text-purple-600"
                        : type === "teacher"
                        ? "text-green-600"
                        : type === "student"
                        ? "text-yellow-600"
                        : "text-blue-600"
                    }`}
                  >
                    <div
                      className={`h-1 w-12 sm:w-16 rounded-full bg-gradient-to-r ${
                        type === "alumni"
                          ? "from-purple-500 to-pink-500"
                          : type === "teacher"
                          ? "from-green-500 to-emerald-500"
                          : type === "student"
                          ? "from-yellow-500 to-orange-500"
                          : "from-blue-500 to-cyan-500"
                      }`}
                    ></div>
                    {typeLabels[type] || type}
                    <span className="ml-auto text-sm sm:text-base font-normal text-gray-500 bg-gray-100 px-3 sm:px-4 py-1 sm:py-2 rounded-full">
                      {users.length} {users.length === 1 ? "result" : "results"}
                    </span>
                  </motion.h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {users.map((user, index) => (
                      <motion.div
                        key={user._id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        className="group flex items-center bg-white rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-300 overflow-hidden"
                        onClick={() => handleProfileClick(user)}
                      >
                        <div className="p-4 sm:p-6">
                          <div className="relative">
                            <img
                              src={user.avatarUrl || "/default-avatar.png"}
                              alt={user.name}
                              onError={handleImgError}
                              className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-xl group-hover:scale-110 transition-transform duration-300 ring-4 ring-blue-100"
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-4 border-white"></div>
                          </div>
                        </div>
                        <div className="flex-1 p-3 sm:p-6 pr-3 sm:pr-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1 sm:gap-0">
                            <h3 className="text-lg sm:text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                              {user.name}
                            </h3>
                            <span className="text-xs sm:text-sm text-gray-500 font-medium">
                              @{user.username}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                            {user.skills &&
                              user.skills.slice(0, 3).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold"
                                >
                                  {skill}
                                </span>
                              ))}
                            {user.skills && user.skills.length > 3 && (
                              <span className="bg-gray-100 text-gray-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold">
                                +{user.skills.length - 3}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                            <FiBriefcase className="text-indigo-500" />
                            {user.position || user.department || user.major || "No position"}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="capitalize bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-2 sm:px-3 py-1 rounded-full font-bold">
                              {user.role}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 sm:p-6">
                          <button
                            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap ${
                              connectionStatuses[user._id] === "connected"
                                ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                                : connectionStatuses[user._id] === "requested" ||
                                  connectionStatuses[user._id] === "pending"
                                ? "bg-yellow-100 text-yellow-700 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                            }`}
                            disabled={
                              connectionStatuses[user._id] === "pending" ||
                              connectionStatuses[user._id] === "requested" ||
                              connectionStatuses[user._id] === "connected"
                            }
                            onClick={(e) => handleConnect(e, user._id)}
                          >
                            {connectionStatuses[user._id] === "pending"
                              ? "⏳ Pending"
                              : connectionStatuses[user._id] === "requested"
                              ? "📤 Requested"
                              : connectionStatuses[user._id] === "connected"
                              ? "✅ Connected"
                              : "🔗 Connect"}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            query &&
            !loading && (
              <motion.div
                key="no-results"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-16 sm:py-24"
              >
                <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
                  <FiUser className="text-6xl sm:text-8xl text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                    No Results Found
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Try searching with different keywords or filters
                  </p>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Initial State */}
        {!query && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 sm:py-24"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <FiSearch className="text-6xl sm:text-8xl text-blue-300 mx-auto mb-6" />
              </motion.div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                Start Your Search
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Enter a name, skill, or department to find connections
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;