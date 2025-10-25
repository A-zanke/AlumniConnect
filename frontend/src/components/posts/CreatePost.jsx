import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiImage,
  FiVideo,
  FiFile,
  FiSmile,
  FiTrash2,
  FiUpload,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import "../../styles/CreatePost.css";

const CreatePost = ({ onClose, onPostCreated }) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const departments = ["CSE", "AI-DS", "E&TC", "Mechanical", "Civil", "Other"];
  const emojis = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "💡", "👏", "🚀", "💯"];

  // Handle department selection
  const handleDepartmentChange = (dept) => {
    if (dept === "All") {
      setSelectedDepartments(["All"]);
    } else {
      setSelectedDepartments((prev) => {
        const filtered = prev.filter((d) => d !== "All");
        if (filtered.includes(dept)) {
          return filtered.filter((d) => d !== dept);
        } else {
          return [...filtered, dept];
        }
      });
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    const validFiles = files.filter((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max size is 10MB.`);
        return false;
      }
      return true;
    });

    setMediaFiles((prev) => [...prev, ...validFiles]);
  };

  // Remove media file
  const removeMedia = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle mentions
  const handleTextChange = async (e) => {
    const text = e.target.value;
    const position = e.target.selectionStart;
    setContent(text);
    setCursorPosition(position);

    // Check for @ mentions
    const beforeCursor = text.substring(0, position);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);

      if (query.length >= 1) {
        try {
          const response = await axios.get(
            `/api/posts/users/search?q=${query}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          setMentionSuggestions(response.data);
          setShowMentions(true);
        } catch (error) {
          console.error("Failed to search users:", error);
        }
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention
  const insertMention = (user) => {
    const beforeCursor = content.substring(0, cursorPosition);
    const afterCursor = content.substring(cursorPosition);
    const beforeMention = beforeCursor.replace(/@\w*$/, "");
    const newContent = `${beforeMention}@${user.username} ${afterCursor}`;

    setContent(newContent);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  // Add emoji
  const addEmoji = (emoji) => {
    const newContent = content + emoji;
    setContent(newContent);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Submit post
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Please add some content or media");
      return;
    }

    if (selectedDepartments.length === 0) {
      toast.error("Please select at least one department");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("content", content);
      selectedDepartments.forEach((dept) => {
        formData.append("departments", dept);
      });

      mediaFiles.forEach((file) => {
        formData.append("media", file);
      });

      const response = await axios.post("/api/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Post created successfully!");
      onPostCreated(response.data);
    } catch (error) {
      console.error("Failed to create post:", error);
      toast.error(error.response?.data?.message || "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="create-post-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="create-post-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="create-post-header">
          <div className="header-content">
            <img
              src={
                user?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${user?.name}&background=random`
              }
              alt={user?.name}
              className="user-avatar"
            />
            <div>
              <h3>Create Post</h3>
              <p>Share with your department community</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="create-post-form">
          {/* Department Selection */}
          <div className="department-selection">
            <label>Visible to departments:</label>
            <div className="department-chips">
              <button
                type="button"
                className={`department-chip ${
                  selectedDepartments.includes("All") ? "selected" : ""
                }`}
                onClick={() => handleDepartmentChange("All")}
              >
                <FiCheck className="check-icon" />
                All Departments
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  className={`department-chip ${
                    selectedDepartments.includes(dept) ? "selected" : ""
                  }`}
                  onClick={() => handleDepartmentChange(dept)}
                >
                  <FiCheck className="check-icon" />
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Content Input */}
          <div className="content-input-container">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              placeholder="Share an update, ask a question, or post an achievement... Use @ to mention someone!"
              className="content-textarea"
              rows={4}
            />

            {/* Mention Suggestions */}
            <AnimatePresence>
              {showMentions && mentionSuggestions.length > 0 && (
                <motion.div
                  className="mention-suggestions"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {mentionSuggestions.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      className="mention-suggestion"
                      onClick={() => insertMention(user)}
                    >
                      <img
                        src={
                          user.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${user.name}&background=random`
                        }
                        alt={user.name}
                        className="suggestion-avatar"
                      />
                      <div>
                        <div className="suggestion-name">{user.name}</div>
                        <div className="suggestion-username">
                          @{user.username}
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Media Preview */}
          <AnimatePresence>
            {mediaFiles.length > 0 && (
              <motion.div
                className="media-preview-grid"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {mediaFiles.map((file, index) => (
                  <motion.div
                    key={index}
                    className="media-preview-item"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <button
                      type="button"
                      className="remove-media-btn"
                      onClick={() => removeMedia(index)}
                    >
                      <FiTrash2 />
                    </button>

                    {file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="media-preview-image"
                      />
                    ) : file.type.startsWith("video/") ? (
                      <video
                        src={URL.createObjectURL(file)}
                        className="media-preview-video"
                        controls
                      />
                    ) : (
                      <div className="media-preview-file">
                        <FiFile />
                        <span>{file.name}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                className="emoji-picker"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    className="emoji-btn"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Actions */}
          <footer className="create-post-footer">
            <div className="footer-actions">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx"
              />

              <button
                type="button"
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Add images"
              >
                <FiImage />
              </button>

              <button
                type="button"
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Add video"
              >
                <FiVideo />
              </button>

              <button
                type="button"
                className="action-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add emoji"
              >
                <FiSmile />
              </button>
            </div>

            <div className="submit-section">
              {selectedDepartments.length === 0 && (
                <div className="warning">
                  <FiAlertCircle />
                  Select departments
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting || selectedDepartments.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <FiUpload className="spinning" />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </footer>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreatePost;
