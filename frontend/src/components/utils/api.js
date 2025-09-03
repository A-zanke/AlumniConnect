import axios from 'axios';
import { toast } from 'react-toastify';


const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Set default base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Interceptor to handle request
axios.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle response
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    // Handle common error cases
    if (response && response.status === 401) {
      // Clear token if 401 Unauthorized
      localStorage.removeItem('token');
      
      // If on protected route, redirect to login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
      }
    }
    
    if (response && response.status === 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

const getCurrentUserId = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?._id;
};

// Posts API
export const postsAPI = {
  // Get all posts
  getPosts: () => axios.get('/api/posts'),
  
  // Get post by ID
  getPost: (id) => axios.get(`/api/posts/${id}`),
  
  // Get posts by user
  getUserPosts: (userId) => axios.get(`/api/posts/user/${userId}`),
  
  // Create post
  createPost: (postData) => {
    // If post contains media, use FormData
    if (postData.media) {
      const formData = new FormData();
      
      formData.append('content', postData.content);
      formData.append('media', postData.media);
      
      if (postData.tags) {
        formData.append('tags', postData.tags);
      }
      
      return axios.post('/api/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    
    // Otherwise, send as JSON
    return axios.post('/api/posts', postData);
  },
  
  // Delete post
  deletePost: (id) => axios.delete(`/api/posts/${id}`),
  
  // Like post
  likePost: (id) => axios.put(`/api/posts/${id}/like`),
  
  // Unlike post
  unlikePost: (id) => axios.put(`/api/posts/${id}/unlike`),
  
  // Comment on post
  commentOnPost: (id, text) => axios.post(`/api/posts/${id}/comment`, { text }),
  
  // Delete comment
  deleteComment: (postId, commentId) => axios.delete(`/api/posts/${postId}/comment/${commentId}`),
};

// Events API
export const eventsAPI = {
  // Get all events
  getEvents: (upcomingOnly = false) => axios.get('/api/events', {
    params: { upcoming: upcomingOnly },
  }),
  
  // Get event by ID
  getEvent: (id) => axios.get(`/api/events/${id}`),
  
  // Create event
  createEvent: (eventData) => {
    // If event contains image, use FormData
    if (eventData.image) {
      const formData = new FormData();
      
      // Add all fields to formData
      Object.keys(eventData).forEach(key => {
        if (key === 'image') {
          formData.append('image', eventData.image);
        } else {
          formData.append(key, eventData[key]);
        }
      });
      
      return axios.post('/api/events', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    
    // Otherwise, send as JSON
    return axios.post('/api/events', eventData);
  },
  
  // Update event
  updateEvent: (id, eventData) => {
    // If event contains image, use FormData
    if (eventData.image) {
      const formData = new FormData();
      
      // Add all fields to formData
      Object.keys(eventData).forEach(key => {
        if (key === 'image') {
          formData.append('image', eventData.image);
        } else {
          formData.append(key, eventData[key]);
        }
      });
      
      return axios.put(`/api/events/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    
    // Otherwise, send as JSON
    return axios.put(`/api/events/${id}`, eventData);
  },
  
  // Delete event
  deleteEvent: (id) => axios.delete(`/api/events/${id}`),
};

// Connection API
export const connectionAPI = {
  // Send connection request
  sendRequest: (userId) => axios.post('/api/connections', { userId }),
  
  // Follow user (alias for sendRequest for backward compatibility)
  followUser: (userId) => axios.post('/api/connections', { userId }),
  
  // Accept connection request
  acceptRequest: (requestId) => axios.put(`/api/connections/${requestId}/accept`),
  
  // Accept follow request (alias for notifications)
  acceptFollowRequest: (requestId) => axios.put(`/api/connections/${requestId}/accept`),
  
  // Reject connection request
  rejectRequest: (requestId) => axios.delete(`/api/connections/${requestId}/reject`),
  
  // Reject follow request (alias for notifications)
  rejectFollowRequest: (requestId) => axios.delete(`/api/connections/${requestId}/reject`),
  
  // Remove connection
  removeConnection: (userId) => axios.delete(`/api/connections/${userId}`),
  
  // Get connection status
  getConnectionStatus: (userId) => axios.get(`/api/connections/status/${userId}`),
  
  // Get user connections
  getConnections: () => axios.get('/api/connections/followers'),
  
  // Get pending requests
  getPendingRequests: () => axios.get('/api/connections/requests'),
  
  // Get suggested connections
  getSuggestedConnections: () => axios.get('/api/connections/suggested'),
};

// User API
export const userAPI = {
  // Register
  register: (userData) => axios.post('/api/auth/register', userData),
  
  // Login
  login: (credentials) => axios.post('/api/auth/login', credentials),
  
  // Logout
  logout: () => axios.post('/api/auth/logout'),
  
  // Get current user profile
  getProfile: () => axios.get('/api/auth/profile'),
  
  // Get user profile by username
  getUserByUsername: (username) => axios.get(`/api/users/username/${username}`),
  
  // Get user profile by ID
  getUserById: (userId) => axios.get(`/api/users/${userId}`),
  
  // Update profile
  updateProfile: (userData, avatar = null) => {
    // If avatar included, use FormData
    if (avatar) {
      const formData = new FormData();
      
      // Add user data to form
      Object.keys(userData).forEach(key => {
        if (key === 'socials' && typeof userData[key] === 'object') {
          // Handle nested socials object
          Object.keys(userData[key]).forEach(socialKey => {
            formData.append(`socials[${socialKey}]`, userData[key][socialKey]);
          });
        } else {
          formData.append(key, userData[key]);
        }
      });
      
      // Add avatar file to form
      formData.append('avatar', avatar);
      
      return axios.put('/api/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    
    return axios.put('/api/auth/profile', userData);
  },
};
// // Add near other helpers
// export const connectionActions = {
//   acceptByUserId: async (fromUserId, toUserId) => {
//     const res = await fetch(`${API_BASE_URL}/connections/accept`, {
//       method: 'POST',
//       headers: { ...getAuthHeaders() },
//       credentials: 'include',
//       body: JSON.stringify({ fromUserId, toUserId })
//     });
//     if (!res.ok) throw new Error('Failed to accept request');
//     return await res.json();
//   },
//   rejectByUserId: async (fromUserId, toUserId) => {
//     const res = await fetch(`${API_BASE_URL}/connections/reject`, {
//       method: 'POST',
//       headers: { ...getAuthHeaders() },
//       credentials: 'include',
//       body: JSON.stringify({ fromUserId, toUserId })
//     });
//     if (!res.ok) throw new Error('Failed to reject request');
//     return await res.json();
//   }
// };

// Messages API
export const fetchMessages = async (userId) => {
  try {
    const response = await axios.get(`/api/messages/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export default axios;