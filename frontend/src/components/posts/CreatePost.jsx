import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiImage, FiSend, FiX, FiSmile, FiBold, FiItalic,
  FiUnderline, FiAt, FiLoader, FiGlobe, FiUsers, FiLock,
  FiCamera, FiVideo
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { getAvatarUrl } from "../utils/helpers";
import axios from "axios";
import { toast } from "react-hot-toast";
import './CreatePost.css';

const CreatePost = ({ onPostCreated, onClose }) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [users, setUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const EMOJIS = ["😀", "💡", "🚀", "🎉", "👏", "🙌", "🔥", "💯", "❤️", "👍", "🤔", "😂"];

  const VISIBILITY_OPTIONS = [
    { value: "public", label: "Anyone", icon: FiGlobe, desc: "Visible to everyone" },
    { value: "connections", label: "Alumni Network", icon: FiUsers, desc: "Visible to alumni and teachers" },
    { value: "private", label: "Only Me", icon: FiLock, desc: "Only visible to you" }
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get("/api/users/search");
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users for mentions:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  const formatText = (style) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    if (!selectedText) {
      toast.error(`Select text to make it ${style}.`);
      return;
    }
    const newContent = `${content.substring(0, start)}${style === 'bold' ? `**${selectedText}**` : `*${selectedText}*`}${content.substring(end)}`;
    setContent(newContent);
  };

  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    const start = cursorPosition;
    const newContent = `${content.substring(0, start)}${emoji}${content.substring(start)}`;
    setContent(newContent);
    setShowEmojiPicker(false);
    setTimeout(() => textarea.focus(), 0);
  };

  const handleFileSelection = (files) => {
    if (selectedMedia.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 media files.");
      return;
    }
    const newFiles = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image'
    }));
    setSelectedMedia(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelection(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && selectedMedia.length === 0) {
      toast.error("Post cannot be empty. Add text or media.");
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("content", content.trim());
    formData.append("visibility", visibility);
    selectedMedia.forEach(media => formData.append("media", media.file));

    try {
      const { data } = await axios.post("/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Post created successfully! 🎉");
      if (onPostCreated) onPostCreated(data);
      if (onClose) onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVisibility = VISIBILITY_OPTIONS.find(opt => opt.value === visibility);

  return (
    <motion.div className="create-post-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="create-post-container">
        <div className="create-post-header">
          <div className="create-post-user-info">
            <img src={getAvatarUrl(user)} alt={user?.name} className="user-avatar" />
            <div className="user-details">
              <h3 className="create-post-title">Create a Post</h3>
              <div className="visibility-selector">
                <selectedVisibility.icon className="visibility-icon" />
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="visibility-dropdown">
                  {VISIBILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="close-button"><FiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="create-post-form">
          <div className={`textarea-container ${isDragOver ? 'drag-over' : ''}`} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
              className="content-textarea"
            />
            {isDragOver && <div className="drag-overlay"><FiCamera /><span>Drop files to upload</span></div>}
          </div>

          <div className="media-previews">
            {selectedMedia.map((media, index) => (
              <div key={index} className="media-preview-item">
                {media.type === 'video' ? <video src={media.preview} className="media-preview" /> : <img src={media.preview} alt="preview" className="media-preview" />}
                <button type="button" onClick={() => setSelectedMedia(selectedMedia.filter((_, i) => i !== index))} className="remove-media-button"><FiX /></button>
              </div>
            ))}
          </div>

          <div className="post-actions">
            <div className="formatting-toolbar">
              <button type="button" onClick={() => fileInputRef.current.click()} title="Add Media"><FiImage /></button>
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add Emoji"><FiSmile /></button>
              <button type="button" onClick={() => formatText('bold')} title="Bold"><FiBold /></button>
              <button type="button" onClick={() => formatText('italic')} title="Italic"><FiItalic /></button>
            </div>
            <button type="submit" disabled={isSubmitting} className="submit-button">
              {isSubmitting ? <FiLoader className="spinner" /> : <FiSend />}
              <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
            </button>
          </div>

          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="emoji-picker">
              {EMOJIS.map(emoji => <button type="button" key={emoji} onClick={() => insertEmoji(emoji)}>{emoji}</button>)}
            </div>
          )}
        </form>
        <input type="file" ref={fileInputRef} multiple accept="image/*,video/*" onChange={(e) => handleFileSelection(e.target.files)} style={{ display: 'none' }} />
      </div>
    </motion.div>
  );
};

export default CreatePost;
