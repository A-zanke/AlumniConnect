import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AdminNavbar from "./AdminNavbar.jsx";
import { motion } from "framer-motion";
import {
  FaTrash,
  FaSearch,
  FaEye,
  FaFilter,
  FaCalendar,
  FaUser,
  FaTag,
  FaDownload,
  FaCheckSquare,
  FaSquare,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaImage,
  FaHeart,
  FaComment,
  FaShare,
  FaFlag,
  FaChartBar,
  FaEyeSlash,
  FaEye as FaEyeShow,
} from "react-icons/fa";

const AdminPostsManager = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    author: "",
    department: "",
    dateRange: { start: "", end: "" },
    reactionCount: "",
    reportStatus: "",
    tags: "",
  });
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedPosts, setSelectedPosts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showViewModal, setShowViewModal] = useState({
    show: false,
    post: null,
  });
  const [showAnalyticsModal, setShowAnalyticsModal] = useState({
    show: false,
    post: null,
  });
  const [showReportsModal, setShowReportsModal] = useState({
    show: false,
    post: null,
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 10 };
      if (searchQuery) params.q = searchQuery;
      if (filters.author) params.author = filters.author;
      if (filters.department) params.department = filters.department;
      if (filters.dateRange.start) params.startDate = filters.dateRange.start;
      if (filters.dateRange.end) params.endDate = filters.dateRange.end;
      if (filters.reactionCount) params.reactionCount = filters.reactionCount;
      if (filters.reportStatus) params.reportStatus = filters.reportStatus;
      if (filters.tags) params.tags = filters.tags;
      const res = await axios.get("/api/admin/posts", { params });
      setPosts(res.data.posts || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalResults(res.data.totalResults || 0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, currentPage]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await axios.delete(`/api/admin/posts/${id}`);
      await fetchPosts();
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) return;
    if (!window.confirm(`Delete ${selectedPosts.size} posts?`)) return;
    try {
      await axios.post("/api/admin/posts/bulk-delete", {
        ids: Array.from(selectedPosts),
      });
      setSelectedPosts(new Set());
      await fetchPosts();
    } catch (err) {
      alert("Failed to delete posts");
    }
  };

  const handleBulkHide = async (hide) => {
    if (selectedPosts.size === 0) return;
    try {
      await axios.post("/api/admin/posts/bulk-hide", {
        ids: Array.from(selectedPosts),
        hide,
      });
      setSelectedPosts(new Set());
      await fetchPosts();
    } catch (err) {
      alert("Failed to update posts");
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (selectedPosts.size > 0) params.ids = Array.from(selectedPosts);
      const res = await axios.get("/api/admin/posts/export", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "posts_export.csv");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert("Failed to export posts");
    }
  };

  const toggleSelectPost = (id) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPosts(newSelected);
  };

  const selectAll = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map((p) => p._id)));
    }
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPosts(newExpanded);
  };

  const applyFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (value && !activeFilters.includes(key)) {
      setActiveFilters((prev) => [...prev, key]);
    } else if (!value) {
      setActiveFilters((prev) => prev.filter((f) => f !== key));
    }
  };

  const clearFilter = (key) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === "dateRange" ? { start: "", end: "" } : "",
    }));
    setActiveFilters((prev) => prev.filter((f) => f !== key));
  };

  const clearAllFilters = () => {
    setFilters({
      author: "",
      department: "",
      dateRange: { start: "", end: "" },
      reactionCount: "",
      reportStatus: "",
      tags: "",
    });
    setActiveFilters([]);
  };

  const filterChips = [
    { key: "all", label: "All", onClick: () => clearAllFilters() },
    {
      key: "reported",
      label: "Reported",
      onClick: () => applyFilter("reportStatus", "reported"),
    },
    {
      key: "highEngagement",
      label: "High Engagement",
      onClick: () => applyFilter("reactionCount", "10"),
    },
    {
      key: "recent",
      label: "Recent",
      onClick: () =>
        applyFilter("dateRange", {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          end: "",
        }),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <AdminNavbar />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Posts Management
          </h2>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <FaFilter /> Filters
            </button>
            <button
              onClick={fetchPosts}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all"
            >
              Search
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-gray-50 rounded-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={filters.author}
                    onChange={(e) => applyFilter("author", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={filters.department}
                    onChange={(e) => applyFilter("department", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={filters.tags}
                    onChange={(e) => applyFilter("tags", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range Start
                  </label>
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) =>
                      applyFilter("dateRange", {
                        ...filters.dateRange,
                        start: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range End
                  </label>
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) =>
                      applyFilter("dateRange", {
                        ...filters.dateRange,
                        end: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Reaction Count
                  </label>
                  <input
                    type="number"
                    value={filters.reactionCount}
                    onChange={(e) =>
                      applyFilter("reactionCount", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Status
                  </label>
                  <select
                    value={filters.reportStatus}
                    onChange={(e) =>
                      applyFilter("reportStatus", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">All</option>
                    <option value="reported">Reported</option>
                    <option value="not-reported">Not Reported</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.onClick}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilters.includes(chip.key)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {chip.label}
              </button>
            ))}
            {activeFilters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-full text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAll}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
              >
                {selectedPosts.size === posts.length && posts.length > 0 ? (
                  <FaCheckSquare />
                ) : (
                  <FaSquare />
                )}{" "}
                Select All
              </button>
              {selectedPosts.size > 0 && (
                <>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
                  >
                    <FaTrash /> Delete Selected
                  </button>
                  <button
                    onClick={() => handleBulkHide(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-all"
                  >
                    <FaEyeSlash /> Hide Selected
                  </button>
                  <button
                    onClick={() => handleBulkHide(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all"
                  >
                    <FaEyeShow /> Unhide Selected
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
                  >
                    <FaDownload /> Export Selected
                  </button>
                </>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Showing {posts.length} of {totalResults} results
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No posts found
                </div>
              ) : (
                posts.map((post) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedPosts.has(post._id)}
                        onChange={() => toggleSelectPost(post._id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {post.userId?.avatarUrl && (
                            <img
                              src={post.userId.avatarUrl}
                              alt=""
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <a
                              href={`/profile/${post.userId?._id}`}
                              className="font-semibold text-gray-800 hover:text-indigo-600"
                            >
                              {post.userId?.name}
                            </a>
                            <span className="text-gray-500 text-sm">
                              {" "}
                              ({post.userId?.role})
                            </span>
                            <p className="text-sm text-gray-500">
                              {new Date(post.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="mb-3">
                          <p
                            className={`text-gray-700 ${
                              expandedPosts.has(post._id) ? "" : "line-clamp-3"
                            }`}
                          >
                            {post.content}
                          </p>
                          {post.content.length > 150 && (
                            <button
                              onClick={() => toggleExpand(post._id)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              {expandedPosts.has(post._id)
                                ? "Show less"
                                : "Show more"}
                            </button>
                          )}
                        </div>
                        {post.media && post.media.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {post.media.slice(0, 3).map((m, i) => (
                              <img
                                key={i}
                                src={m.url}
                                alt=""
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            ))}
                            {post.media.length > 3 && (
                              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                                +{post.media.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                          <span>
                            <FaHeart className="inline mr-1" />{" "}
                            {post.reactions?.length || 0}
                          </span>
                          <span>
                            <FaComment className="inline mr-1" />{" "}
                            {post.comments?.length || 0}
                          </span>
                          <span>
                            <FaShare className="inline mr-1" />{" "}
                            {post.shares?.length || 0}
                          </span>
                          <span>
                            <FaEye className="inline mr-1" /> {post.views || 0}
                          </span>
                          {post.reportsCount > 0 && (
                            <span>
                              <FaFlag className="inline mr-1" />{" "}
                              {post.reportsCount}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setShowViewModal({ show: true, post })
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
                          >
                            <FaEye /> View
                          </button>
                          <button
                            onClick={() =>
                              setShowAnalyticsModal({ show: true, post })
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all"
                          >
                            <FaChartBar /> Analytics
                          </button>
                          {post.reportsCount > 0 && (
                            <button
                              onClick={() =>
                                setShowReportsModal({ show: true, post })
                              }
                              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all"
                            >
                              <FaFlag /> Reports
                            </button>
                          )}
                          <button
                            onClick={() => handleBulkHide(!post.isHidden)}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-all"
                          >
                            {post.isHidden ? <FaEyeShow /> : <FaEyeSlash />}{" "}
                            {post.isHidden ? "Unhide" : "Hide"}
                          </button>
                          <button
                            onClick={() => handleDelete(post._id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all"
            >
              Next
            </button>
          </div>
        </motion.div>
      </div>

      {showViewModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">View Post</h3>
              <button
                onClick={() => setShowViewModal({ show: false, post: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="mb-4">
              <p>{showViewModal.post.content}</p>
            </div>
            {showViewModal.post.media &&
              showViewModal.post.media.map((m, i) => (
                <img
                  key={i}
                  src={m.url}
                  alt=""
                  className="w-full h-auto rounded-lg mb-2"
                />
              ))}
          </div>
        </div>
      )}

      {showAnalyticsModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Post Analytics</h3>
              <button
                onClick={() =>
                  setShowAnalyticsModal({ show: false, post: null })
                }
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>Views: {showAnalyticsModal.post.views || 0}</div>
              <div>
                Reactions: {showAnalyticsModal.post.reactions?.length || 0}
              </div>
              <div>
                Comments: {showAnalyticsModal.post.comments?.length || 0}
              </div>
              <div>Shares: {showAnalyticsModal.post.shares?.length || 0}</div>
              <div>
                Engagement Rate:{" "}
                {(((showAnalyticsModal.post.reactions?.length || 0) +
                  (showAnalyticsModal.post.comments?.length || 0) +
                  (showAnalyticsModal.post.shares?.length || 0)) /
                  (showAnalyticsModal.post.views || 1)) *
                  100}
                %
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportsModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Post Reports</h3>
              <button
                onClick={() => setShowReportsModal({ show: false, post: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-2">
              {showReportsModal.post.reports?.map((report, i) => (
                <div key={i} className="border p-2 rounded">
                  <p>Reason: {report.reason}</p>
                  <p>Description: {report.description}</p>
                  <p>Reporter: {report.reporter?.name}</p>
                </div>
              )) || <p>No reports</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPostsManager;
