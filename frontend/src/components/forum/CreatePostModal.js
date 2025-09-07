import React, { useMemo, useRef, useState } from 'react';
import { forumAPI } from '../utils/forumApi';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPaperclip, FiType, FiTag, FiUser, FiImage, FiFileText, FiLink, FiCheck } from 'react-icons/fi';

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
    pollOptions: '' // comma separated
  });
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const contentRef = useRef(null);
  const [tagQuery, setTagQuery] = useState('');

  const filteredTags = useMemo(
    () => TAG_SUGGESTIONS.filter(t => t.toLowerCase().includes(tagQuery.toLowerCase()) && !form.tags.includes(t)).slice(0,6),
    [tagQuery, form.tags]
  );

  const applyFormat = (cmd) => {
    document.execCommand(cmd, false, null);
    setForm(f => ({ ...f, content: contentRef.current?.innerHTML || '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setErr('Please fill in the title and content');
      setTimeout(() => setErr(''), 800);
      return;
    }
    const payload = {
      ...form,
      tags: form.tags,
      mentions: form.mentions ? form.mentions.split(',').map(s => s.trim()).filter(Boolean) : [],
      mediaType
    };
    if (mediaType === 'link' && link) payload.mediaLink = link;
    if (form.pollQuestion && form.pollOptions) {
      payload.pollQuestion = form.pollQuestion.trim();
      payload.pollOptions = form.pollOptions.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (mediaType !== 'link' && media) payload.media = media;

    await forumAPI.createPost(payload);
    onCreated && onCreated();
    onClose();
  };

  const addTag = (t) => {
    setForm(f => ({ ...f, tags: Array.from(new Set([...(f.tags || []), t])) }));
    setTagQuery('');
  };
  const removeTag = (t) => setForm(f => ({ ...f, tags: (f.tags || []).filter(x => x !== t) }));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      >
        <motion.form
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
            <div className="font-semibold">Create Forum Post</div>
            <button type="button" onClick={onClose} className="hover:opacity-80"><FiX /></button>
          </div>

          <div className="p-6 space-y-4">
            {err && (
              <motion.div
                initial={{ x: -4 }} animate={{ x: [0, -6, 6, -3, 3, 0] }} transition={{ duration: 0.35 }}
                className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm"
              >
                {err}
              </motion.div>
            )}

            {/* Title */}
            <div className="flex items-center gap-2">
              <FiType className="text-indigo-600" />
              <input
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            {/* Rich text (lightweight) */}
            <div>
              <div className="flex items-center gap-2 text-sm mb-2">
                <button type="button" onClick={() => applyFormat('bold')} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">B</button>
                <button type="button" onClick={() => applyFormat('italic')} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">I</button>
                <button type="button" onClick={() => applyFormat('insertUnorderedList')} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">• List</button>
              </div>
              <div
                ref={contentRef}
                contentEditable
                className="min-h-[140px] w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
                onInput={() => setForm(f => ({ ...f, content: contentRef.current?.innerHTML || '' }))}
                placeholder="Write your content..."
              />
            </div>

            {/* Category + Anonymous */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="px-3 py-2 border rounded-lg"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <FiUser className="text-indigo-600" />
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={e => setForm({ ...form, isAnonymous: e.target.checked })}
                />
                Post anonymously
              </label>
            </div>

            {/* Tags with autocomplete */}
            <div>
              <div className="flex items-center gap-2">
                <FiTag className="text-indigo-600" />
                <input
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="Add tag"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagQuery.trim()) { e.preventDefault(); addTag(tagQuery.trim()); }
                  }}
                />
                <button type="button" onClick={() => tagQuery.trim() && addTag(tagQuery.trim())} className="px-3 py-2 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                  <FiCheck />
                </button>
              </div>
              {filteredTags.length > 0 && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredTags.map(t => (
                    <button key={t} type="button" onClick={() => addTag(t)} className="px-2 py-1 rounded bg-gray-50 hover:bg-indigo-50 text-sm">
                      #{t}
                    </button>
                  ))}
                </div>
              )}
              {form.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.tags.map(t => (
                    <span key={t} className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs cursor-pointer" onClick={() => removeTag(t)}>
                      #{t} ×
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Polls */}
            <div className="grid md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="Poll question (optional)" value={form.pollQuestion} onChange={e => setForm({ ...form, pollQuestion: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Poll options (comma separated)" value={form.pollOptions} onChange={e => setForm({ ...form, pollOptions: e.target.value })} />
            </div>

            {/* Attachment */}
            <div className="grid md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <FiPaperclip className="text-indigo-600" />
                <select className="px-3 py-2 border rounded-lg flex-1" value={mediaType} onChange={e => { setMediaType(e.target.value); setMedia(null); setLink(''); }}>
                  <option value="">No attachment</option>
                  <option value="image">Image</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                </select>
              </div>
              {mediaType && mediaType !== 'link' && (
                <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer">
                  {mediaType === 'image' ? <FiImage className="text-indigo-600" /> : <FiFileText className="text-indigo-600" />}
                  <span className="text-sm text-gray-600">{media ? media.name : 'Choose file'}</span>
                  <input type="file" className="hidden" accept={mediaType === 'image' ? 'image/*' : 'application/pdf'} onChange={e => setMedia(e.target.files?.[0] || null)} />
                </label>
              )}
              {mediaType === 'link' && (
                <div className="flex items-center gap-2">
                  <FiLink className="text-indigo-600" />
                  <input className="px-3 py-2 border rounded-lg flex-1" placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2">
            <button type="button" className="px-4 py-2 border rounded-lg" onClick={onClose}>Cancel</button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="relative overflow-hidden px-5 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600"
              type="submit"
            >
              <span className="relative z-10">Post</span>
              <span className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition" />
            </motion.button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreatePostModal;