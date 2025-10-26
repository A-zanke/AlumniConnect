import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiUser, FiSend, FiLink, FiCheck } from "react-icons/fi";
import axios from "axios";
import { toast } from "react-toastify";

const ShareModal = ({ post, onClose, onShared }) => {
  const [connections, setConnections] = useState([]);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await axios.get("/api/connections", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setConnections(response.data?.connections || []);
      } catch (error) {
        console.error("Error fetching connections:", error);
        toast.error("Failed to load connections");
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, []);

  const toggleConnection = (connectionId) => {
    setSelectedConnections((prev) =>
      prev.includes(connectionId)
        ? prev.filter((id) => id !== connectionId)
        : [...prev, connectionId]
    );
  };

  const handleShare = async () => {
    if (selectedConnections.length === 0) {
      toast.error("Please select at least one connection");
      return;
    }

    setSharing(true);
    try {
      await axios.post(
        `/api/posts/${post._id}/share`,
        { connectionIds: selectedConnections, message },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(
        `Successfully shared post with ${selectedConnections.length} connection(s)!`
      );
      // Show animated checkmark before closing
      setTimeout(() => {
        onShared && onShared();
        onClose();
      }, 1500); // Delay to show animation
    } catch (error) {
      console.error("Error sharing post:", error);
      toast.error("Failed to share post");
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/posts/${post._id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Post link copied to clipboard!");
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy link");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Share Post</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <FiX />
              </button>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {/* Post Preview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Post</div>
              <div className="flex items-center gap-2 mb-2">
                {post.user?.avatarUrl ? (
                  <img
                    src={post.user?.avatarUrl}
                    alt={post.user?.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                    <FiUser className="text-gray-600" />
                  </div>
                )}
                <span className="font-medium text-gray-900">
                  {post.user?.name}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {post.content}
              </p>
              {post.media && post.media.length > 0 && (
                <img
                  src={post.media[0].url}
                  alt="Post media"
                  className="w-full h-20 object-cover rounded mt-2"
                />
              )}
            </div>

            {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write something about this post..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Connections List */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Share with connections ({selectedConnections.length} selected)
              </label>

              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading connections...
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No connections found. Connect with other users to share posts!
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {connections.map((connection) => (
                    <motion.label
                      key={connection._id}
                      whileHover={{ scale: 1.02 }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedConnections.includes(connection._id)
                          ? "bg-blue-50 border-2 border-blue-400"
                          : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedConnections.includes(connection._id)}
                        onChange={() => toggleConnection(connection._id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {connection.avatarUrl ? (
                          <img
                            src={connection.avatarUrl}
                            alt={connection.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <FiUser className="text-gray-600" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {connection.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {connection.role} • {connection.department}
                          </div>
                        </div>
                      </div>
                    </motion.label>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyLink}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <FiLink />
                Copy Link
              </motion.button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleShare}
                disabled={selectedConnections.length === 0 || sharing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedConnections.length > 0 && !sharing
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {sharing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <FiSend />
                    </motion.div>
                    Sharing...
                  </>
                ) : (
                  <>
                    <FiSend />
                    Share Post
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
      {/* Success Feedback Overlay */}
      <AnimatePresence>
        {sharing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="bg-white rounded-full p-6 shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <FiCheck className="text-green-500 text-4xl" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default ShareModal;
