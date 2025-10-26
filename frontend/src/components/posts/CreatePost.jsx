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
  FiBold,
  FiItalic,
  FiList,
  FiLink,
  FiTag,
  FiEye,
  FiUsers,
  FiSave,
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

  // New states for enhancements
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [popularTags, setPopularTags] = useState([]);
  const [visibility, setVisibility] = useState("public");
  const [charCount, setCharCount] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [linkPreviews, setLinkPreviews] = useState([]);
  const [altTexts, setAltTexts] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  const departments = ["CSE", "AI-DS", "E&TC", "Mechanical", "Civil", "Other"];
  const emojis = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "💡", "👏", "🚀", "💯"];

  // Draft saving
  useEffect(() => {
    const draft = localStorage.getItem("createPostDraft");
    if (draft) {
      const parsedDraft = JSON.parse(draft);
      setContent(parsedDraft.content || "");
      setSelectedDepartments(parsedDraft.selectedDepartments || []);
      setTags(parsedDraft.tags || []);
      setVisibility(parsedDraft.visibility || "public");
      setAltTexts(parsedDraft.altTexts || {});
      setCharCount(parsedDraft.content?.length || 0);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const draft = {
        content,
        selectedDepartments,
        tags,
        visibility,
        altTexts,
      };
      localStorage.setItem("createPostDraft", JSON.stringify(draft));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 30000);
    return () => clearInterval(interval);
  }, [content, selectedDepartments, tags, visibility, altTexts]);

  // Fetch popular tags on mount
  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        const response = await axios.get("/api/posts/tags/popular");
        setPopularTags(response.data.slice(0, 10));
      } catch (error) {
        console.error("Failed to fetch popular tags:", error);
      }
    };
    fetchPopularTags();
  }, []);

  // Character count
  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  // Link preview generation
  useEffect(() => {
    const urls = content.match(/https?:\/\/[^\s]+/g);
    if (urls) {
      urls.forEach(async (url) => {
        if (!linkPreviews.some((p) => p.url === url)) {
          try {
            const response = await axios.get(
              `/api/link-preview?url=${encodeURIComponent(url)}`
            );
            setLinkPreviews((prev) => [...prev, { url, ...response.data }]);
          } catch (error) {
            console.error("Failed to fetch link preview:", error);
          }
        }
      });
    }
  }, [content]);

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

  // Drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileChange({ target: { files } });
  };

  // Remove media file
  const removeMedia = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setAltTexts((prev) => {
      const newAltTexts = { ...prev };
      delete newAltTexts[index];
      return newAltTexts;
    });
  };

  // Reorder media
  const reorderMedia = (fromIndex, toIndex) => {
    setMediaFiles((prev) => {
      const newFiles = [...prev];
      const [moved] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, moved);
      return newFiles;
    });
  };

  // Handle alt text change
  const handleAltTextChange = (index, alt) => {
    setAltTexts((prev) => ({ ...prev, [index]: alt }));
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

  // Formatting toolbar
  const insertFormatting = (format) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let formattedText = "";

    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "list":
        formattedText = `- ${selectedText}`;
        break;
      default:
        break;
    }

    const newContent =
      content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    textarea.focus();
    textarea.setSelectionRange(
      start + formattedText.length,
      start + formattedText.length
    );
  };

  // Tag handling
  const handleTagInputChange = async (e) => {
    const value = e.target.value;
    setTagInput(value);

    if (value.length >= 2) {
      try {
        const response = await axios.get(`/api/posts/tags/search?q=${value}`);
        setTagSuggestions(response.data);
        setShowTagSuggestions(true);
      } catch (error) {
        console.error("Failed to search tags:", error);
      }
    } else {
      setShowTagSuggestions(false);
    }
  };

  const addTag = (tag) => {
    if (tags.length >= 5) {
      toast.error("Maximum 5 tags allowed");
      return;
    }
    if (!tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!content.trim() && mediaFiles.length === 0) {
      errors.content = "Please add some content or media";
    }
    if (selectedDepartments.length === 0) {
      errors.departments = "Please select at least one department";
    }
    if (charCount > 3000) {
      errors.charCount = "Content exceeds 3000 characters";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit post
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("visibility", visibility);
      selectedDepartments.forEach((dept) => {
        formData.append("departments", dept);
      });
      tags.forEach((tag) => {
        formData.append("tags", tag);
      });

      mediaFiles.forEach((file, index) => {
        formData.append("media", file);
        if (altTexts[index]) {
          formData.append(`altText_${index}`, altTexts[index]);
        }
      });

      const response = await axios.post("/api/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress({ ...uploadProgress, overall: percentCompleted });
        },
      });

      toast.success("Post created successfully!");
      localStorage.removeItem("createPostDraft");
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
          <button
            onClick={onClose}
            className="close-btn"
            aria-label="Close modal"
          >
            <FiX />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="create-post-form">
          {/* Visibility Selector */}
          <div className="visibility-selection">
            <label>Visibility:</label>
            <div className="visibility-options">
              <button
                type="button"
                className={`visibility-btn ${
                  visibility === "public" ? "selected" : ""
                }`}
                onClick={() => setVisibility("public")}
              >
                <FiEye />
                Public
              </button>
              <button
                type="button"
                className={`visibility-btn ${
                  visibility === "connections" ? "selected" : ""
                }`}
                onClick={() => setVisibility("connections")}
              >
                <FiUsers />
                Connections Only
              </button>
            </div>
            <p className="visibility-preview">
              {visibility === "public"
                ? "Visible to all alumni"
                : "Visible only to your connections"}
            </p>
          </div>

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

          {/* Tag Input */}
          <div className="tag-input-container">
            <label htmlFor="tag-input">Tags (max 5):</label>
            <div className="tag-input-wrapper">
              <FiTag />
              <input
                id="tag-input"
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                placeholder="Search existing tags..."
                className="tag-input"
                aria-label="Search existing tags"
              />
            </div>
            {popularTags.length > 0 && (
              <div className="popular-tags">
                <label>Popular tags:</label>
                <div className="popular-tag-chips">
                  {popularTags.map((tag, index) => (
                    <button
                      key={index}
                      type="button"
                      className="popular-tag-chip"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tags.length > 0 && (
              <div className="tag-chips">
                {tags.map((tag, index) => (
                  <span key={index} className="tag-chip">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag}`}
                    >
                      <FiX />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <AnimatePresence>
              {showTagSuggestions && (
                <motion.div
                  className="tag-suggestions"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {tagSuggestions.length > 0 ? (
                    tagSuggestions.map((tag, index) => (
                      <button
                        key={index}
                        type="button"
                        className="tag-suggestion"
                        onClick={() => addTag(tag)}
                      >
                        {tag}
                      </button>
                    ))
                  ) : (
                    <div className="no-suggestions">
                      No matching tags found. Try different keywords or select
                      from popular tags.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content Input */}
          <div className="content-input-container">
            {/* Formatting Toolbar */}
            <div className="formatting-toolbar">
              <button
                type="button"
                onClick={() => insertFormatting("bold")}
                title="Bold"
                aria-label="Bold"
              >
                <FiBold />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("italic")}
                title="Italic"
                aria-label="Italic"
              >
                <FiItalic />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("list")}
                title="List"
                aria-label="List"
              >
                <FiList />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              placeholder="Share an update, ask a question, or post an achievement... Use @ to mention someone!"
              className="content-textarea"
              rows={4}
              maxLength={3000}
              aria-label="Post content"
            />
            <div className="char-counter">{charCount}/3000</div>

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

          {/* Link Previews */}
          <AnimatePresence>
            {linkPreviews.length > 0 && (
              <motion.div
                className="link-previews"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {linkPreviews.map((preview, index) => (
                  <div key={index} className="link-preview">
                    <img src={preview.image} alt={preview.title} />
                    <div>
                      <h4>{preview.title}</h4>
                      <p>{preview.description}</p>
                      <span>{preview.url}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Media Upload Zone */}
          <div
            className={`media-upload-zone ${isDragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
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
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload media"
            >
              <FiUpload />
              Drag & drop files or click to upload
            </button>
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
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", index)
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const fromIndex = parseInt(
                        e.dataTransfer.getData("text/plain")
                      );
                      reorderMedia(fromIndex, index);
                    }}
                  >
                    <button
                      type="button"
                      className="remove-media-btn"
                      onClick={() => removeMedia(index)}
                      aria-label="Remove media"
                    >
                      <FiTrash2 />
                    </button>

                    {file.type.startsWith("image/") ? (
                      <>
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          className="media-preview-image"
                        />
                        <input
                          type="text"
                          placeholder="Alt text for image"
                          value={altTexts[index] || ""}
                          onChange={(e) =>
                            handleAltTextChange(index, e.target.value)
                          }
                          className="alt-text-input"
                          aria-label="Alt text"
                        />
                      </>
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
                    {uploadProgress[index] && (
                      <div className="upload-progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${uploadProgress[index]}%` }}
                        ></div>
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
                    aria-label={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation Errors */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="validation-errors">
              {Object.values(validationErrors).map((error, index) => (
                <div key={index} className="error-message">
                  <FiAlertCircle />
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <footer className="create-post-footer">
            <div className="footer-actions">
              <button
                type="button"
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Add images"
                aria-label="Add images"
              >
                <FiImage />
              </button>

              <button
                type="button"
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Add video"
                aria-label="Add video"
              >
                <FiVideo />
              </button>

              <button
                type="button"
                className="action-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add emoji"
                aria-label="Add emoji"
              >
                <FiSmile />
              </button>
            </div>

            <div className="submit-section">
              {draftSaved && (
                <div className="draft-indicator">
                  <FiSave />
                  Draft saved
                </div>
              )}
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
                aria-label="Create post"
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
