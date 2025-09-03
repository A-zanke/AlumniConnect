import axios from 'axios';
import { toast } from 'react-toastify';

// Create a separate axios instance for API calls that won't interfere with AuthContext
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000'
});

// Add interceptors only to the API client, not global axios
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    // Only handle errors for non-auth routes
    if (response && response.status === 401 && !error.config.url.includes('/api/auth/')) {
      localStorage.removeItem('token');
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

// Posts API
export const postsAPI = {
  getPosts: () => apiClient.get('/api/posts'),
  getPost: (id) => apiClient.get(`/api/posts/${id}`),
  getUserPosts: (userId) => apiClient.get(`/api/posts/user/${userId}`),
  createPost: (postData) => {
    if (postData.media) {
      const formData = new FormData();
      formData.append('content', postData.content);
      formData.append('media', postData.media);
      if (postData.tags) {
        formData.append('tags', postData.tags);
      }
      return apiClient.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return apiClient.post('/api/posts', postData);
  },
  deletePost: (id) => apiClient.delete(`/api/posts/${id}`),
  likePost: (id) => apiClient.put(`/api/posts/${id}/like`),
  unlikePost: (id) => apiClient.put(`/api/posts/${id}/unlike`),
  commentOnPost: (id, text) => apiClient.post(`/api/posts/${id}/comment`, { text }),
  deleteComment: (postId, commentId) => apiClient.delete(`/api/posts/${postId}/comment/${commentId}`)
};

// Events API
export const eventsAPI = {
  getEvents: (upcomingOnly = false) => apiClient.get('/api/events', {
    params: { upcoming: upcomingOnly }
  }),
  getEvent: (id) => apiClient.get(`/api/events/${id}`),
  createEvent: (eventData) => {
    if (eventData.image) {
      const formData = new FormData();
      Object.keys(eventData).forEach(key => {
        if (key === 'image') {
          formData.append('image', eventData.image);
        } else {
          formData.append(key, eventData[key]);
        }
      });
      return apiClient.post('/api/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return apiClient.post('/api/events', eventData);
  },
  updateEvent: (id, eventData) => {
    if (eventData.image) {
      const formData = new FormData();
      Object.keys(eventData).forEach(key => {
        if (key === 'image') {
          formData.append('image', eventData.image);
        } else {
          formData.append(key, eventData[key]);
        }
      });
      return apiClient.put(`/api/events/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return apiClient.put(`/api/events/${id}`, eventData);
  },
  deleteEvent: (id) => apiClient.delete(`/api/events/${id}`)
};

// Connection API - FIXED VERSION
export const connectionAPI = {
  sendRequest: (userId) => apiClient.post('/api/connections', { userId }),
  followUser: (userId) => apiClient.post('/api/connections', { userId }),
  acceptRequest: (requestId) => apiClient.put(`/api/connections/${requestId}/accept`),
  acceptFollowRequest: (requestId) => apiClient.put(`/api/connections/${requestId}/accept`),
  rejectRequest: (requestId) => apiClient.delete(`/api/connections/${requestId}/reject`),
  rejectFollowRequest: (requestId) => apiClient.delete(`/api/connections/${requestId}/reject`),
  removeConnection: (userId) => apiClient.delete(`/api/connections/${userId}`),
  getConnectionStatus: (userId) => apiClient.get(`/api/connections/status/${userId}`),
  getConnections: () => apiClient.get('/api/connections/followers'),
  getPendingRequests: () => apiClient.get('/api/connections/requests'),
  getSuggestedConnections: () => apiClient.get('/api/connections/suggested')
};

// User API - Using apiClient but keeping same endpoints for compatibility
export const userAPI = {
  register: (userData) => axios.post('/api/auth/register', userData), // Keep using global axios for auth
  login: (credentials) => axios.post('/api/auth/login', credentials), // Keep using global axios for auth
  logout: () => axios.post('/api/auth/logout'), // Keep using global axios for auth
  getProfile: () => apiClient.get('/api/auth/profile'),
  getUserByUsername: (username) => apiClient.get(`/api/users/username/${username}`),
  getUserById: (userId) => apiClient.get(`/api/users/${userId}`),
  updateProfile: (userData, avatar = null) => {
    if (avatar) {
      const formData = new FormData();
      Object.keys(userData).forEach(key => {
        if (key === 'socials' && typeof userData[key] === 'object') {
          Object.keys(userData[key]).forEach(socialKey => {
            formData.append(`socials[${socialKey}]`, userData[key][socialKey]);
          });
        } else {
          formData.append(key, userData[key]);
        }
      });
      formData.append('avatar', avatar);
      return apiClient.put('/api/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return apiClient.put('/api/auth/profile', userData);
  }
};

// Messages API
export const fetchMessages = async (userId) => {
  try {
    const response = await apiClient.get(`/api/messages/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export default axios; // Keep exporting global axios for AuthContext compatibility