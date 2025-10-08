import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiList, 
  FiAlignLeft, 
  FiLink, 
  FiImage, 
  FiHash,
  FiAtSign,
  FiX,
  FiCheck
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "What do you want to share?",
  maxLength = 2000,
  onMention,
  onHashtag,
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const textareaRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock user data for mentions (in real app, this would come from API)
  const [users] = useState([
    { id: '1', name: 'John Doe', role: 'teacher', avatar: '/default-avatar.png' },
    { id: '2', name: 'Jane Smith', role: 'alumni', avatar: '/default-avatar.png' },
    { id: '3', name: 'Mike Johnson', role: 'teacher', avatar: '/default-avatar.png' },
    { id: '4', name: 'Sarah Wilson', role: 'alumni', avatar: '/default-avatar.png' },
  ]);

  // Mock trending hashtags
  const [trendingHashtags] = useState([
    'career', 'networking', 'alumni', 'success', 'technology', 
    'innovation', 'leadership', 'education', 'growth', 'opportunity'
  ]);

  useEffect(() => {
    if (mentionQuery) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [mentionQuery, users]);

  useEffect(() => {
    if (hashtagQuery) {
      const filtered = trendingHashtags.filter(tag => 
        tag.toLowerCase().includes(hashtagQuery.toLowerCase())
      );
      setHashtagSuggestions(filtered);
    } else {
      setHashtagSuggestions([]);
    }
  }, [hashtagQuery, trendingHashtags]);

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
      setCursorPosition(e.target.selectionStart);
      
      // Check for mentions
      const textBeforeCursor = newValue.substring(0, e.target.selectionStart);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setShowMentions(true);
        setShowHashtags(false);
      } else {
        setShowMentions(false);
      }

      // Check for hashtags
      const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
      
      if (hashtagMatch) {
        setHashtagQuery(hashtagMatch[1]);
        setShowHashtags(true);
        setShowMentions(false);
      } else {
        setShowHashtags(false);
      }
    }
  };

  const insertMention = (user) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const newValue = beforeMention + `@${user.name} ` + textAfterCursor;
    
    onChange(newValue);
    setShowMentions(false);
    setMentionQuery('');
    
    if (onMention) {
      onMention(user);
    }
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const insertHashtag = (tag) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const beforeHashtag = textBeforeCursor.replace(/#\w*$/, '');
    const newValue = beforeHashtag + `#${tag} ` + textAfterCursor;
    
    onChange(newValue);
    setShowHashtags(false);
    setHashtagQuery('');
    
    if (onHashtag) {
      onHashtag(tag);
    }
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const formatText = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
      case 'list':
        formattedText = `• ${selectedText}`;
        break;
      default:
        formattedText = selectedText;
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newValue);
    
    // Restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2 + selectedText.length);
    }, 0);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      
      const linkText = selectedText || url;
      const formattedLink = `[${linkText}](${url})`;
      
      const newValue = value.substring(0, start) + formattedLink + value.substring(end);
      onChange(newValue);
    }
  };

  const formatPostContent = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>')
      .replace(/@(\w+)/g, '<span class="text-blue-600 font-semibold">@$1</span>')
      .replace(/#(\w+)/g, '<span class="text-indigo-600 font-semibold">#$1</span>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => formatText('bold')}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Bold"
          >
            <FiBold size={16} />
          </button>
          <button
            type="button"
            onClick={() => formatText('italic')}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Italic"
          >
            <FiItalic size={16} />
          </button>
          <button
            type="button"
            onClick={() => formatText('underline')}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Underline"
          >
            <FiUnderline size={16} />
          </button>
          <button
            type="button"
            onClick={() => formatText('list')}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Bullet List"
          >
            <FiList size={16} />
          </button>
        </div>
        
        <div className="w-px h-6 bg-slate-300" />
        
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={insertLink}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Insert Link"
          >
            <FiLink size={16} />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Mention (@username)"
          >
            <FiAtSign size={16} />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Hashtag (#tag)"
          >
            <FiHash size={16} />
          </button>
        </div>
        
        <div className="ml-auto text-sm text-slate-500">
          {value.length}/{maxLength}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 200);
          }}
          placeholder={placeholder}
          className={`w-full min-h-[120px] p-4 border-0 focus:outline-none resize-none text-slate-800 placeholder-slate-400 ${
            isFocused ? 'ring-2 ring-indigo-500' : ''
          }`}
          style={{ fontFamily: 'inherit' }}
        />
        
        {/* Preview */}
        {value && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600 mb-2">Preview:</div>
            <div 
              className="text-slate-800 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: formatPostContent(value) }}
            />
          </div>
        )}
      </div>

      {/* Mention Suggestions */}
      <AnimatePresence>
        {showMentions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
          >
            {suggestions.map((user) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-slate-800">{user.name}</div>
                  <div className="text-sm text-slate-500 capitalize">{user.role}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hashtag Suggestions */}
      <AnimatePresence>
        {showHashtags && hashtagSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
          >
            {hashtagSuggestions.map((tag) => (
              <button
                key={tag}
                onClick={() => insertHashtag(tag)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left"
              >
                <FiHash size={16} className="text-indigo-600" />
                <div className="font-semibold text-slate-800">#{tag}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RichTextEditor;