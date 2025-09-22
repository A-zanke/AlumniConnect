import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { unifiedForumAPI } from '../../services/unifiedForumAPI';
import { 
  FiImage, 
  FiVideo, 
  FiFile, 
  FiSmile, 
  FiBarChart2, 
  FiHash, 
  FiUser, 
  FiX,
  FiSend,
  FiPlus,
  FiBold,
  FiItalic,
  FiLink,
  FiList,
  FiFileText
} from 'react-icons/fi';

const EMOJI_OPTIONS = [
  { name: 'like', emoji: '👍', label: 'Like' },
  { name: 'love', emoji: '❤️', label: 'Love' },
  { name: 'laugh', emoji: '😂', label: 'Laugh' },
  { name: 'wow', emoji: '😮', label: 'Wow' },
  { name: 'sad', emoji: '😢', label: 'Sad' },
  { name: 'angry', emoji: '😠', label: 'Angry' }
];

const CATEGORIES = [
  'Career', 'Higher Studies', 'Internships', 'Hackathons', 'Projects', 'Alumni Queries', 'General'
];

const UnifiedPostCreator = ({ onPostCreated, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    tags: [],
    pollQuestion: '',
    pollOptions: ['', ''],
    pollExpiresAt: '',
    pollAllowMultipleVotes: false,
    visibility: 'public'
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const contentRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle rich text formatting
  const handleFormat = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  }, []);

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    setMediaFiles(prev => [...prev, ...newFiles]);
  };

  // Remove media file
  const removeMediaFile = (id) => {
    setMediaFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
      setShowTagInput(false);
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Add poll option
  const addPollOption = () => {
    setFormData(prev => ({
      ...prev,
      pollOptions: [...prev.pollOptions, '']
    }));
  };

  // Update poll option
  const updatePollOption = (index, value) => {
    setFormData(prev => ({
      ...prev,
      pollOptions: prev.pollOptions.map((option, i) => 
        i === index ? value : option
      )
    }));
  };

  // Remove poll option
  const removePollOption = (index) => {
    setFormData(prev => ({
      ...prev,
      pollOptions: prev.pollOptions.filter((_, i) => i !== index)
    }));
  };

  // Insert emoji into content
  const insertEmoji = (emoji) => {
    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    setFormData(prev => ({ ...prev, content: newText }));
    setShowEmojiPicker(false);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  // Submit post
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.content.trim()) {
      setError('Please write something to post');
      return;
    }

    if (showPollCreator && formData.pollQuestion && formData.pollOptions.filter(opt => opt.trim()).length < 2) {
      setError('Poll must have at least 2 options');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = { ...formData };
      
      // Add poll data if poll is being created
      if (showPollCreator && formData.pollQuestion) {
        submitData.pollQuestion = formData.pollQuestion;
        submitData.pollOptions = formData.pollOptions.filter(opt => opt.trim());
        if (formData.pollExpiresAt) {
          submitData.pollExpiresAt = formData.pollExpiresAt;
        }
        submitData.pollAllowMultipleVotes = formData.pollAllowMultipleVotes;
      } else {
        // Remove poll data if not creating poll
        delete submitData.pollQuestion;
        delete submitData.pollOptions;
        delete submitData.pollExpiresAt;
        delete submitData.pollAllowMultipleVotes;
      }

      // Add media files
      mediaFiles.forEach((mediaFile, index) => {
        submitData[`mediaAttachments`] = mediaFile.file;
      });

      await unifiedForumAPI.createPost(submitData);
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        category: 'General',
        tags: [],
        pollQuestion: '',
        pollOptions: ['', ''],
        pollExpiresAt: '',
        pollAllowMultipleVotes: false,
        visibility: 'public'
      });
      setMediaFiles([]);
      setShowPollCreator(false);
      setIsExpanded(false);
      
      onPostCreated?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel post creation
  const handleCancel = () => {
    setFormData({
      title: '',
      content: '',
      category: 'General',
      tags: [],
      pollQuestion: '',
      pollOptions: ['', ''],
      pollExpiresAt: '',
      pollAllowMultipleVotes: false,
      visibility: 'public'
    });
    setMediaFiles([]);
    setShowPollCreator(false);
    setIsExpanded(false);
    setError('');
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Post creation header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {localStorage.getItem('userName')?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-left px-4 py-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              disabled={isSubmitting}
            >
              What's on your mind?
            </button>
          </div>
        </div>
      </div>

      {/* Expanded post creation form */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Title input */}
              <div>
                <input
                  type="text"
                  placeholder="Add a title (optional)"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={200}
                />
              </div>

              {/* Rich text content editor */}
              <div className="relative">
                <div className="border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500">
                  {/* Formatting toolbar */}
                  <div className="flex items-center justify-between p-2 border-b border-gray-100">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleFormat('bold')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Bold"
                      >
                        <FiBold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormat('italic')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Italic"
                      >
                        <FiItalic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormat('insertUnorderedList')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Bullet List"
                      >
                        <FiList className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormat('formatBlock', 'blockquote')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Quote"
                      >
                        <FiFileText className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Add emoji"
                    >
                      <FiSmile className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content textarea */}
                  <textarea
                    ref={contentRef}
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full p-4 border-0 resize-none focus:ring-0 focus:outline-none min-h-[120px]"
                    required
                  />

                  {/* Emoji picker */}
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                      >
                        <div className="grid grid-cols-6 gap-2">
                          {EMOJI_OPTIONS.map(({ name, emoji, label }) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => insertEmoji(emoji)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title={label}
                            >
                              <span className="text-lg">{emoji}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Media attachments */}
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {mediaFiles.map((mediaFile) => (
                    <div key={mediaFile.id} className="relative group">
                      <img
                        src={mediaFile.preview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeMediaFile(mediaFile.id)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Poll creator */}
              {showPollCreator && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Create Poll</h3>
                    <button
                      type="button"
                      onClick={() => setShowPollCreator(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Poll question"
                    value={formData.pollQuestion}
                    onChange={(e) => handleInputChange('pollQuestion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  
                  <div className="space-y-2">
                    {formData.pollOptions.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updatePollOption(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        {formData.pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {formData.pollOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={addPollOption}
                        className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700"
                      >
                        <FiPlus className="w-4 h-4" />
                        <span>Add option</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.pollAllowMultipleVotes}
                        onChange={(e) => handleInputChange('pollAllowMultipleVotes', e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Allow multiple votes</span>
                    </label>
                  </div>
                  
                  <input
                    type="datetime-local"
                    value={formData.pollExpiresAt}
                    onChange={(e) => handleInputChange('pollExpiresAt', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}

              {/* Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-indigo-600 hover:text-indigo-800"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  {/* Media upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiImage className="w-5 h-5" />
                    <span>Photo</span>
                  </button>
                  
                  {/* Poll creator */}
                  <button
                    type="button"
                    onClick={() => setShowPollCreator(!showPollCreator)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      showPollCreator 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FiBarChart2 className="w-5 h-5" />
                    <span>Poll</span>
                  </button>
                  
                  {/* Tag input */}
                  <button
                    type="button"
                    onClick={() => setShowTagInput(!showTagInput)}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiHash className="w-5 h-5" />
                    <span>Tag</span>
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.content.trim()}
                    className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiSend className="w-4 h-4" />
                    )}
                    <span>Post</span>
                  </button>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </form>

            {/* Tag input */}
            {showTagInput && (
              <div className="px-4 pb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add a tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedPostCreator;
