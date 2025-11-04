import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import AdminShell from "./AdminShell.jsx";
import { Link } from "react-router-dom";
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
        const rawForumReports = res.data || [];
        // Ensure forum reports have the correct targetType
        forumReports = rawForumReports.map(report => ({
          ...report,
          targetType: report.targetType === 'post' ? 'forumPost' : report.targetType,
          source: 'forum'
        }));
        console.log("Processed forum reports:", forumReports); // Debug log
      }
      if (
        reportTypeFilter === "all" ||
        reportTypeFilter === "posts" ||
        reportTypeFilter === "comments"
      ) {
        const res = await axios.get("/api/admin/post-reports", { params });
        postReports = (Array.isArray(res.data) ? res.data : res.data?.reports) || [];
      }
      if (reportTypeFilter === "all" || reportTypeFilter === "messages") {
        try {
          const res = await axios.get("/api/admin/message-reports", { params });
          console.log("Message reports response:", res.data); // Debug log
          const messageReports = (Array.isArray(res.data) ? res.data : res.data?.reports) || [];
          // Ensure message reports have the correct targetType
          const processedMessageReports = messageReports.map(report => ({
            ...report,
            targetType: report.targetType || 'message',
            type: 'message'
          }));
          postReports = [...postReports, ...processedMessageReports];
          console.log("Processed message reports:", processedMessageReports); // Debug log
        } catch (err) {
          console.error("Error fetching message reports:", err);
          // Try alternative endpoint for message reports
          try {
            const res = await axios.get("/api/admin/reports/messages", { params });
            const messageReports = (Array.isArray(res.data) ? res.data : res.data?.reports) || [];
            const processedMessageReports = messageReports.map(report => ({
              ...report,
              targetType: report.targetType || 'message',
              type: 'message'
            }));
            postReports = [...postReports, ...processedMessageReports];
          } catch (err2) {
            console.error("Message reports not available:", err2.message);
          }
        }
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
            : r.targetType === "message"
            ? "Message"
            : r.type === "message"
            ? "Message"
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

  const handleResolve = async (report, note = "", action = "Resolved") => {
    try {
      let endpoint;
      if (report.targetType === 'forumPost') {
        endpoint = `/api/admin/reports/${report._id}/resolve`;
      } else if (report.targetType === 'message' || report.type === 'message') {
        endpoint = `/api/admin/message-reports/${report._id}/resolve`;
      } else {
        endpoint = `/api/admin/post-reports/${report._id}/resolve`;
      }
      await axios.put(endpoint, { moderatorNote: note, action });
      await fetchReports();
    } catch (err) {
      console.error('Failed to resolve report:', err);
      alert("Failed to resolve report: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (report) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      let endpoint;
      if (report.targetType === 'forumPost') {
        endpoint = `/api/admin/reports/${report._id}`;
      } else if (report.targetType === 'message' || report.type === 'message') {
        endpoint = `/api/admin/message-reports/${report._id}`;
      } else {
        endpoint = `/api/admin/post-reports/${report._id}`;
      }
      await axios.delete(endpoint);
      await fetchReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert("Failed to delete report: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteContent = async (report) => {
    if (!window.confirm("Delete the reported content?")) return;
    try {
      // Validate that we have a target ID
      if (!report.targetId || !report.targetId._id) {
        alert("Cannot delete content: No target ID found");
        return;
      }

      const targetId = report.targetId._id;
      
      if (report.targetType === "forumPost") {
        await axios.delete(`/api/forum/${targetId}`);
      } else if (report.targetType === "message" || report.type === "message") {
        // For messages, we can't delete them directly, just resolve the report
        alert("Message content cannot be deleted. Please resolve the report instead.");
        return;
      } else if (report.targetType === "post") {
        await axios.delete(`/api/posts/${targetId}`);
      } else {
        alert("Unknown content type, cannot delete");
        return;
      }
      
      alert("Content deleted successfully");
      await fetchReports();
    } catch (err) {
      console.error('Failed to delete content:', err);
      alert("Failed to delete content: " + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkResolve = async () => {
    if (selectedReports.length === 0) return;
    try {
      await Promise.all(
        selectedReports.map((id) => {
          const rep = reports.find((r) => r._id === id);
          let endpoint;
          if (rep?.targetType === 'forumPost') {
            endpoint = `/api/admin/reports/${id}/resolve`;
          } else if (rep?.targetType === 'message' || rep?.type === 'message') {
            endpoint = `/api/admin/message-reports/${id}/resolve`;
          } else {
            endpoint = `/api/admin/post-reports/${id}/resolve`;
          }
          return axios.put(endpoint, { moderatorNote: 'Bulk resolved', action: 'Resolved' });
        })
      );
      setSelectedReports([]);
      await fetchReports();
    } catch (err) {
      console.error('Failed to resolve selected reports:', err);
      alert("Failed to resolve selected reports");
    }
  };

  const handleBulkDismiss = async () => {
    if (selectedReports.length === 0) return;
    try {
      await Promise.all(
        selectedReports.map((id) => {
          const rep = reports.find((r) => r._id === id);
          let endpoint;
          if (rep?.targetType === 'forumPost') {
            endpoint = `/api/admin/reports/${id}/resolve`;
          } else if (rep?.targetType === 'message' || rep?.type === 'message') {
            endpoint = `/api/admin/message-reports/${id}/resolve`;
          } else {
            endpoint = `/api/admin/post-reports/${id}/resolve`;
          }
          return axios.put(endpoint, { moderatorNote: 'Dismissed', action: 'Dismissed' });
        })
      );
      setSelectedReports([]);
      await fetchReports();
    } catch (err) {
      console.error('Failed to dismiss selected reports:', err);
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
    // Determine the correct page based on report source and type
    const getViewLink = (report) => {
      console.log("Report for link determination:", report); // Debug log
      if (report.targetType === "forumPost" || report.source === "forum") {
        return { url: "/forum", text: "View in forum" };
      } else if (report.targetType === "post" || report.source === "posts") {
        return { url: "/posts", text: "View in posts" };
      } else if (report.targetType === "message") {
        return { url: `/messages/${report.reportedUser?._id}`, text: "Open conversation" };
      }
      // Default fallback
      return { url: "/posts", text: "View content" };
    };

    if (report.targetType === "post") {
      const link = getViewLink(report);
      return (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-slate-200">
          <p className="text-sm text-slate-400">
            Post by {" "}
            <Link to={`/profile/id/${report.targetId?.userId?._id}`} className="text-indigo-300 hover:text-indigo-200">
              {report.targetId?.userId?.name}
            </Link>
            {" · "}
            <Link 
              to={link.url}
              className="underline text-indigo-300 hover:text-indigo-200"
            >
              {link.text}
            </Link>
          </p>
          <p className="mt-1 text-slate-100">
            {report.targetId?.content?.substring(0, 100)}...
          </p>
          {report.targetId?.media?.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">Has media</p>
          )}
        </div>
      );
    } else if (report.targetType === "forumPost") {
      return (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-slate-200">
          <p className="text-sm text-slate-400">
            Forum Post by {" "}
            <Link to={`/profile/id/${report.targetId?.author?._id || report.targetId?.userId?._id}`} className="text-indigo-300 hover:text-indigo-200">
              {report.targetId?.author?.name || report.targetId?.userId?.name}
            </Link>
            {" · "}
            <Link 
              to="/forum"
              className="underline text-indigo-300 hover:text-indigo-200"
            >
              View in forum
            </Link>
          </p>
          <p className="font-semibold text-slate-100">{report.targetId?.title}</p>
          <p className="text-slate-100">
            {report.targetId?.content?.substring(0, 100)}...
          </p>
        </div>
      );
    } else if (report.targetType === "message" || report.type === "message") {
      return (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-slate-200">
          <p className="text-sm text-slate-400">
            Message from {" "}
            <Link to={`/profile/id/${report.reportedUser?._id}`} className="text-indigo-300 hover:text-indigo-200">
              {report.reportedUser?.name}
            </Link>
          </p>
          <p className="text-slate-100">
            {report.messageContent ? `"${report.messageContent.substring(0, 100)}..."` : "Message content not available"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <AdminShell title="Reports Center" subtitle="Review post and forum reports; take actions quickly">
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <FaChartBar /> Reports Analytics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <p className="text-2xl font-bold text-indigo-300">{analytics.total || 0}</p>
              <p className="text-xs text-slate-400">Total Reports</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <p className="text-2xl font-bold text-amber-300">{analytics.pending || 0}</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <p className="text-2xl font-bold text-emerald-300">{analytics.resolved || 0}</p>
              <p className="text-xs text-slate-400">Resolved</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <p className="text-2xl font-bold text-rose-300">{Object.keys(analytics.byReason || {}).length}</p>
              <p className="text-xs text-slate-400">Unique Reasons</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 md:mb-0">Reports Management</h2>

            <div className="flex flex-col md:flex-row gap-2">
              <select value={reportTypeFilter} onChange={(e) => setReportTypeFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-slate-900/70 border border-white/10 text-slate-200">
                <option value="all">All Types</option>
                <option value="forum">Forum Posts</option>
                <option value="posts">Community Posts</option>
                <option value="messages">Messages</option>
              </select>
              <div className="flex gap-2">
                {["all", "pending", "resolved"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                      statusFilter === f
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-white/10 text-slate-200 hover:bg-white/20"
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
              <button onClick={handleBulkResolve} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold">
                Bulk Resolve ({selectedReports.length})
              </button>
              <button onClick={handleBulkDismiss} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold">
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
                <div className="text-center py-12 text-slate-400">No reports found</div>
              ) : (
                reports.map((report) => (
                  <motion.div key={report._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReports([...selectedReports, report._id]);
                          } else {
                            setSelectedReports(selectedReports.filter((id) => id !== report._id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="mb-3 flex items-center gap-3">
                          {getStatusBadge(report.resolved)}
                          <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize bg-indigo-500/20 text-indigo-200">
                            {report.targetType === "forumPost" ? "Forum" : report.targetType}
                          </span>
                          <FaExclamationTriangle className={getSeverityColor(report.reason)} />
                        </div>

                        <p className="text-slate-200 font-semibold mb-2">
                          Reporter:{" "}
                          <Link to={`/profile/id/${report.reporter?._id}`} className="text-indigo-300 hover:text-indigo-200">
                            {report.reporter?.name}
                          </Link>{" "}
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
                              handleResolve(report, note || "", action);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-all"
                          >
                            <FaCheckCircle />
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteContent(report)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition-all"
                        >
                          <FaTrash />
                          Delete Content
                        </button>
                        <button
                          onClick={() => handleDelete(report)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-all"
                        >
                          <FaTrash />
                          Delete Report
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
    </AdminShell>
  );
};

export default AdminReportsManager;
