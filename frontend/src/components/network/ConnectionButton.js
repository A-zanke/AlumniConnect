import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const ConnectionButton = ({ userId }) => {
  const [status, setStatus] = useState('none');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && userId && user._id !== userId) {
      fetchStatus();
      
      // Set up socket connection if not already established
      if (!window.socket) {
        window.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', { 
          withCredentials: true 
        });
      }
      
      // Listen for connection updates
      const handleConnectionUpdate = (data) => {
        if ((data.userId === userId || data.targetUserId === userId) && 
            (data.userId === user._id || data.targetUserId === user._id)) {
          if (data.status === 'removed') {
            setStatus('none');
          } else if (data.status === 'connected') {
            setStatus('connected');
          }
        }
      };
      
      window.socket.on('connection:updated', handleConnectionUpdate);
      
      // Clean up event listener on component unmount
      return () => {
        if (window.socket) {
          window.socket.off('connection:updated', handleConnectionUpdate);
        }
      };
    }
  }, [user, userId]);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`/api/connections/status/${userId}`, {
        withCredentials: true
      });
      setStatus(response.data.status);
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  const sendRequest = async () => {
    if (!userId) {
      console.error('ConnectionButton: userId is undefined');
      toast.error('Cannot send connection request: User ID is missing');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Sending connection request to userId:', userId);
      await axios.post('/api/connections', { recipientId: userId }, {
        withCredentials: true
      });
      setStatus('requested');
      toast.success('Connection request sent!');
      fetchStatus(); // Refresh status after sending
    } catch (error) {
      console.error('Connection request error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async () => {
    setLoading(true);
    try {
      await axios.put(`/api/connections/${userId}/accept`, {}, {
        withCredentials: true
      });
      setStatus('connected');
      toast.success('Connection accepted!');
      // Emit a socket event to update the connection status in real-time
      if (window.socket) {
        window.socket.emit('connection:updated', { 
          userId: user._id, 
          targetUserId: userId,
          status: 'connected' 
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  const removeConnection = async () => {
    if (window.confirm('Are you sure you want to remove this connection?')) {
      setLoading(true);
      try {
        await axios.delete(`/api/connections/${userId}`, {
          withCredentials: true
        });
        setStatus('none');
        toast.success('Connection removed');
        // Emit a socket event to update the connection status in real-time
        if (window.socket) {
          window.socket.emit('connection:updated', { 
            userId: user._id, 
            targetUserId: userId,
            status: 'removed' 
          });
        }
      } catch (error) {
        console.error('Error removing connection:', error);
        toast.error(error.response?.data?.message || 'Failed to remove connection');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!user || !userId || user._id === userId) return null;

  const renderButton = () => {
    switch (status) {
      case 'connected':
        return (
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            disabled
          >
            Connected
          </button>
        );
      case 'requested':
        return (
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded-lg cursor-not-allowed"
            disabled
          >
            Pending
          </button>
        );
      case 'incoming':
        return (
          <button
            onClick={acceptRequest}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Accepting...' : 'Accept Request'}
          </button>
        );
      default:
        return (
          <button
            onClick={sendRequest}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Connect'}
          </button>
        );
    }
  };

  return renderButton();
};

export default ConnectionButton;
