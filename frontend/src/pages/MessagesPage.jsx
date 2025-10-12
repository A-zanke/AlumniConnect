import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';
import { Virtuoso } from 'react-virtuoso';
import { motion, AnimatePresence } from 'framer-motion';
import {  FaSearch, FaPaperPlane, FaPaperclip, FaSmile, FaEllipsisV, FaReply, FaTrash, FaTimes, FaDownload, FaInfo, FaStar, FaRegStar, FaBan, FaFlag, FaCheck, FaCheckDouble, FaForward, FaCheckSquare, FaSquare
} from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { threadId } = useParams();
  const [socket, setSocket] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [connections, setConnections] = useState([]);
  const [threadQuery, setThreadQuery] = useState('');
  const [connectionsQuery, setConnectionsQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [infoTab, setInfoTab] = useState('media');
  const [mediaItems, setMediaItems] = useState([]);
  const [typing, setTyping] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [msgInfo, setMsgInfo] = useState(null);
  const [beforeCursor, setBeforeCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });
    setSocket(newSocket);

    newSocket.on('message:new', (message) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m._id === message._id || m.clientKey === message.clientKey)) {
          return prev;
        }
        return [...prev, message];
      });
      
      // Mark as delivered
      if (message.senderId._id !== user._id) {
        newSocket.emit('message:delivered', { messageId: message._id });
      }
    });

    newSocket.on('message:updated', (message) => {
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    });

    newSocket.on('message:deleted', ({ messageId, scope }) => {
      if (scope === 'everyone') {
        setMessages(prev => prev.filter(m => m._id !== messageId));
      }
    });

    newSocket.on('messages:read', ({ userId, upToMessageId }) => {
      setMessages(prev => prev.map(m => {
        if (m.senderId?._id === user._id && m._id <= upToMessageId) {
          return { ...m, status: { ...(m.status || {}), readBy: [...(m.status?.readBy || []), { userId, at: new Date() }] } };
        }
        return m;
      }));
    });

    newSocket.on('typing:start', ({ userId, threadId }) => {
      if (selectedThread?._id === threadId && userId !== user._id) {
        setTyping(userId);
        setTimeout(() => setTyping(null), 3000);
      }
    });

    newSocket.on('typing:stop', () => {
      setTyping(null);
    });

    newSocket.on('presence:update', ({ userId, status, lastSeen }) => {
      setThreads(prev => prev.map(t => ({
        ...t,
        participants: t.participants.map(p => 
          p._id === userId ? { ...p, isOnline: status === 'online', lastSeen } : p
        )
      })));
    });

    return () => newSocket.close();
  }, [user._id]);

  // Fetch threads
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await axios.get('/api/messages/threads');
        const list = Array.isArray(res.data) ? res.data : [];
        setThreads(list);
        if (!threadId && list.length > 0) {
          setSelectedThread(list[0]);
          navigate(`/messages/${list[0]._id}`, { replace: true });
        } else if (threadId && list.length > 0) {
          const t = list.find((x) => String(x._id) === String(threadId));
          if (t) setSelectedThread(t);
        }
      } catch (err) {
        console.error('Fetch threads error:', err);
      }
    };
    fetchThreads();
  }, [threadId, navigate]);

  // Load my connections for starting chats/search
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const res = await axios.get('/api/connections');
        setConnections(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('Load connections error:', e);
      }
    };
    loadConnections();
  }, []);

  // Fetch messages when thread selected
  useEffect(() => {
    if (selectedThread) {
      fetchMessages();
      socket?.emit('join:thread', selectedThread._id);
      
      return () => {
        socket?.emit('leave:thread', selectedThread._id);
      };
    }
  }, [selectedThread]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/messages/threads/${selectedThread._id}/messages`, { params: { before: beforeCursor || undefined, limit: 30 } });
      const list = Array.isArray(res.data) ? res.data : [];
      if (beforeCursor) {
        setMessages(prev => [...list, ...prev]);
      } else {
        setMessages(list);
      }
      setHasMore(list.length === 30);
      if (list.length > 0) setBeforeCursor(list[0]._id);
      
      // Mark as read
      if (res.data.length > 0) {
        const lastMsg = res.data[res.data.length - 1];
        await axios.post(`/api/messages/threads/${selectedThread._id}/read`, {
          upToMessageId: lastMsg._id
        });
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  // Load messages immediately for a given thread id (used when selecting from search)
  const fetchMessagesByThread = async (threadId, reset = false) => {
    if (!threadId) return;
    try {
      const res = await axios.get(`/api/messages/threads/${threadId}/messages`, {
        params: { before: reset ? undefined : undefined, limit: 30 },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setMessages(list);
      setHasMore(list.length === 30);
      if (list.length > 0) setBeforeCursor(list[0]._id);
      if (list.length > 0) {
        const lastMsg = list[list.length - 1];
        await axios.post(`/api/messages/threads/${threadId}/read`, {
          upToMessageId: lastMsg._id,
        });
      }
    } catch (err) {
      console.error('Fetch messages by thread error:', err);
    }
  };

  // Unified select handler: set thread and ensure chat loads
  const onSelectThread = async (t) => {
    if (!t) return;
    setSelectedThread(t);
    setBeforeCursor(null);
    setHasMore(true);
    await fetchMessagesByThread(t._id, true);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !replyTo) return;

    const clientKey = `${user._id}-${Date.now()}-${Math.random()}`;
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      threadId: selectedThread._id,
      senderId: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl },
      body: inputText,
      replyTo,
      clientKey,
      createdAt: new Date(),
      status: { sent: true, deliveredTo: [], readBy: [] }
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputText('');
    setReplyTo(null);
    socket?.emit('typing:stop', { threadId: selectedThread._id });

    try {
      await axios.post(`/api/messages/threads/${selectedThread._id}/messages`, {
        text: inputText,
        replyToId: replyTo?._id,
        clientKey
      });
    } catch (err) {
      console.error('Send message error:', err);
      setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
      toast.error('Failed to send message');
    }
  };

  const toggleSelectMessage = (id) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const forwardSelected = async (targetThreadId) => {
    const toForward = messages.filter(m => selectedMessageIds.has(m._id)).map(m => m.body).join('\n');
    if (!toForward) return;
    await axios.post(`/api/messages/threads/${targetThreadId}/messages`, { text: toForward, clientKey: `${user._id}-${Date.now()}-fwd` });
    setSelectedMessageIds(new Set());
    toast.success('Message(s) forwarded');
  };

  const deleteSelectedForMe = async () => {
    await Promise.all([...selectedMessageIds].map(id => axios.delete(`/api/messages/messages/${id}?scope=me`)));
    setMessages(prev => prev.filter(m => !selectedMessageIds.has(m._id)));
    setSelectedMessageIds(new Set());
    toast.success('Deleted selected');
  };

  const handleTyping = () => {
    socket?.emit('typing:start', { threadId: selectedThread._id });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { threadId: selectedThread._id });
    }, 3000);
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await axios.patch(`/api/messages/messages/${messageId}`, { addReaction: emoji });
    } catch (err) {
      console.error('Add reaction error:', err);
    }
  };

  const handleDeleteMessage = async (messageId, scope = 'me') => {
    try {
      await axios.delete(`/api/messages/messages/${messageId}?scope=${scope}`);
      if (scope === 'me') {
        setMessages(prev => prev.filter(m => m._id !== messageId));
      }
      toast.success('Message deleted');
    } catch (err) {
      console.error('Delete message error:', err);
      toast.error('Failed to delete message');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const uploadRes = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      
      await axios.post(`/api/messages/threads/${selectedThread._id}/messages`, {
        files: [{
          url: uploadRes.data.url,
          type: fileType,
          filename: file.name,
          size: file.size,
          mimeType: file.type
        }],
        clientKey: `${user._id}-${Date.now()}-${Math.random()}`
      });
      
      toast.success('File sent');
    } catch (err) {
      console.error('File upload error:', err);
      toast.error('Failed to send file');
    } finally {
      setUploading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      await axios.post(`/api/messages/blocks/${userId}`);
      toast.success('User blocked');
      setSelectedThread(null);
    } catch (err) {
      console.error('Block error:', err);
      toast.error('Failed to block user');
    }
  };

  const handleReportUser = async (userId) => {
    try {
      await axios.post('/api/admin/reports', {
        targetType: 'user',
        targetId: userId,
        reason: 'Inappropriate behavior'
      });
      toast.success('User reported');
    } catch (err) {
      console.error('Report error:', err);
      toast.error('Failed to report user');
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('Delete this chat?')) return;
    
    try {
      await axios.delete(`/api/messages/threads/${selectedThread._id}`);
      setThreads(prev => prev.filter(t => t._id !== selectedThread._id));
      setSelectedThread(null);
      toast.success('Chat deleted');
    } catch (err) {
      console.error('Delete chat error:', err);
      toast.error('Failed to delete chat');
    }
  };

  const getOtherParticipant = (thread) => {
    return thread.participants.find(p => p._id !== user._id);
  };

  const getStatusIcon = (message) => {
    if (message.senderId._id !== user._id) return null;
    
    const delivered = message.status?.deliveredTo?.length > 0;
    const read = message.status?.readBy?.length > 0;
    
    if (read) {
      return <FaCheckDouble className="text-blue-500 text-xs" />;
    } else if (delivered) {
      return <FaCheckDouble className="text-gray-400 text-xs" />;
    } else {
      return <FaCheck className="text-gray-400 text-xs" />;
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (lastSeen) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diff = now - lastSeenDate;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - Threads List */}
      <div className="w-full md:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
          <div className="mt-3">
            <input
              value={threadQuery}
              onChange={(e) => setThreadQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="mt-3">
            <input
              value={connectionsQuery}
              onChange={(e) => setConnectionsQuery(e.target.value)}
              placeholder="Start new chat with a connection..."
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-indigo-500"
            />
            {connectionsQuery && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border dark:border-gray-700">
                {connections
                  .filter(c => (c.name || '').toLowerCase().includes(connectionsQuery.toLowerCase()))
                  .slice(0, 8)
                  .map(c => (
                    <button
                      key={c._id}
                      onClick={async () => {
                        try {
                          const res = await axios.get(`/api/messages/threads/${c._id}`);
                          const t = res.data;
                          setThreads(prev => {
                            const exists = prev.some(p => p._id === t._id);
                            return exists ? prev : [t, ...prev];
                          });
                          setConnectionsQuery('');
                          await onSelectThread(t);
                        } catch (e) {}
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <img src={c.avatarUrl || '/default-avatar.png'} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">{c.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {threads
            .filter(t => (t.participants || []).some(p => p.name?.toLowerCase().includes(threadQuery.toLowerCase())))
            .map(thread => {
            const other = getOtherParticipant(thread);
            const isOnline = other?.isOnline || (other?.lastSeen && (new Date() - new Date(other.lastSeen)) < 60000);
            
            return (
              <div
                key={thread._id}
                onClick={() => {
                  onSelectThread(thread);
                  navigate(`/messages/${thread._id}`);
                }}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedThread?._id === thread._id ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={other?.avatarUrl || '/default-avatar.png'}
                      alt={other?.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {other?.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {thread.lastMessage?.body || 'No messages yet'}
                    </p>
                  </div>
                  
                  {thread.unreadCount?.get(user._id.toString()) > 0 && (
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {thread.unreadCount.get(user._id.toString())}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={getOtherParticipant(selectedThread)?.avatarUrl || '/default-avatar.png'}
                alt={getOtherParticipant(selectedThread)?.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {getOtherParticipant(selectedThread)?.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {typing ? (
                    <span className="flex items-center gap-1">
                      <span className="typing-dots">typing</span>
                      <span className="animate-pulse">...</span>
                    </span>
                  ) : getOtherParticipant(selectedThread)?.isOnline ? (
                    'Online'
                  ) : (
                    `Last seen ${formatLastSeen(getOtherParticipant(selectedThread)?.lastSeen)}`
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FaSearch className="text-gray-600 dark:text-gray-300" />
              </button>
              {selectedMessageIds.size > 0 && (
                <div className="flex items-center gap-2 mr-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{selectedMessageIds.size} selected</span>
                  <button
                    onClick={deleteSelectedForMe}
                    className="px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowInfoDrawer(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FaInfo className="text-gray-600 dark:text-gray-300" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMessageMenu(showMessageMenu ? null : 'header')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FaEllipsisV className="text-gray-600 dark:text-gray-300" />
                </button>
                
                {showMessageMenu === 'header' && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <button
                      onClick={() => handleReportUser(getOtherParticipant(selectedThread)._id)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FaFlag /> Report
                    </button>
                    <button
                      onClick={() => handleBlockUser(getOtherParticipant(selectedThread)._id)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FaBan /> Block
                    </button>
                    <button
                      onClick={handleDeleteChat}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                    >
                      <FaTrash /> Delete Chat
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
            <Virtuoso
              data={messages}
              followOutput="smooth"
              itemContent={(index, message) => (
                <div className="relative" key={message._id}>
                  <div className="absolute -left-8 top-1">
                    <button
                      onClick={() => toggleSelectMessage(message._id)}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title={selectedMessageIds.has(message._id) ? 'Unselect' : 'Select'}
                    >
                      {selectedMessageIds.has(message._id) ? <FaCheckSquare /> : <FaSquare />}
                    </button>
                  </div>
                  <MessageBubble
                    key={message._id}
                    message={message}
                    isOwn={message.senderId._id === user._id}
                    onReply={() => setReplyTo(message)}
                    onReact={(emoji) => handleReaction(message._id, emoji)}
                    onDelete={(scope) => handleDeleteMessage(message._id, scope)}
                    getStatusIcon={getStatusIcon}
                    formatTime={formatTime}
                    setLightboxMedia={setLightboxMedia}
                  />
                </div>
              )}
            />
            <div ref={messagesEndRef} />
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => fetchMessages()}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Load older messages
                </button>
              </div>
            )}
          </div>

          {/* Reply Preview */}
          {replyTo && (
            <div className="bg-gray-100 dark:bg-gray-800 p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Replying to {replyTo.senderId.name}</p>
                <p className="text-sm text-gray-900 dark:text-white truncate">{replyTo.body}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-2">
                <FaTimes className="text-gray-500" />
              </button>
            </div>
          )}

          {/* Composer */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={uploading}
              >
                <FaPaperclip className="text-gray-600 dark:text-gray-300" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
              
              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-green-500 resize-none max-h-32"
                  rows={1}
                />
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-3 bottom-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <FaSmile />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedMessageIds.size > 0 && (
                  <button
                    onClick={() => setShowForwardModal(true)}
                    className="p-3 rounded-lg bg-white dark:bg-gray-700 border hover:bg-gray-50 dark:hover:bg-gray-600"
                    title="Forward"
                  >
                    <FaForward className="text-gray-700 dark:text-gray-200" />
                  </button>
                )}
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() && !replyTo}
                  className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
            
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 z-50">
                <EmojiPicker
                  onEmojiClick={(emojiObject) => {
                    setInputText(prev => prev + emojiObject.emoji);
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Select a chat
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Choose a conversation from the left to start messaging
            </p>
          </div>
        </div>
      )}

      {/* Info Drawer */}
      <AnimatePresence>
        {showInfoDrawer && (
          <InfoDrawer
            thread={selectedThread}
            onClose={() => setShowInfoDrawer(false)}
            tab={infoTab}
            setTab={setInfoTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Message Bubble Component
const MessageBubble = ({ message, isOwn, onReply, onReact, onDelete, getStatusIcon, formatTime, setLightboxMedia }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`max-w-[70%] md:max-w-[65%]`}>
        {message.replyTo && (
          <div className="mb-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
            <p className="text-gray-500 dark:text-gray-400">{message.replyTo.senderId.name}</p>
            <p className="text-gray-700 dark:text-gray-300 truncate">{message.replyTo.body}</p>
          </div>
        )}
        
        <div className="relative">
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-gradient-to-br from-green-400 to-green-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
            }`}
          >
            {message.media && message.media.length > 0 ? (
              <div className="mb-2">
                {message.media[0].type === 'image' && (
                  <img
                    src={message.media[0].url}
                    alt="attachment"
                    className="max-w-full rounded-lg cursor-pointer"
                    onClick={() => setLightboxMedia(message.media[0])}
                  />
                )}
                {message.media[0].type === 'video' && (
                  <video src={message.media[0].url} controls className="max-w-full rounded-lg" />
                )}
                {message.media[0].type === 'file' && (
                  <a
                    href={message.media[0].url}
                    download
                    className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                  >
                    <FaDownload />
                    <span className="text-sm truncate">{message.media[0].filename}</span>
                  </a>
                )}
              </div>
            ) : null}
            
            {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs opacity-70">{formatTime(message.createdAt)}</span>
              {message.editedAt && <span className="text-xs opacity-70">edited</span>}
              {getStatusIcon(message)}
            </div>
          </div>
          
          {message.reactions && message.reactions.length > 0 && (
            <div className="absolute -bottom-2 left-2 flex gap-1 bg-white dark:bg-gray-700 rounded-full px-2 py-1 shadow-lg">
              {Object.entries(
                message.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <span key={emoji} className="text-xs">
                  {emoji} {count > 1 && count}
                </span>
              ))}
            </div>
          )}
          
          <div className="absolute top-0 -right-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            >
              <FaSmile className="text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            >
              <FaEllipsisV className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          
          {showReactions && (
            <div className="absolute top-0 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-2 flex gap-2 z-10">
              {quickReactions.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(emoji);
                    setShowReactions(false);
                  }}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          
          {showMenu && (
            <div className="absolute top-0 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-2xl py-2 min-w-[150px] z-10">
              <button
                onClick={() => {
                  onReply();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FaReply /> Reply
              </button>
              {isOwn && (
                <>
                  <button
                    onClick={() => {
                      onDelete('me');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FaTrash /> Delete for me
                  </button>
                  <button
                    onClick={() => {
                      onDelete('everyone');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                  >
                    <FaTrash /> Delete for everyone
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Info Drawer Component
const InfoDrawer = ({ thread, onClose, tab, setTab }) => {
  const [mediaItems, setMediaItems] = useState([]);
  
  useEffect(() => {
    if (tab && thread) {
      fetchMedia(tab);
    }
  }, [tab, thread]);
  
  const fetchMedia = async (type) => {
    try {
      const res = await axios.get(`/api/messages/threads/${thread._id}/media?type=${type}`);
      setMediaItems(res.data);
    } catch (err) {
      console.error('Fetch media error:', err);
    }
  };
  
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed right-0 top-0 h-full w-full md:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50"
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-white">Info</h3>
        <button onClick={onClose} className="p-2">
          <FaTimes className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['media', 'files', 'links'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 capitalize ${
              tab === t
                ? 'border-b-2 border-green-500 text-green-500'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'media' && (
          <div className="grid grid-cols-3 gap-2">
            {mediaItems.map(item => (
              <img
                key={item._id}
                src={item.media[0]?.url}
                alt=""
                className="w-full h-24 object-cover rounded-lg cursor-pointer"
              />
            ))}
          </div>
        )}
        
        {tab === 'files' && (
          <div className="space-y-2">
            {mediaItems.map(item => (
              <a
                key={item._id}
                href={item.media[0]?.url}
                download
                className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <FaDownload className="text-gray-600 dark:text-gray-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.media[0]?.filename}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(item.media[0]?.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
        
        {tab === 'links' && (
          <div className="space-y-2">
            {mediaItems.map(item => {
              const urls = item.body?.match(/(https?:\/\/[^\s]+)/g) || [];
              return urls.map((url, idx) => (
                <a
                  key={`${item._id}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400 truncate"
                >
                  {url}
                </a>
              ));
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessagesPage;