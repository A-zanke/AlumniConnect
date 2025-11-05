import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import {
  FiUserPlus,
  FiUserCheck,
  FiCheck,
  FiClock
} from 'react-icons/fi';

const ConnectionButton = ({
  userId,
  variant = 'default',
  className = '',
  hideConnected = false
}) => {
  const [status, setStatus] = useState('none');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && userId && user._id !== userId) {
      fetchStatus();
      
      // Set up socket connection if not already established
      if (!window.socket) {
        const socketUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
        window.socket = io(socketUrl, {
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

  const baseClasses = (() => {
    switch (variant) {
      case 'compact':
        return 'px-3 py-1.5 text-xs rounded-lg';
      case 'icon':
        return 'p-2.5 rounded-full';
      default:
        return 'px-4 py-2 text-sm rounded-lg';
    }
  })();

  const statusStyles = {
    connected: variant === 'icon'
      ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
      : 'bg-green-500 text-white hover:bg-green-600',
    requested: variant === 'icon'
      ? 'bg-amber-100 text-amber-700 border border-amber-200'
      : 'bg-gray-500 text-white cursor-not-allowed',
    pending: variant === 'icon'
      ? 'bg-amber-100 text-amber-700 border border-amber-200'
      : 'bg-gray-500 text-white cursor-not-allowed',
    incoming: variant === 'icon'
      ? 'bg-blue-100 text-blue-600 border border-blue-200'
      : 'bg-blue-500 text-white hover:bg-blue-600',
    default: variant === 'icon'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-blue-500 text-white hover:bg-blue-600'
  };

  const statusIcons = {
    connected: <FiCheck className="h-4 w-4" />, 
    requested: <FiClock className="h-4 w-4" />, 
    pending: <FiClock className="h-4 w-4" />, 
    incoming: <FiUserCheck className="h-4 w-4" />, 
    default: <FiUserPlus className="h-4 w-4" />
  };

  const statusLabels = {
    connected: 'Connected',
    requested: 'Requested',
    pending: 'Pending',
    incoming: 'Accept Request',
    default: 'Connect'
  };

  const currentStatus = ['connected', 'requested', 'pending', 'incoming'].includes(status)
    ? status
    : 'default';

  if (hideConnected && status === 'connected') {
    return null;
  }

  const renderButton = () => {
    if (variant === 'icon') {
      const icon = statusIcons[currentStatus] || statusIcons.default;
      const ariaLabel = statusLabels[currentStatus] || statusLabels.default;

      return (
        <button
          onClick={
            currentStatus === 'default'
              ? sendRequest
              : currentStatus === 'incoming'
              ? acceptRequest
              : undefined
          }
          disabled={loading || currentStatus === 'requested' || currentStatus === 'pending' || currentStatus === 'connected'}
          className={`${baseClasses} ${statusStyles[currentStatus] || statusStyles.default} transition-colors shadow-sm ${className}`}
          aria-label={ariaLabel}
        >
          {icon}
          <span className="sr-only">{ariaLabel}</span>
        </button>
      );
    }

    switch (status) {
      case 'connected':
        return (
          <button
            className={`${baseClasses} ${statusStyles.connected} transition-colors ${className}`}
            disabled
          >
            Connected
          </button>
        );
      case 'requested':
      case 'pending':
        return (
          <button
            className={`${baseClasses} ${statusStyles.requested} transition-colors ${className}`}
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
            className={`${baseClasses} ${statusStyles.incoming} transition-colors disabled:opacity-50 ${className}`}
          >
            {loading ? 'Accepting...' : 'Accept Request'}
          </button>
        );
      default:
        return (
          <button
            onClick={sendRequest}
            disabled={loading}
            className={`${baseClasses} ${statusStyles.default} transition-colors disabled:opacity-50 ${className}`}
          >
            {loading ? 'Sending...' : 'Connect'}
          </button>
        );
    }
  };

  return renderButton();
};

export default ConnectionButton;
