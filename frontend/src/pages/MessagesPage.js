import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';
import { connectionAPI, fetchMessages } from '../components/utils/api';
import axios from 'axios';
import { io } from 'socket.io-client';
import { getAvatarUrl } from '../components/utils/helpers';

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

  // Load connections (people user can message)
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        // Load accepted connections from backend
        const response = await connectionAPI.getConnections();
        setConnections(response.data || []);
        
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
      const data = await fetchMessages(selectedUser._id || selectedUser.id);
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
    
    if (!newMessage.trim() || !selectedUser || !socket) return;
    
    try {
      // Persist via REST to ensure validation + notifications
      const res = await axios.post(`/api/messages/${selectedUser._id}`, { content: newMessage });
      const saved = res.data;
      setMessages(prev => [...prev, saved]);
      if (socket) socket.emit('chat:send', { to: selectedUser._id, content: newMessage });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
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
    <div className="container mx-auto px-4 py-8">
      <div className="theme-card p-6 mb-6 float-in">
        <h1 className="text-2xl font-extrabold gradient-text">Messages</h1>
        <p className="text-gray-600">Chat with your connections in real-time</p>
      </div>
      
      <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-12rem)]">
          {/* Contacts list */}
          <div className="border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <input
                type="text"
                placeholder="Search conversations..."
                className="form-input"
              />
            </div>
            
            <ul className="divide-y divide-gray-200">
              {connections.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No connections found.</p>
                  <p className="mt-2 text-sm">
                    Follow users to start a conversation.
                  </p>
                </div>
              ) : (
                connections.map(connection => (
                  <li
                    key={connection._id}
                    onClick={() => setSelectedUser(connection)}
                    className={`cursor-pointer p-4 hover:bg-gray-50 ${
                      selectedUser?._id === connection._id ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      {connection.avatarUrl ? (
                        <img
                          src={getAvatarUrl(connection.avatarUrl)}
                          alt={connection.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                          {connection.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{connection.name}</p>
                        <p className="text-sm text-gray-500">@{connection.username}</p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
          
          {/* Chat area */}
          <div className="col-span-2 flex flex-col">
            {selectedUser ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-gray-200 flex items-center">
                  {selectedUser.avatarUrl ? (
                    <img
                      src={getAvatarUrl(selectedUser.avatarUrl)}
                      alt={selectedUser.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                      {selectedUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{selectedUser.name}</p>
                    <p className="text-xs text-gray-500">@{selectedUser.username}</p>
                  </div>
                </div>
                
                {/* Messages */}
                <div
                  ref={messageContainerRef}
                  className="flex-1 p-4 overflow-y-auto"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                      <p>No messages yet</p>
                      <p className="mt-2 text-sm">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={message.id || index}
                          className={`flex ${
                            message.senderId === user._id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-4 py-2 ${
                              message.senderId === user._id
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.senderId === user._id
                                  ? 'text-primary-100'
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
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Message input */}
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex items-center">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="form-input flex-1"
                    />
                    <button
                      type="submit"
                      className="ml-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                      disabled={!newMessage.trim()}
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <p>Select a conversation</p>
                <p className="mt-2 text-sm">Choose a user from the list to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;