import React, { useMemo, useRef, useState } from 'react';
import { forumAPI } from '../utils/forumApi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, FiPaperclip, FiType, FiTag, FiUser, FiImage, 
  FiFileText, FiLink, FiCheck, FiTrash2 
} from 'react-icons/fi';
import { toast } from 'react-toastify';

const CATEGORIES = ['Career','Higher Studies','Internships','Hackathons','Projects','Alumni Queries'];
const TAG_SUGGESTIONS = ['AI','Internship','GRE','DSA','GATE','Resume','Interview','ML','Hackathon','Research','OpenSource'];

const CreatePostModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'Career',
    isAnonymous: false,
    tags: [],
    mentions: '',
    pollQuestion: '',
    pollOptions: ''
  });
  const [media, setMedia] = useState([]);
  const [links, setLinks] = useState(['']);
  const [err, setErr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = useRef(null);
  const [tagQuery, setTagQuery] = useState('');

  const filteredTags = useMemo(
    () => TAG_SUGGESTIONS.filter(t => 
      t.toLowerCase().includes(tagQuery.toLowerCase()) && 
      !form.tags.includes(t)
    ).slice(0,6),
    [tagQuery, form.tags]
  );

  const applyFormat = (cmd) => {
    document.execCommand(cmd, false, null);
    setForm(f => ({ ...f, content: contentRef.current?.innerHTML || '' }));
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    if (media.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setMedia(prev => [...prev, ...files]);
  };

  const removeMedia = (index) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const addLink = () => {
    setLinks(prev => [...prev, '']);
  };

  const updateLink = (index, value) => {
    setLinks(prev => prev.map((link, i) => i === index ? value : link));
  };

  const removeLink = (index) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setErr('Please fill in the title and content');
      setTimeout(() => setErr(''), 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        tags: form.tags,
        mentions: form.mentions ? form.mentions.split(',').map(s => s.trim()).filter(Boolean) : [],
        media: media,
        mediaLinks: links.filter(link => link.trim())
      };

      if (form.pollQuestion && form.pollOptions) {
        payload.pollQuestion = form.pollQuestion.trim();
        payload.pollOptions = form.pollOptions.split(',').map(s => s.trim()).filter(Boolean);
      }

      await forumAPI.createPost(payload);
      toast.success('Post created successfully!');
      onCreated && onCreated();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
      setErr('Failed to create post. Please try again.');
      setTimeout(() => setErr(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = (t) => {
    setForm(f => ({ ...f, tags: Array.from(new Set([...(f.tags || []), t])) }));
    setTagQuery('');
  };

  const removeTag = (t) => setForm(f => ({ ...f, tags: (f.tags || []).filter(x => x !== t) }));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      >
        <motion.form
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: 10, opacity: 0 }}
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between sticky top-0">
            <div className="font-semibold text-lg">Create Forum Post</div>
            <button type="button" onClick={onClose} className="hover:opacity-80">
              <FiX />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Error Message */}
            {err && (
              <motion.div
                initial={{ x: -4 }} 
                animate={{ x: [0, -6, 6, -3, 3, 0] }} 
                transition={{ duration: 0.35 }}
                className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm"
              >
                {err}
              </motion.div>
            )}

            {/* Title */}
            <div className="flex items-center gap-3">
              <FiType className="text-blue-600" />
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                placeholder="What's your post about?"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            {/* Rich Text Content */}
            <div>
              <div className="flex items-center gap-2 text-sm mb-2">
                <button type="button" onClick={() => applyFormat('bold')} className="px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                  <strong>B</strong>
                </button>
                <button type="button" onClick={() => applyFormat('italic')} className="px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                  <em>I</em>
                </button>
                <button type="button" onClick={() => applyFormat('insertUnorderedList')} className="px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                  • List
                </button>
              </div>
              <div
                ref={contentRef}
                contentEditable
                className="min-h-[120px] w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                onInput={() => setForm(f => ({ ...f, content: contentRef.current?.innerHTML || '' }))}
                placeholder="Share your thoughts..."
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>

            {/* Category + Anonymous */}
            <div className="flex flex-wrap items-center gap-4">
              <select
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <FiUser className="text-blue-600" />
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={e => setForm({ ...form, isAnonymous: e.target.checked })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Post anonymously
              </label>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FiTag className="text-blue-600" />
                <input
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Add tag"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagQuery.trim()) { 
                      e.preventDefault(); 
                      addTag(tagQuery.trim()); 
                    }
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => tagQuery.trim() && addTag(tagQuery.trim())} 
                  className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  <FiCheck />
                </button>
              </div>

              {/* Tag Suggestions */}
              {filteredTags.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {filteredTags.map(t => (
                    <button 
                      key={t} 
                      type="button" 
                      onClick={() => addTag(t)} 
                      className="px-3 py-1 rounded-full bg-gray-50 hover:bg-blue-50 text-sm"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Tags */}
              {form.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map(t => (
                    <span 
                      key={t} 
                      className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm cursor-pointer hover:bg-blue-100" 
                      onClick={() => removeTag(t)}
                    >
                      #{t} ×
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Media Upload */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <FiImage className="text-blue-600" />
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                  <span>Add Images ({media.length}/5)</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    multiple 
                    onChange={handleMediaChange}
                    disabled={media.length >= 5}
                  />
                </label>
              </div>

              {/* Media Preview */}
              {media.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {media.map((file, idx) => (
                    <div key={idx} className="relative">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FiFileText className="text-gray-500" />
                          <span className="text-xs text-gray-600 ml-1">{file.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <FiLink className="text-blue-600" />
                <span className="font-medium">Add Links</span>
                <button
                  type="button"
                  onClick={addLink}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                  + Add Link
                </button>
              </div>
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="https://example.com"
                    value={link}
                    onChange={(e) => updateLink(idx, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>

            {/* Poll */}
            <div className="grid md:grid-cols-2 gap-4">
              <input 
                className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-200 outline-none" 
                placeholder="Poll question (optional)" 
                value={form.pollQuestion} 
                onChange={e => setForm({ ...form, pollQuestion: e.target.value })} 
              />
              <input 
                className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-200 outline-none" 
                placeholder="Poll options (comma separated)" 
                value={form.pollOptions} 
                onChange={e => setForm({ ...form, pollOptions: e.target.value })} 
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
            <button 
              type="button" 
              className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-100" 
              onClick={onClose}
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-2 rounded-xl text-white font-medium ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </motion.button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreatePostModal;