import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiImage, 
  FiVideo, 
  FiLink, 
  FiX, 
  FiSend, 
  FiGlobe, 
  FiUsers, 
  FiLock,
  FiHash,
  FiAtSign,
  FiInfo
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import RichTextEditor from './RichTextEditor';

const EnhancedPostComposer = ({ 
  onPostCreated, 
  user, 
  onClose,
  initialContent = "",
  isEdit = false,
  postId = null
}) => {
  const [content, setContent] = useState(initialContent);
  const [richContent, setRichContent] = useState(initialContent);
  const [media, setMedia] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [hashtags, setHashtags] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef(null);

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: FiGlobe, desc: 'Anyone can see this' },
    { value: 'connections', label: 'Connections', icon: FiUsers, desc: 'Only your connections' },
    { value: 'private', label: 'Only me', icon: FiLock, desc: 'Only you can see this' }
  ];

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + media.length > 5) {
      toast.error('You can upload maximum 5 files');
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 10MB`);
        return false;
      }
      return true;
    });

    setMedia([...media, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviews((prev) => [...prev, {
          url: reader.result,
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('video/') ? 'video' : 'file',
          name: file.name,
          file
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index) => {
    setMedia(media.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const handleMention = (user) => {
    setMentions(prev => [...prev, user]);
    toast.success(`Mentioned ${user.name}`);
  };

  const handleHashtag = (tag) => {
    if (!hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
      toast.success(`Added #${tag}`);
    }
  };

  const extractHashtagsFromContent = (text) => {
    const matches = text.match(/#[\w]+/g) || [];
    return matches.map(tag => tag.substring(1));
  };

  const extractMentionsFromContent = (text) => {
    const matches = text.match(/@[\w]+/g) || [];
    return matches.map(mention => mention.substring(1));
  };

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) {
      toast.error('Please add some content or media');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('content', content);
      formData.append('richContent', richContent);
      formData.append('visibility', visibility);
      
      // Add extracted hashtags and mentions
      const extractedHashtags = extractHashtagsFromContent(content);
      const extractedMentions = extractMentionsFromContent(content);
      
      formData.append('hashtags', JSON.stringify([...hashtags, ...extractedHashtags]));
      formData.append('mentions', JSON.stringify([...mentions, ...extractedMentions]));
      
      // Add media files
      media.forEach((file, index) => {
        formData.append('media', file);
      });

      const endpoint = isEdit ? `/api/posts/${postId}` : '/api/posts';
      const method = isEdit ? 'PUT' : 'POST';

      await axios({
        method,
        url: endpoint,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(isEdit ? 'Post updated successfully!' : 'Post created successfully!');
      
      if (onPostCreated) {
        onPostCreated();
      }
      
      if (onClose) {
        onClose();
      }
      
      // Reset form
      setContent('');
      setRichContent('');
      setMedia([]);
      setMediaPreviews([]);
      setHashtags([]);
      setMentions([]);
      
    } catch (error) {
      console.error('Error creating/updating post:', error);
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVisibilityIcon = () => {
    const option = visibilityOptions.find(opt => opt.value === visibility);
    return option ? option.icon : FiGlobe;
  };

  const getVisibilityLabel = () => {
    const option = visibilityOptions.find(opt => opt.value === visibility);
    return option ? option.label : 'Public';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
        <h2 className="text-2xl font-bold text-slate-800">
          {isEdit ? 'Edit Post' : 'Create Post'}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <FiX size={24} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={user?.avatarUrl || '/default-avatar.png'}
            alt={user?.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100"
          />
          <div>
            <p className="font-semibold text-slate-800">{user?.name}</p>
            <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Rich Text Editor */}
        <RichTextEditor
          value={content}
          onChange={(value) => {
            setContent(value);
            setRichContent(value);
          }}
          placeholder="What do you want to share? Use **bold**, *italic*, @mentions, #hashtags, and paste links!"
          maxLength={2000}
          onMention={handleMention}
          onHashtag={handleHashtag}
          className="mb-4"
        />

        {/* Media Previews */}
        {mediaPreviews.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-3">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  {preview.type === 'image' ? (
                    <img
                      src={preview.url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-48 object-cover rounded-xl"
                    />
                  ) : preview.type === 'video' ? (
                    <video
                      src={preview.url}
                      className="w-full h-48 object-cover rounded-xl"
                      controls
                    />
                  ) : (
                    <div className="w-full h-48 bg-slate-100 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📄</div>
                        <div className="text-sm text-slate-600">{preview.name}</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hashtags and Mentions */}
        {(hashtags.length > 0 || mentions.length > 0) && (
          <div className="mb-4 p-3 bg-slate-50 rounded-xl">
            <div className="text-sm text-slate-600 mb-2">Added:</div>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-1"
                >
                  <FiHash size={12} />
                  {tag}
                </span>
              ))}
              {mentions.map((mention, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
                >
                  <FiAtSign size={12} />
                  {mention.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Media Options */}
        <div className="flex items-center gap-4 mb-4 p-4 border border-slate-200 rounded-xl">
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 cursor-pointer transition-colors">
            <FiImage size={20} />
            <span className="font-semibold">Photos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
              ref={fileInputRef}
            />
          </label>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 cursor-pointer transition-colors">
            <FiVideo size={20} />
            <span className="font-semibold">Videos</span>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
            />
          </label>
          
          <span className="text-sm text-slate-500">
            {media.length}/5 files
          </span>
        </div>

        {/* Advanced Options */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <FiInfo size={16} />
            <span className="text-sm font-medium">Advanced Options</span>
          </button>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-slate-50 rounded-xl"
              >
                {/* Visibility Options */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Who can see this post?
                  </label>
                  <div className="space-y-2">
                    {visibilityOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <label
                          key={option.value}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            visibility === option.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={option.value}
                            checked={visibility === option.value}
                            onChange={(e) => setVisibility(e.target.value)}
                            className="sr-only"
                          />
                          <Icon size={20} className="text-slate-600" />
                          <div>
                            <div className="font-medium text-slate-800">{option.label}</div>
                            <div className="text-sm text-slate-500">{option.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!content.trim() && media.length === 0)}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              {isEdit ? 'Updating...' : 'Posting...'}
            </>
          ) : (
            <>
              <FiSend size={20} />
              {isEdit ? 'Update Post' : 'Post'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default EnhancedPostComposer;