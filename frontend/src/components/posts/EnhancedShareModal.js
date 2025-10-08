import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiSearch, 
  FiSend, 
  FiUsers, 
  FiCheck,
  FiCopy,
  FiExternalLink
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { getAvatarUrl } from '../utils/helpers';

const EnhancedShareModal = ({ post, onClose, onShared }) => {
  const [connections, setConnections] = useState([]);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/posts/share/connections');
      setConnections(response.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectionToggle = (connection) => {
    setSelectedConnections(prev => {
      const isSelected = prev.some(conn => conn._id === connection._id);
      if (isSelected) {
        return prev.filter(conn => conn._id !== connection._id);
      } else {
        return [...prev, connection];
      }
    });
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await axios.post(`/api/posts/${post._id}/share`, {
        sharedWith: selectedConnections.map(conn => conn._id)
      });

      toast.success(`Post shared with ${selectedConnections.length} connection${selectedConnections.length !== 1 ? 's' : ''}!`);
      
      if (onShared) {
        onShared();
      }
      
      onClose();
    } catch (error) {
      console.error('Error sharing post:', error);
      toast.error('Failed to share post');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/posts/${post._id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const filteredConnections = connections.filter(conn =>
    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
            <h2 className="text-2xl font-bold text-slate-800">Share Post</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Post Preview */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={
                    post.userId?.avatarUrl
                      ? getAvatarUrl(post.userId.avatarUrl)
                      : "/default-avatar.png"
                  }
                  alt={post.userId?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-slate-800">
                    {post.userId?.name}
                  </div>
                  <div className="text-sm text-slate-500 capitalize">
                    {post.userId?.role}
                  </div>
                </div>
              </div>
              <div className="text-slate-700 text-sm line-clamp-3">
                {post.content}
              </div>
              {post.media && post.media.length > 0 && (
                <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                  <FiExternalLink size={14} />
                  {post.media.length} media file{post.media.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Share Options */}
            <div className="space-y-4">
              {/* Copy Link Option */}
              <div className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FiCopy size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Copy Link</div>
                    <div className="text-sm text-slate-500">
                      Share this post via a link
                    </div>
                  </div>
                </button>
              </div>

              {/* Share with Connections */}
              <div className="p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <FiUsers size={20} className="text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Share with Connections</div>
                    <div className="text-sm text-slate-500">
                      Send this post to your connections
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Connections List */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                    </div>
                  ) : filteredConnections.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {searchQuery ? 'No connections found' : 'No connections available'}
                    </div>
                  ) : (
                    filteredConnections.map((connection) => {
                      const isSelected = selectedConnections.some(conn => conn._id === connection._id);
                      return (
                        <button
                          key={connection._id}
                          onClick={() => handleConnectionToggle(connection)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border-2 border-indigo-200'
                              : 'hover:bg-slate-50 border-2 border-transparent'
                          }`}
                        >
                          <img
                            src={
                              connection.avatarUrl
                                ? getAvatarUrl(connection.avatarUrl)
                                : "/default-avatar.png"
                            }
                            alt={connection.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-800">
                              {connection.name}
                            </div>
                            <div className="text-sm text-slate-500 capitalize">
                              {connection.role}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="p-1 bg-indigo-600 rounded-full">
                              <FiCheck size={16} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Selected Count */}
                {selectedConnections.length > 0 && (
                  <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
                    <div className="text-sm font-medium text-indigo-800">
                      {selectedConnections.length} connection{selectedConnections.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                )}

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  disabled={selectedConnections.length === 0 || isSharing}
                  className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSharing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <FiSend size={20} />
                      Share with {selectedConnections.length} connection{selectedConnections.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedShareModal;