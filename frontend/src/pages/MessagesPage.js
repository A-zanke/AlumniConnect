import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';
import { connectionAPI, fetchMessages, sendMessage, userAPI } from '../components/utils/api';
import { io } from 'socket.io-client';
import { getAvatarUrl } from '../components/utils/helpers';
import { FiSend, FiImage, FiSmile, FiMoreVertical, FiSearch, FiX, FiPaperclip, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';

const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '💯', '👏', '🙏', '😍'];

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messageContainerRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [presenceData, setPresenceData] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTypingTimeout, setIsTypingTimeout] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchConnections = async () => {
      try {
        setLoading(true);
        const response = await connectionAPI.getConnections();
        setConnections(response.data);
        
        const presencePromises = response.data.map(async (conn) => {
          try {
            const presence = await userAPI.getPresence(conn._id);
            return { userId: conn._id, ...presence };
          } catch (error) {
            return { userId: conn._id, isOnline: false, lastSeen: null };
          }
        });
        
        const presenceResults = await Promise.all(presencePromises);
        const presenceMap = {};
        presenceResults.forEach(presence => {
          presenceMap[presence.userId] = presence;
        });
        setPresenceData(presenceMap);
        
        if (response.data.length > 0 && !selectedUser) {
          setSelectedUser(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching connections:', error);
        toast.error('Failed to load connections');
      } finally {
        setLoading(false);
      }
    };
    fetchConnections();
  }, [user]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      const s = io('/', { auth: { token } });
      
      s.on('connect', () => {
        userAPI.updatePresence(true);
      });
      
      s.on('chat:receive', (msg) => {
        if (msg.from === user._id) return; // Skip own messages to avoid duplicates
        if ((msg.from === selectedUser?._id && msg.to === user._id) || (msg.from === user._id && msg.to === selectedUser?._id)) {
          setMessages(prev => [...prev, {
            id: msg._id,
            senderId: msg.from,
            recipientId: msg.to,
            content: msg.content,
            attachments: msg.attachments || [],
            timestamp: msg.createdAt
          }]);
          setTimeout(scrollToBottom, 100);
        }
      });
      
      s.on('user_typing', (data) => {
        if (data.userId !== user._id) {
          setTypingUser(data.userName);
          setIsTyping(true);
          if (isTypingTimeout) clearTimeout(isTypingTimeout);
          const timeout = setTimeout(() => {
            setIsTyping(false);
            setTypingUser(null);
          }, 3000);
          setIsTypingTimeout(timeout);
        }
      });

      s.on('user_stopped_typing', (data) => {
        if (data.userId !== user._id) {
          setIsTyping(false);
          setTypingUser(null);
          if (isTypingTimeout) clearTimeout(isTypingTimeout);
        }
      });
      
      setSocket(s);
      return () => { 
        s.disconnect();
        if (isTypingTimeout) clearTimeout(isTypingTimeout);
      };
    }
  }, [user, selectedUser, isTypingTimeout]);

  useEffect(() => {
    if (messageContainerRef.current) {
      requestAnimationFrame(() => {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      });
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, []);

  const fetchMessagesData = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const data = await fetchMessages(selectedUser._id);
      setMessages(data);
      setTimeout(scrollToBottom, 0);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, scrollToBottom]);

  useEffect(() => {
    fetchMessagesData();
  }, [fetchMessagesData]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedUser) return;
    
    try {
      const messageData = await sendMessage(selectedUser._id, newMessage, selectedImage);
      setMessages(prev => [...prev, {
        id: messageData.id,
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        content: messageData.content,
        attachments: messageData.attachments || [],
        timestamp: messageData.timestamp
      }]);
      
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setShowEmojiPicker(false);
      setTimeout(scrollToBottom, 100);
      
      if (socket) {
        socket.emit('chat:send', { 
          to: selectedUser._id, 
          content: newMessage,
          attachments: messageData.attachments || []
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket && selectedUser) {
      socket.emit('typing', {
        userId: user._id,
        userName: user.name,
        recipientId: selectedUser._id
      });
      if (isTypingTimeout) clearTimeout(isTypingTimeout);
      const timeout = setTimeout(() => {
        socket.emit('stop_typing', {
          userId: user._id,
          recipientId: selectedUser._id
        });
      }, 1000);
      setIsTypingTimeout(timeout);
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Unknown';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleProfileClick = (connection) => {
    navigate(`/profile/${connection.username || connection._id}`);
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Delete message?')) {
      try {
        await fetch(`/api/messages/${messageId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success('Message deleted');
      } catch (e) {
        toast.error('Failed to delete message');
      }
    }
  };

  const handleDeleteChat = async () => {
    if (window.confirm('Delete entire chat?')) {
      try {
        await fetch(`/api/messages/chat/${selectedUser._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setMessages([]);
        toast.success('Chat deleted successfully');

  const handleClearAll = async () => {
    if (confirm('Clear all messages?')) {
      try {
        await fetch('/api/messages/all', { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setMessages([]);
      } catch (e) {
        toast.error('Failed to clear');
      }
    }
  };

  if (loading && connections.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-2 sm:p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Messages
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">Connect with your network in real-time</p>
        </motion.div>
        
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-12rem)] sm:h-[calc(100vh-10rem)]">
            {/* Contacts Sidebar - Hidden on mobile when chat is open */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${showMobileChat && selectedUser ? 'hidden lg:flex' : 'flex'} bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex-col`}
            >
              {/* Search */}
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                  />
                </div>
              </div>
              
              {/* Connections List - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                {connections.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <div className="text-4xl sm:text-5xl mb-3">💬</div>
                    <p className="text-base sm:text-lg font-semibold">No connections</p>
                    <p className="text-xs sm:text-sm mt-2">Connect with people to chat</p>
                  </div>
                ) : (
                  <div className="p-1 sm:p-2">
                    {connections
                      .filter(conn => 
                        conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        conn.username.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((connection, index) => (
                      <motion.div
                        key={connection._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          setSelectedUser(connection);
                          setShowMobileChat(true);
                        }}
                        className={`cursor-pointer p-3 sm:p-4 rounded-xl m-1 sm:m-2 transition-all duration-200 ${
                          selectedUser?._id === connection._id 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105' 
                            : 'hover:bg-gray-100 hover:shadow-md hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="relative" onClick={(e) => {
                            e.stopPropagation();
                            handleProfileClick(connection);
                          }}>
                            <img
                              src={connection.avatarUrl ? getAvatarUrl(connection.avatarUrl) : '/default-avatar.png'}
                              alt={connection.name}
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-white shadow-md hover:scale-110 transition-transform"
                            />
                            {presenceData[connection._id]?.isOnline && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                            )}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <p className={`text-sm sm:text-base font-bold truncate ${
                              selectedUser?._id === connection._id ? 'text-white' : 'text-gray-900'
                            }`}>
                              {connection.name}
                            </p>
                            <p className={`text-xs sm:text-sm truncate ${
                              selectedUser?._id === connection._id ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              @{connection.username}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Chat Area */}
            <div className={`${!showMobileChat && selectedUser ? 'hidden lg:flex' : 'flex'} lg:col-span-2 flex-col h-full`}>
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1 min-w-0">
                        {/* Back button for mobile */}
                        <button
                          onClick={() => setShowMobileChat(false)}
                          className="lg:hidden mr-2 p-2 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          ←
                        </button>
                        <div 
                          className="relative cursor-pointer"
                          onClick={() => handleProfileClick(selectedUser)}
                        >
                          <img
                            src={selectedUser.avatarUrl ? getAvatarUrl(selectedUser.avatarUrl) : '/default-avatar.png'}
                            alt={selectedUser.name}
                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-white shadow-md hover:scale-110 transition-transform"
                          />
                          {presenceData[selectedUser._id]?.isOnline && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        
                        <div className="ml-3 flex-1 min-w-0" onClick={() => handleProfileClick(selectedUser)}>
                          <p className="text-base sm:text-lg font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors">{selectedUser.name}</p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            {presenceData[selectedUser._id]?.isOnline ? (
                              <span className="text-green-600 font-semibold">● Online</span>
                            ) : (
                              `Last seen ${formatLastSeen(presenceData[selectedUser._id]?.lastSeen)}`
                            )}
                          </p>
                          {isTyping && typingUser && (
                            <p className="text-xs sm:text-sm text-blue-500 italic animate-pulse">typing...</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <button onClick={handleDeleteChat} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                          <FiTrash2 className="text-gray-600 text-lg sm:text-xl" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Messages - Scrollable */}
                  <div
                    ref={messageContainerRef}
                    className="h-full p-3 sm:p-6 overflow-y-auto bg-gradient-to-b from-white to-gray-50"
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <div className="text-4xl sm:text-6xl mb-3">💭</div>
                        <p className="text-base sm:text-xl font-semibold">Start chatting</p>
                        <p className="text-xs sm:text-sm mt-2 text-center px-4">Send a message to {selectedUser.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        <AnimatePresence>
                          {messages.map((message, index) => (
                            <motion.div
                              key={message.id || index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${message.senderId === user._id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[85%] sm:max-w-[70%]`}>
                                <div
                                  className={`relative rounded-2xl sm:rounded-3xl px-3 sm:px-6 py-2 sm:py-4 shadow-lg ${
                                    message.senderId === user._id
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                      : 'bg-white text-gray-800 border border-gray-200'
                                  }`}
                                >
                                  {message.senderId === user._id && (
                                    <button onClick={() => handleDeleteMessage(message.id)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                                      <FiTrash2 size={12} />
                                    </button>
                                  )}
                                  {message.content && (
                                    <p className="text-sm sm:text-base leading-relaxed break-words">{message.content}</p>
                                  )}
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {message.attachments.map((attachment, idx) => (
                                        <img
                                          key={idx}
                                          src={attachment}
                                          alt="Attachment"
                                          className="max-w-full h-auto rounded-xl sm:rounded-2xl shadow-md"
                                        />
                                      ))}
                                    </div>
                                  )}
                                  <p className={`text-[10px] sm:text-xs mt-1 sm:mt-2 ${
                                    message.senderId === user._id ? 'text-blue-100' : 'text-gray-500'
                                  }`}>
                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                  
                  {/* Message Input */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 sm:p-4 border-t border-gray-200 bg-white flex-shrink-0"
                  >
                    {imagePreview && (
                      <div className="mb-3 relative inline-block">
                        <img src={imagePreview} alt="Preview" className="max-w-[150px] sm:max-w-xs h-20 sm:h-32 object-cover rounded-xl shadow-md" />
                        <button onClick={removeImage} className="absolute -top-2 -right-2 p-1 sm:p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                          <FiX className="text-xs sm:text-sm" />
                        </button>
                      </div>
                    )}
                    
                    {/* Quick Emojis */}
                    <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => setNewMessage(prev => prev + emoji)}
                          className="text-xl sm:text-2xl hover:scale-125 transition-transform flex-shrink-0"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <textarea
                          value={newMessage}
                          onChange={handleTyping}
                          onKeyPress={handleKeyPress}
                          placeholder="Type a message..."
                          rows="1"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-20 sm:pr-24 bg-gray-100 rounded-xl sm:rounded-2xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base"
                          style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                          <label className="cursor-pointer p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <FiImage className="text-gray-600 text-base sm:text-lg" />
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <FiSmile className="text-gray-600 text-base sm:text-lg" />
                          </button>
                        </div>
                        
                        {showEmojiPicker && (
                          <div className="absolute bottom-full right-0 mb-2 z-50">
                            <EmojiPicker onEmojiClick={handleEmojiClick} width={280} height={350} />
                          </div>
                        )}
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={!newMessage.trim() && !selectedImage}
                        className="p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                      >
                        <FiSend className="text-lg sm:text-xl" />
                      </motion.button>
                    </form>
                  </motion.div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
                  <div className="text-5xl sm:text-6xl mb-4">💬</div>
                  <p className="text-lg sm:text-xl font-semibold text-center">Select a conversation</p>
                  <p className="text-xs sm:text-sm mt-2 text-center">Choose someone to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;