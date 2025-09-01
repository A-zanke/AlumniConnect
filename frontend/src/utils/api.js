const API_BASE_URL = 'http://localhost:5001/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Events API
export const eventsAPI = {
  getEvents: async (upcoming = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events?upcoming=${upcoming}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      return await response.json();
    } catch (error) {
      console.error('Error fetching events:', error);
      return { data: [] };
    }
  },

  createEvent: async (eventData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error('Failed to create event');
      return await response.json();
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  updateEvent: async (eventId, eventData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error('Failed to update event');
      return await response.json();
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  deleteEvent: async (eventId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete event');
      return await response.json();
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },
};

// Connection API
export const connectionAPI = {
  getSuggestedConnections: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/suggested`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch suggested connections');
      return await response.json();
    } catch (error) {
      console.error('Error fetching suggested connections:', error);
      return { data: [], pendingRequests: [] };
    }
  },

  getFollowers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/followers`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch followers');
      return await response.json();
    } catch (error) {
      console.error('Error fetching followers:', error);
      return { data: [] };
    }
  },

  getFollowing: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/following`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch following');
      return await response.json();
    } catch (error) {
      console.error('Error fetching following:', error);
      return { data: [] };
    }
  },

  getPendingRequests: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/requests`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pending requests');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return { data: [] };
    }
  },

  sendRequest: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ toUserId: userId }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to send connection request');
      return await response.json();
    } catch (error) {
      console.error('Error sending connection request:', error);
      throw error;
    }
  },

  acceptFollowRequest: async (connectionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${connectionId}/accept`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to accept connection request');
      return await response.json();
    } catch (error) {
      console.error('Error accepting connection request:', error);
      throw error;
    }
  },

  rejectFollowRequest: async (connectionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${connectionId}/reject`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to reject connection request');
      return await response.json();
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      throw error;
    }
  },

  getConnectionStatus: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/status?otherId=${userId}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to get connection status');
      return await response.json();
    } catch (error) {
      console.error('Error getting connection status:', error);
      return { status: 'not_connected' };
    }
  },
};

// Message API
export const fetchMessages = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    return await response.json();
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

// Network API
export const fetchNetworkData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/network`);
    if (!response.ok) throw new Error('Failed to fetch network data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching network data:', error);
    return [];
  }
};

export const userAPI = {
  // Get user profile by username
  getUserByUsername: async (username) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile/${username}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch user profile');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
};

const getNotificationLink = (notification) => {
  if (notification.type === 'connection_request' || notification.type === 'connection_accepted') {
    // Use username if available, else fallback to _id
    return notification.sender.username
      ? `/profile/${notification.sender.username}`
      : `/profile/${notification.sender._id}`;
  }
  // ...rest unchanged
};

// await NotificationService.createNotification({
//   recipientId: fromUserId, // the sender of the original request
//   senderId: toUserId,      // the current user
//   type: 'connection_accepted', // or 'connection_rejected'
//   content: `${toUser.name} accepted your connection request` // or 'declined'
// }); 