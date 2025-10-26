import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import { FixedSizeList as List } from "react-window";
import axios from "axios";

const REACT_TYPES = [
  { key: "all", label: "All" },
  { key: "like", label: "👍 Like" },
  { key: "love", label: "❤️ Love" },
  { key: "celebrate", label: "🎉 Celebrate" },
  { key: "support", label: "💪 Support" },
  { key: "insightful", label: "💡 Insightful" },
  { key: "curious", label: "🤔 Curious" },
];

const EMOJI_MAP = {
  like: "👍",
  love: "❤️",
  celebrate: "🎉",
  support: "💪",
  insightful: "💡",
  curious: "🤔",
};

const LoadingSkeleton = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

const ReactorsList = ({ postId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [reactors, setReactors] = useState([]);
  const [selectedReactionType, setSelectedReactionType] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchReactors();
  }, [postId]);

  // Compute reaction counts for tabs
  const reactionCounts = useMemo(() => {
    const counts = { all: reactors.length };
    reactors.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [reactors]);

  // Filter reactors based on type and search
  const filteredReactors = useMemo(() => {
    let filtered = reactors;
    if (selectedReactionType !== "all") {
      filtered = filtered.filter((r) => r.type === selectedReactionType);
    }
    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.user.name.toLowerCase().includes(lowerSearch) ||
          r.user.role.toLowerCase().includes(lowerSearch) ||
          r.user.department.toLowerCase().includes(lowerSearch)
      );
    }
    return filtered;
  }, [reactors, selectedReactionType, debouncedSearch]);

  const fetchReactors = async () => {
    try {
      const res = await axios.get(`/api/posts/${postId}/reactions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setReactors(res.data.data || []);
    } catch (e) {
      console.error("Failed to fetch reactors:", e);
    } finally {
      setLoading(false);
    }
  };

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isMobile = window.innerWidth < 768;

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  };

  const bottomSheetVariants = {
    hidden: { y: "100%" },
    visible: { y: 0 },
    exit: { y: "100%" },
  };

  const ReactorItem = ({ index, style }) => {
    const r = filteredReactors[index];
    return (
      <motion.div
        style={style}
        className="p-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <div
          className="flex items-center gap-3 p-3 bg-gradient-to-r from-white to-blue-50 hover:from-blue-50 hover:to-indigo-50 rounded-lg cursor-pointer transition-all duration-200 border border-blue-100 hover:border-blue-200 hover:shadow-md"
          onClick={() => {
            navigate(`/profile/${r.user.username || r.user._id}`);
            onClose();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              navigate(`/profile/${r.user.username || r.user._id}`);
              onClose();
            }
          }}
          aria-label={`View profile of ${r.user.name}`}
        >
          <div className="relative">
            <img
              src={r.user.avatarUrl || "/default-avatar.png"}
              alt={r.user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-gradient-to-r from-blue-400 to-purple-500"
            />
            <span className="absolute -bottom-1 -right-1 text-lg bg-white rounded-full p-1 border border-gray-200">
              {EMOJI_MAP[r.type] || "👍"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <Link
              to={`/profile/${r.user.username || r.user._id}`}
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors block truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {r.user.name}
            </Link>
            <div className="text-sm text-gray-600 truncate">
              {r.user.role} • {r.user.department}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reactors-title"
      >
        <motion.div
          className={`bg-gradient-to-br from-white to-blue-50 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md ${
            isMobile ? "h-3/4" : "max-h-[80vh]"
          }`}
          onClick={(e) => e.stopPropagation()}
          variants={isMobile ? bottomSheetVariants : modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl md:rounded-t-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 id="reactors-title" className="text-lg font-semibold">
                Reactions
              </h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close reactions modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {REACT_TYPES.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setSelectedReactionType(type.key)}
                  className={`px-3 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-1 ${
                    selectedReactionType === type.key
                      ? "bg-white text-blue-700 font-medium shadow-md"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  aria-pressed={selectedReactionType === type.key}
                  aria-label={`Filter by ${type.label} (${
                    reactionCounts[type.key] || 0
                  })`}
                >
                  {type.label} ({reactionCounts[type.key] || 0})
                </button>
              ))}
            </div>
            <div className="relative mt-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reactors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-blue-300 rounded-lg bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                aria-label="Search reactors by name, role, or department"
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <LoadingSkeleton />
            ) : filteredReactors.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p className="text-lg mb-1">No reactions found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              </div>
            ) : (
              <List
                height={isMobile ? 300 : 400}
                itemCount={filteredReactors.length}
                itemSize={80}
                width="100%"
                className="scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100"
              >
                {ReactorItem}
              </List>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReactorsList;
