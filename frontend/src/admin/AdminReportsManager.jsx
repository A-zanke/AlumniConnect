import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AdminNavbar from "./AdminNavbar.jsx";
import { motion } from "framer-motion";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaEye,
  FaUserSlash,
  FaExclamationTriangle,
  FaChartBar,
} from "react-icons/fa";

const AdminReportsManager = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [analytics, setAnalytics] = useState({});

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let forumReports = [];
      let postReports = [];
      const params = {};
      if (statusFilter !== "all") params.resolved = statusFilter === "resolved";

      if (reportTypeFilter === "all" || reportTypeFilter === "forum") {
        const res = await axios.get("/api/admin/reports", { params });
        forumReports = res.data || [];
      }
      if (
        reportTypeFilter === "all" ||
        reportTypeFilter === "posts" ||
        reportTypeFilter === "comments"
      ) {
        const res = await axios.get("/api/admin/post-reports", { params });
        postReports = res.data || [];
      }

      let allReports = [...forumReports, ...postReports];
      if (reportTypeFilter === "comments") {
        allReports = postReports.filter((r) => r.targetType === "comment");
      } else if (reportTypeFilter === "posts") {
        allReports = postReports.filter((r) => r.targetType === "post");
      }

      allReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReports(allReports);

      // Calculate analytics
      const total = allReports.length;
      const pending = allReports.filter((r) => !r.resolved).length;
      const resolved = total - pending;
      const byType = allReports.reduce((acc, r) => {
        const type =
          r.targetType === "forumPost"
            ? "Forum"
            : r.targetType === "post"
            ? "Post"
            : "Comment";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      const byReason = allReports.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      }, {});
      const mostReportedUsers = allReports.reduce((acc, r) => {
        const key = r.targetId?.userId?._id || r.targetId?.author?._id;
        if (key) acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      setAnalytics({
        total,
        pending,
        resolved,
        byType,
        byReason,
        mostReportedUsers,
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reportTypeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (id, note = "", action = "Resolved") => {
    try {
      await axios.put(`/api/admin/reports/${id}/resolve`, {
        moderatorNote: note,
        action,
      });
      await fetchReports();
    } catch (err) {
      alert("Failed to resolve report");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      await axios.delete(`/api/admin/reports/${id}`);
      await fetchReports();
    } catch (err) {
      alert("Failed to delete report");
    }
  };

  const handleDeleteContent = async (report) => {
    if (!window.confirm("Delete the reported content?")) return;
    try {
      if (report.targetType === "forumPost") {
        await axios.delete(`/api/admin/forum-posts/${report.targetId._id}`);
      } else {
        await axios.delete(`/api/admin/posts/${report.targetId._id}`);
      }
      await fetchReports();
    } catch (err) {
      alert("Failed to delete content");
    }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm("Ban this user?")) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      await fetchReports();
    } catch (err) {
      alert("Failed to ban user");
    }
  };

  const handleBulkResolve = async () => {
    if (selectedReports.length === 0) return;
    const note = prompt("Enter resolution note for selected reports:");
    try {
      await Promise.all(
        selectedReports.map((id) =>
          axios.put(`/api/admin/reports/${id}/resolve`, {
            moderatorNote: note || "",
            action: "Resolved",
          })
        )
      );
      setSelectedReports([]);
      await fetchReports();
    } catch (err) {
      alert("Failed to resolve selected reports");
    }
  };

  const handleBulkDismiss = async () => {
    if (selectedReports.length === 0) return;
    try {
      await Promise.all(
        selectedReports.map((id) =>
          axios.put(`/api/admin/reports/${id}/resolve`, {
            moderatorNote: "Dismissed",
            action: "Dismissed",
          })
        )
      );
      setSelectedReports([]);
      await fetchReports();
    } catch (err) {
      alert("Failed to dismiss selected reports");
    }
  };

  const getStatusBadge = (resolved) => {
    return resolved ? (
      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
        Resolved
      </span>
    ) : (
      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
        Pending
      </span>
    );
  };

  const getSeverityColor = (reason) => {
    const severe = ["Harassment", "Misinformation"];
    return severe.includes(reason) ? "text-red-600" : "text-orange-600";
  };

  const renderPreview = (report) => {
    if (report.targetType === "post") {
      return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Post by {report.targetId?.userId?.name}
          </p>
          <p className="text-gray-800">
            {report.targetId?.content?.substring(0, 100)}...
          </p>
          {report.targetId?.media?.length > 0 && (
            <p className="text-sm text-gray-500">Has media</p>
          )}
        </div>
      );
    } else if (report.targetType === "comment") {
      return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Comment by {report.targetId?.userId?.name}
          </p>
          <p className="text-gray-800">
            {report.targetId?.content?.substring(0, 100)}...
          </p>
        </div>
      );
    } else if (report.targetType === "forumPost") {
      return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Forum Post by {report.targetId?.author?.name}
          </p>
          <p className="font-semibold">{report.targetId?.title}</p>
          <p className="text-gray-800">
            {report.targetId?.content?.substring(0, 100)}...
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <AdminNavbar />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-6"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaChartBar /> Reports Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {analytics.total || 0}
              </p>
              <p className="text-sm text-gray-600">Total Reports</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {analytics.pending || 0}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {analytics.resolved || 0}
              </p>
              <p className="text-sm text-gray-600">Resolved</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {Object.keys(analytics.byReason || {}).length}
              </p>
              <p className="text-sm text-gray-600">Unique Reasons</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
              Reports Management
            </h2>

            <div className="flex flex-col md:flex-row gap-2">
              <select
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Types</option>
                <option value="forum">Forum Posts</option>
                <option value="posts">Community Posts</option>
                <option value="comments">Comments</option>
              </select>
              <div className="flex gap-2">
                {["all", "pending", "resolved"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                      statusFilter === f
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedReports.length > 0 && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={handleBulkResolve}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
              >
                Bulk Resolve ({selectedReports.length})
              </button>
              <button
                onClick={handleBulkDismiss}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold"
              >
                Bulk Dismiss ({selectedReports.length})
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No reports found
                </div>
              ) : (
                reports.map((report) => (
                  <motion.div
                    key={report._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReports([
                              ...selectedReports,
                              report._id,
                            ]);
                          } else {
                            setSelectedReports(
                              selectedReports.filter((id) => id !== report._id)
                            );
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {getStatusBadge(report.resolved)}
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold capitalize">
                            {report.targetType === "forumPost"
                              ? "Forum"
                              : report.targetType}
                          </span>
                          <FaExclamationTriangle
                            className={getSeverityColor(report.reason)}
                          />
                        </div>

                        <p className="text-gray-800 font-semibold mb-2">
                          Reporter:{" "}
                          <a
                            href={`/profile/${report.reporter?._id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {report.reporter?.name}
                          </a>{" "}
                          ({report.reporter?.role})
                        </p>
                        <p className="text-gray-600 mb-2">
                          Reason:{" "}
                          <span className={getSeverityColor(report.reason)}>
                            {report.reason}
                          </span>
                        </p>
                        {report.description && (
                          <p className="text-gray-600 mb-2">
                            Description: {report.description}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Reported:{" "}
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                        {report.resolved && report.resolvedAt && (
                          <p className="text-sm text-gray-500">
                            Resolved:{" "}
                            {new Date(report.resolvedAt).toLocaleString()}
                          </p>
                        )}
                        {report.moderatorNote && (
                          <p className="text-sm text-gray-600 mt-2">
                            <strong>Admin Note:</strong> {report.moderatorNote}
                          </p>
                        )}
                        {renderPreview(report)}
                      </div>

                      <div className="flex flex-col gap-2">
                        {!report.resolved && (
                          <button
                            onClick={() => {
                              const note = prompt(
                                "Enter resolution note (optional):"
                              );
                              const action = window.confirm(
                                "Mark as resolved? (Cancel for dismiss)"
                              )
                                ? "Resolved"
                                : "Dismissed";
                              handleResolve(report._id, note || "", action);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all"
                          >
                            <FaCheckCircle />
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteContent(report)}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all"
                        >
                          <FaTrash />
                          Delete Content
                        </button>
                        <button
                          onClick={() =>
                            handleBanUser(
                              report.targetId?.userId?._id ||
                                report.targetId?.author?._id
                            )
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
                        >
                          <FaUserSlash />
                          Ban User
                        </button>
                        <button
                          onClick={() => handleDelete(report._id)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
                        >
                          <FaTrash />
                          Delete Report
                        </button>
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
                        >
                          <FaEye />
                          View Full
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminReportsManager;
