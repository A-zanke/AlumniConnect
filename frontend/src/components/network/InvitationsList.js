import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { connectionAPI } from '../utils/api';
import Avatar from '../ui/Avatar';
import { toast } from 'react-toastify';
import { useNotifications } from '../../context/NotificationContext';

const InvitationsList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { fetchNotifications, markAsRead } = useNotifications();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await connectionAPI.getPendingRequests();
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requesterId) => {
    try {
      await connectionAPI.acceptRequest(requesterId);
      // Mark related notification as read if exists
      const relatedNotif = requests.find(req => req.requester._id === requesterId);
      if (relatedNotif && relatedNotif._id) {
        markAsRead(relatedNotif._id);
      }
      setRequests(prev => prev.filter(req => req.requester._id !== requesterId));
      fetchNotifications(); // Refresh notifications to update bell
      toast.success('You are now Connected!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept request');
    }
  };

  const rejectRequest = async (requesterId) => {
    try {
      await connectionAPI.rejectRequest(requesterId);
      setRequests(prev => prev.filter(req => req.requester._id !== requesterId));
      fetchNotifications(); // Refresh notifications to update bell
      toast.success('Connection request declined');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading invitations...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Pending Invitations</h3>
      {requests.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📬</div>
          <p className="text-gray-500">No pending invitations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request._id} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Avatar
                name={request.requester?.name}
                avatarUrl={request.requester?.avatarUrl}
                size={48}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">{request.requester?.name}</h4>
                <p className="text-sm text-gray-600">{request.requester?.username}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Sent {new Date(request.createdAt || request.requester?.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => acceptRequest(request.requester._id)}
                  className="flex-1 md:flex-none px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={() => rejectRequest(request.requester._id)}
                  className="flex-1 md:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvitationsList;
