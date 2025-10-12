// # 🔧 FIXED ShareModal.js - Compatible with Posts (not Forum)

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiUser, FiSend } from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";

const ShareModal = ({ post, onClose, onShared }) => {
  const [connections, setConnections] = useState([]);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        // 🔧 FIX: Use correct API endpoint for posts
        const response = await axios.get("/api/connections");
        setConnections(response.data || []);
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
      // 🔧 FIX: Use posts API instead of forum API
      await axios.post(`/api/posts/${post._id}/share`, {
        message,
        connectionIds: selectedConnections,
      });

      toast.success(
        `Post shared with ${selectedConnections.length} connection(s)!`
      );
      onShared && onShared();
      onClose();
    } catch (error) {
      console.error("Error sharing post:", error);
      toast.error("Failed to share post");
    } finally {
      setSharing(false);
    }
  };

  // 🔧 FIX: Handle posts without category (forum-specific field)
  const getPostPreview = () => {
    if (!post) return null;

    return {
      title: post.content
        ? post.content.length > 100
          ? post.content.substring(0, 100) + "..."
          : post.content
        : "Shared post",
      content: post.content || "",
      category: post.category || "General", // Default category for posts
      user: post.user || {},
    };
  };

  const postPreview = getPostPreview();
  if (!postPreview) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Post Preview */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={postPreview.user.avatarUrl || "/default-avatar.png"}
                alt={postPreview.user.name || "User"}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-gray-900">
                  {postPreview.user.name || "Anonymous"}
                </p>
                <p className="text-sm text-gray-600">{postPreview.category}</p>
              </div>
            </div>
            <div className="text-gray-800">
              <p>{postPreview.content}</p>
              {post.media && post.media.length > 0 && (
                <p className="text-sm text-gray-500 mt-2 italic">
                  + {post.media.length} media file
                  {post.media.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
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
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Share with connections ({selectedConnections.length} selected)
            </h3>

            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Loading connections...
                </div>
              ) : connections.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No connections found. Connect with other users to share posts!
                </div>
              ) : (
                <div className="p-2">
                  {connections.map((connection) => (
                    <label
                      key={connection._id}
                      className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedConnections.includes(connection._id)}
                        onChange={() => toggleConnection(connection._id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex items-center">
                        {connection.avatarUrl ? (
                          <img
                            src={connection.avatarUrl}
                            alt={connection.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <FiUser className="text-gray-600" size={20} />
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">
                            {connection.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {connection.role} • {connection.department}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={selectedConnections.length === 0 || sharing}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedConnections.length > 0 && !sharing
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {sharing ? "Sharing..." : "Share Post"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ShareModal;
