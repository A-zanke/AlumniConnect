import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import AdminNavbar from './AdminNavbar.jsx';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaTrash, FaEye } from 'react-icons/fa';

const AdminReportsManager = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.resolved = filter === 'resolved';
      const res = await axios.get('/api/admin/reports', { params });
      setReports(res.data || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleResolve = async (id, note = '') => {
    try {
      await axios.put(`/api/admin/reports/${id}/resolve`, { moderatorNote: note });
      await fetchReports();
    } catch (err) {
      alert('Failed to resolve report');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await axios.delete(`/api/admin/reports/${id}`);
      await fetchReports();
    } catch (err) {
      alert('Failed to delete report');
    }
  };

  const getStatusBadge = (resolved) => {
    return resolved ? (
      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Resolved</span>
    ) : (
      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">Pending</span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <AdminNavbar />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">Reports Management</h2>
            
            <div className="flex gap-2">
              {['all', 'pending', 'resolved'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                    filter === f 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No reports found</div>
              ) : (
                reports.map((report) => (
                  <motion.div
                    key={report._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {getStatusBadge(report.resolved)}
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold capitalize">
                            {report.targetType}
                          </span>
                        </div>
                        
                        <p className="text-gray-800 font-semibold mb-2">
                          Reporter: {report.reporter?.name} ({report.reporter?.role})
                        </p>
                        <p className="text-gray-600 mb-2">Reason: {report.reason}</p>
                        <p className="text-sm text-gray-500">
                          Reported: {new Date(report.createdAt).toLocaleString()}
                        </p>
                        {report.moderatorNote && (
                          <p className="text-sm text-gray-600 mt-2">
                            <strong>Admin Note:</strong> {report.moderatorNote}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!report.resolved && (
                          <button
                            onClick={() => {
                              const note = prompt('Enter resolution note (optional):');
                              handleResolve(report._id, note || '');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all"
                          >
                            <FaCheckCircle />
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(report._id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
                        >
                          <FaTrash />
                          Delete
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