import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';
import { connectionAPI, fetchMessages, sendMessage } from '../components/utils/api';
import { io } from 'socket.io-client';
import { getAvatarUrl } from '../components/utils/helpers';
import { FiSend, FiImage, FiSmile, FiMoreVertical, FiSearch, FiVideo, FiPhone } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
// import './MessagesPage.css';

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
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  // Load connections (people user can message)
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        // Get users the current user is connected with (can message)
        const response = await connectionAPI.getConnections();
        setConnections(response.data);
        
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
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      const s = io('/', { auth: { token } });
      s.on('connect', () => {});
      s.on('chat:receive', (msg) => {
        if ((msg.from === selectedUser?._id && msg.to === user._id) || (msg.from === user._id && msg.to === selectedUser?._id)) {
          setMessages(prev => [...prev, { senderId: msg.from, recipientId: msg.to, content: msg.content, timestamp: msg.createdAt }]);
        }
      });
      setSocket(s);
      return () => { s.disconnect(); };
    }
  }, [user, selectedUser]);

  // Auto-scroll to the bottom of messages
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-12rem)]">
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
                        className={`cursor-pointer p-4 rounded-2xl m-2 transition-all duration-200 ${
                          selectedUser?._id === connection._id 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                            : 'hover:bg-white hover:shadow-md hover:scale-105'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="relative">
                            {connection.avatarUrl ? (
                              <img
                                src={getAvatarUrl(connection.avatarUrl)}
                                alt={connection.name}
                                className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {connection.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
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
            <div className="lg:col-span-2 flex flex-col">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="relative">
                          {selectedUser.avatarUrl ? (
                            <img
                              src={getAvatarUrl(selectedUser.avatarUrl)}
                              alt={selectedUser.name}
                              className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {selectedUser.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="ml-4">
                          <p className="text-lg font-semibold text-gray-900">{selectedUser.name}</p>
                          <p className="text-sm text-gray-500">@{selectedUser.username}</p>
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
                    className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-white to-gray-50 custom-scrollbar"
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
                                        <img
                                          key={idx}
                                          src={attachment}
                                          alt="Message attachment"
                                          className="max-w-full h-auto rounded-2xl shadow-md"
                                        />
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
                    className="p-6 border-t border-gray-200 bg-white"
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
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
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
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors duration-200"
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