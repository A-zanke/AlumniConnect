import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';
import { connectionAPI, fetchMessages, sendMessage, userAPI } from '../components/utils/api';
import { io } from 'socket.io-client';
import { getAvatarUrl } from '../components/utils/helpers';
import { FiSend, FiImage, FiSmile, FiMoreVertical, FiSearch, FiVideo, FiPhone } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// Custom CSS for better scrolling
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  .message-bubble {
    word-wrap: break-word;
    word-break: break-word;
  }
`;

const MessagesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messageContainerRef = useRef(null);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [presenceData, setPresenceData] = useState({});
  const [isTypingTimeout, setIsTypingTimeout] = useState(null);
  const fileInputRef = useRef(null);

  // Load connections (people user can message)
  useEffect(() => {
    if (!user) return;

    const fetchConnections = async () => {
      try {
        setLoading(true);
        // Get users the current user is connected with (can message)
        const response = await connectionAPI.getConnections();
        setConnections(response.data);
        
        // Fetch presence data for all connections
        const presencePromises = response.data.map(async (conn) => {
          try {
            const presence = await userAPI.getPresence(conn._id);
            return { userId: conn._id, ...presence };
          } catch (error) {
            console.error(`Error fetching presence for ${conn._id}:`, error);
            return { userId: conn._id, isOnline: false, lastSeen: null };
          }
        });
        
        const presenceResults = await Promise.all(presencePromises);
        const presenceMap = {};
        presenceResults.forEach(presence => {
          presenceMap[presence.userId] = presence;
        });
        setPresenceData(presenceMap);
        
        // Select first connection by default if exists
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

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      const s = io('/', { auth: { token } });
      
      s.on('connect', () => {
        console.log('Connected to server');
        // Set user as online when connected
        userAPI.updatePresence(true);
      });
      
      s.on('disconnect', () => {
        console.log('Disconnected from server');
        // Set user as offline when disconnected
        userAPI.updatePresence(false);
      });
      
      s.on('chat:receive', (msg) => {
        if ((msg.from === selectedUser?._id && msg.to === user._id) || (msg.from === user._id && msg.to === selectedUser?._id)) {
          setMessages(prev => [...prev, { 
            id: msg._id,
            senderId: msg.from, 
            recipientId: msg.to, 
            content: msg.content, 
            attachments: msg.attachments || [],
            timestamp: msg.createdAt 
          }]);
          // Scroll to bottom when receiving new message
          setTimeout(scrollToBottom, 100);
        }
      });
      
      // Listen for typing events
      s.on('user_typing', (data) => {
        if (data.userId !== user._id) {
          setTypingUser(data.userName);
          setIsTyping(true);
          
          // Clear typing indicator after 3 seconds
          if (isTypingTimeout) {
            clearTimeout(isTypingTimeout);
          }
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
          if (isTypingTimeout) {
            clearTimeout(isTypingTimeout);
          }
        }
      });
      
      setSocket(s);
      return () => { 
        s.disconnect();
        if (isTypingTimeout) {
          clearTimeout(isTypingTimeout);
        }
      };
    }
  }, [user, selectedUser, isTypingTimeout]);

  // Auto-scroll to the bottom of messages
  useEffect(() => {
    if (messageContainerRef.current) {
      const scrollToBottom = () => {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      };
      
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages]);

  // Auto-scroll when new message is added
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
      setError(null);
    } catch (err) {
      setError('Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    fetchMessagesData();
  }, [fetchMessagesData]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !selectedImage) || !selectedUser) return;
    
    try {
      // Send message with image via API
      const messageData = await sendMessage(selectedUser._id, newMessage, selectedImage);
      
      // Add to local messages
      setMessages(prev => [...prev, {
        id: messageData.id,
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        content: messageData.content,
        attachments: messageData.attachments || [],
        timestamp: messageData.timestamp
      }]);
      
      // Clear input and image
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100);
      
      // Also emit to socket for real-time updates
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

  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && selectedUser) {
      socket.emit('typing', {
        userId: user._id,
        userName: user.name,
        recipientId: selectedUser._id
      });
      
      // Clear existing timeout
      if (isTypingTimeout) {
        clearTimeout(isTypingTimeout);
      }
      
      // Set new timeout to stop typing indicator
      const timeout = setTimeout(() => {
        socket.emit('stop_typing', {
          userId: user._id,
          recipientId: selectedUser._id
        });
      }, 1000);
      setIsTypingTimeout(timeout);
    }
  };

  // Format last seen time
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (loading && connections.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center mt-8">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <style>{customScrollbarStyles}</style>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text-animated">
            Messages
          </h1>
          <p className="text-gray-600 mt-2">Connect and chat with your network in real-time</p>
        </motion.div>
        
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-8rem)]">
            {/* Contacts Sidebar */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 flex flex-col"
            >
              {/* Search Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Connections List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {connections.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-lg font-medium">No connections yet</p>
                    <p className="text-sm mt-2">Connect with people to start conversations</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {connections
                      .filter(conn => 
                        conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        conn.username.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((connection, index) => (
                      <motion.div
                        key={connection._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedUser(connection)}
                        className={`cursor-pointer p-4 rounded-2xl m-2 transition-all.duration-200 ${
                          selectedUser?._id === connection._id 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                            : 'hover:bg-white hover:shadow-md hover:scale-105'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="relative">
                            <img
                              src={connection.avatarUrl ? getAvatarUrl(connection.avatarUrl) : '/default-avatar.png'}
                              alt={connection.name}
                              className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${
                              selectedUser?._id === connection._id ? 'text-white' : 'text-gray-900'
                            }`}>
                              {connection.name}
                            </p>
                            <p className={`text-xs truncate ${
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
            <div className="lg:col-span-2 flex flex-col h-full">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="relative">
                          {selectedUser.avatarUrl ? (
                            <img
                              src={selectedUser.avatarUrl ? getAvatarUrl(selectedUser.avatarUrl) : '/default-avatar.png'}
                              alt={selectedUser.name}
                              className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <img
                              src="/default-avatar.png"
                              alt={selectedUser.name}
                              className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <p className="text-lg font-semibold text-gray-900">{selectedUser.name}</p>
                          <p className="text-sm text-gray-500">
                            {presenceData[selectedUser._id]?.isOnline ? (
                              'Online'
                            ) : (
                              `Last seen ${formatLastSeen(presenceData[selectedUser._id]?.lastSeen)}`
                            )}
                          </p>
                          {isTyping && typingUser && (
                            <p className="text-sm text-blue-500 italic">typing...</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
                          <FiVideo className="text-gray-600" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
                          <FiPhone className="text-gray-600" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
                          <FiMoreVertical className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Messages */}
                  <div
                    ref={messageContainerRef}
                    className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-white to-gray-50 custom-scrollbar min-h-0"
                    style={{ maxHeight: 'calc(100vh - 20rem)' }}
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <div className="text-6xl mb-4">💭</div>
                        <p className="text-xl font-medium">Start the conversation</p>
                        <p className="text-sm mt-2">Send a message to begin chatting with {selectedUser.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {messages.map((message, index) => (
                            <motion.div
                              key={message.id || index}
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{ duration: 0.3 }}
                              className={`flex ${
                                message.senderId === user._id ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div className={`max-w-[70%] ${
                                message.senderId === user._id ? 'order-2' : 'order-1'
                              }`}>
                                <div
                                  className={`rounded-3xl px-6 py-4 shadow-lg message-bubble smooth-transition ${
                                    message.senderId === user._id
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                      : 'bg-white text-gray-800 border border-gray-200'
                                  }`}
                                >
                                  {message.content && (
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                  )}
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {message.attachments.map((attachment, idx) => (
                                        attachment.startsWith('/forum/') ? (
                                          <a
                                            key={idx}
                                            href={attachment}
                                            onClick={(e) => { e.preventDefault(); window.location.href = attachment; }}
                                            className="block p-3 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors"
                                          >
                                            <div className="text-sm font-semibold text-blue-800">Forum Post</div>
                                            <div className="text-xs text-blue-700 opacity-80">Tap to open the original post</div>
                                          </a>
                                        ) : (
                                          <img
                                            key={idx}
                                            src={attachment}
                                            alt="Message attachment"
                                            className="max-w-full h-auto rounded-2xl shadow-md"
                                          />
                                        )
                                      ))}
                                    </div>
                                  )}
                                  <p
                                    className={`text-xs mt-2 ${
                                      message.senderId === user._id
                                        ? 'text-blue-100'
                                        : 'text-gray-500'
                                    }`}
                                  >
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border-t border-gray-200 bg-white flex-shrink-0"
                  >
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mb-4 relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-xs h-32 object-cover rounded-2xl shadow-md"
                        />
                        <button
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors duration-200"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    
                    <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={handleTyping}
                          onKeyPress={handleKeyPress}
                          placeholder="Type a message... (Press Enter to send)"
                          className="w-full px-6 py-4 pr-12 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors duration-200"
                          >
                            <FiImage className="text-lg" />
                          </button>
                          <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors.duration-200"
                          >
                            <FiSmile className="text-lg" />
                          </button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!newMessage.trim() && !selectedImage}
                        className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        <FiSend className="text-lg" />
                      </button>
                    </form>
                  </motion.div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gradient-to-b from-gray-50 to-white">
                  <div className="text-8xl mb-6">💬</div>
                  <p className="text-2xl font-semibold mb-2">Welcome to Messages</p>
                  <p className="text-lg">Select a conversation to start chatting</p>
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