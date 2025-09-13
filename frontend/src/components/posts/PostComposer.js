import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { FiImage, FiX, FiSend } from 'react-icons/fi';
import { motion } from 'framer-motion';

const ACCEPTED_IMAGE = ['image/jpeg','image/png','image/gif','image/webp'];
const ACCEPTED_VIDEO = ['video/mp4','video/webm','video/ogg'];

const CreatePost = ({ onPosted }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);

  // Check if user can create posts
  const canCreatePost = user?.role === 'teacher' || user?.role === 'alumni' || user?.role === 'admin';

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked.slice(0,5));
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const submitPost = async (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) {
      toast.error('Write something or attach media');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('content', content);
      form.append('visibility', visibility);
      files.forEach(f => form.append('media', f));
      await axios.post('/api/posts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Posted successfully!');
      setContent(''); 
      setFiles([]);
      onPosted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally {
      setLoading(false);
    }
  };

  if (!canCreatePost) {
    return null; // Don't show create post for students
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{user?.name}</h3>
          <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
        </div>
      </div>

      <form onSubmit={submitPost} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
          rows={4}
          placeholder="What's on your mind?"
        />
        
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Attachments:</p>
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700 truncate max-w-32">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size/1024/1024).toFixed(2)} MB)</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <FiImage className="text-gray-500" size={20} />
              <span className="text-sm text-gray-600">Photo/Video</span>
              <input
                type="file"
                multiple
                accept={ACCEPTED_IMAGE.concat(ACCEPTED_VIDEO).join(',')}
                onChange={handleFiles}
                className="hidden"
              />
            </label>
            
            <select 
              value={visibility} 
              onChange={(e) => setVisibility(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="public">🌍 Public</option>
              <option value="connections">👥 Connections</option>
              <option value="private">🔒 Only me</option>
            </select>
          </div>

          <motion.button
            type="submit"
            disabled={loading || (!content.trim() && files.length === 0)}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiSend size={16} />
            )}
            <span>{loading ? 'Posting...' : 'Post'}</span>
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreatePost;
