import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const ConnectionButton = ({ userId }) => {
  const [status, setStatus] = useState('none');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && userId && user._id !== userId) {
      fetchStatus();
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
    setLoading(true);
    try {
      await axios.post(`/api/connections/request/${userId}`, {}, {
        withCredentials: true
      });
      setStatus('requested');
      toast.success('Connection request sent!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async () => {
    setLoading(true);
    try {
      // First, get the pending request ID
      const requestsResponse = await axios.get('/api/connections/requests', {
        withCredentials: true
      });
      const request = requestsResponse.data.find(req => req.requester._id === userId);
      if (!request) {
        toast.error('No pending request found');
        return;
      }

      await axios.post(`/api/connections/accept/${request._id}`, {}, {
        withCredentials: true
      });
      setStatus('connected');
      toast.success('Connection accepted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user._id === userId) return null;

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
