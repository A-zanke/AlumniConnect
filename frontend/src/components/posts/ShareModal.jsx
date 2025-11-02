import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiSend } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-toastify';

const ShareModal = ({ show, onClose, post, onShared }) => {
  const [connections, setConnections] = useState([]);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      fetchConnections();
    }
  }, [show]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/connections', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const connectionsData = Array.isArray(response.data) ? response.data : [];
      setConnections(connectionsData);
    } catch (error) {
      console.error('Failed to load connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const toggleConnection = (connId) => {
    setSelectedConnections((prev) =>
      prev.includes(connId) ? prev.filter((id) => id !== connId) : [...prev, connId]
    );
  };

  const handleShare = async () => {
    if (selectedConnections.length === 0) {
      toast.error('Please select at least one connection');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`/api/posts/${post?._id}/share`, {
        connectionIds: selectedConnections,
        message
      });
      toast.success('Post shared successfully!');
      onShared?.();
      handleClose();
    } catch (error) {
      console.error('Failed to share post:', error);
      toast.error('Failed to share post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedConnections([]);
    setMessage('');
    onClose?.();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Share Post</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {post && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">
                  {post.user?.name || 'Post'} • {new Date(post.createdAt).toLocaleString()}
                </p>
                <p className="text-sm font-medium text-gray-900 line-clamp-3">
                  {post.content}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something about this post..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Share with connections
                </label>
                <span className="text-xs text-gray-500">
                  {selectedConnections.length} selected
                </span>
              </div>

              <div className="border border-gray-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-gray-100">
                {loading ? (
                  <div className="py-10 text-center text-sm text-gray-500">
                    Loading connections...
                  </div>
                ) : connections.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500 px-4">
                    No connections found yet. Start connecting to share posts!
                  </div>
                ) : (
                  connections.map((connection) => (
                    <label
                      key={connection._id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedConnections.includes(connection._id)}
                        onChange={() => toggleConnection(connection._id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {connection.avatarUrl ? (
                          <img
                            src={connection.avatarUrl}
                            alt={connection.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <FiUser className="text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {connection.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {[connection.role, connection.department].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={loading || selectedConnections.length === 0}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sharing...' : `Share${selectedConnections.length ? ` (${selectedConnections.length})` : ''}`}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ShareModal;
