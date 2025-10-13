import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiImage, FiSmile, FiTrash2, FiVideo, FiX } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Mention } from 'quill-mention';
import 'quill-mention/dist/quill.mention.css';
import EmojiPicker from 'emoji-picker-react';
import DOMPurify from 'dompurify';
import './CreatePost.css';

// HARDEN QUILL KEYBOARD DEFAULTS BEFORE REGISTERING MODULES
// Some Quill builds have missing default bindings; quill-mention expects arrays it can unshift into.
const Keyboard = Quill.import('modules/keyboard');
if (!Keyboard.DEFAULTS) Keyboard.DEFAULTS = { bindings: {} }; // Safety net [web:43]
if (!Keyboard.DEFAULTS.bindings) Keyboard.DEFAULTS.bindings = {}; // Safety net [web:43]
const ensureArrayBinding = (key) => {
  const b = Keyboard.DEFAULTS.bindings[key];
  if (b === undefined) {
    Keyboard.DEFAULTS.bindings[key] = []; // make it an array so .unshift works [web:43]
  } else if (!Array.isArray(b)) {
    Keyboard.DEFAULTS.bindings[key] = [b]; // normalize to array for .unshift [web:43]
  }
};
['tab', 'enter'].forEach(ensureArrayBinding); // tab is the one quill-mention touches; enter is common too [web:74]

// REGISTER MENTION MODULE AFTER PATCH
Quill.register('modules/mention', Mention); // proper module registration for Quill 2 [web:42][web:43]

const CreatePost = ({ onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [connections, setConnections] = useState([]);

  // Load connections for @mentions
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/users/connections', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setConnections((res.data || []).map((c) => ({ id: c._id, value: c.name })));
      } catch (e) {
        console.error(e);
        toast.error('Could not load @mention suggestions.');
      }
    };
    load();
  }, []);

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    setMediaFiles((prev) => [...prev, ...picked].slice(0, 5));
  };

  const removeMedia = (idx) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });
    if ((clean === '<p><br></p>' || clean.trim() === '') && mediaFiles.length === 0) {
      toast.error('Please write something or add media.');
      return;
    }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('content', clean);
      mediaFiles.forEach((f) => fd.append('media', f));

      const res = await axios.post('/api/posts', fd, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      toast.success('Post created!');
      onPostCreated(res.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quillModules = useMemo(
    () => ({
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
      ],
      mention: {
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ['@'],
        source: (searchTerm, renderList) => {
          const list =
            searchTerm?.length > 0
              ? connections.filter((c) =>
                  c.value.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : connections;
          renderList(list, searchTerm);
        },
      },
      // Optional: ensure keyboard module has arrays to avoid any 3rd-party module touching non-arrays
      keyboard: {
        bindings: {
          tab: Keyboard.DEFAULTS.bindings.tab,
          enter: Keyboard.DEFAULTS.bindings.enter,
        },
      },
    }),
    [connections]
  );

  const onEmojiClick = (emoji) => {
    setContent((prev) => prev + (emoji?.emoji || ''));
    setShowEmojiPicker(false);
  };

  return (
    <motion.div className="create-post-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="create-post-modal" initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <header className="create-post-header">
          <h2>Create a Professional Post</h2>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="create-post-form">
          <div className="editor-container">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              formats={['bold', 'italic', 'underline', 'list', 'bullet', 'mention']}
              placeholder="Share an update, ask a question, or post an achievement..."
            />
          </div>

          <div className="media-preview-grid">
            {mediaFiles.map((file, i) => (
              <div key={i} className="preview-item">
                <button type="button" className="remove-media-btn" onClick={() => removeMedia(i)}>
                  <FiTrash2 />
                </button>
                {file.type.startsWith('image') ? (
                  <img src={URL.createObjectURL(file)} alt="preview" />
                ) : (
                  <div className="file-icon-preview">
                    <FiVideo />
                    <span>{file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <footer className="create-post-footer">
            <div className="footer-actions">
              <label className="icon-btn">
                <FiImage />
                <input type="file" multiple hidden onChange={handleFileChange} accept="image/*" />
              </label>
              <label className="icon-btn">
                <FiVideo />
                <input type="file" multiple hidden onChange={handleFileChange} accept="video/*" />
              </label>
              <button type="button" className="icon-btn" onClick={() => setShowEmojiPicker((s) => !s)}>
                <FiSmile />
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker-container">
                  <EmojiPicker onEmojiClick={(_, e) => onEmojiClick(e)} />
                </div>
              )}
            </div>
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </footer>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreatePost;
