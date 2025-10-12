import axios from 'axios';
import { toast } from 'react-toastify';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
});

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

const appendToFormData = (formData, key, value) => {
  if (value === undefined || value === null) return;

  if (key === 'image') {
    formData.append('image', value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item === undefined || item === null) return;
      if (typeof item === 'object') {
        formData.append(key, JSON.stringify(item));
      } else {
        formData.append(key, item);
      }
    });
    return;
  }

  if (typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, value);
};

export const postsAPI = {
  getPosts: (params) => apiClient.get('/api/posts', { params }),
  getFeed: () => apiClient.get('/api/posts/feed'),
  getPost: (id) => apiClient.get(`/api/posts/${id}`),
  getUserPosts: (userId) => apiClient.get(`/api/posts/user/${userId}`),
  getSavedPosts: () => apiClient.get('/api/posts/saved/mine'),
  createPost: (postData) => {
    if (postData.media) {
      const formData = new FormData();
      formData.append('content', postData.content);
      formData.append('media', postData.media);
      if (postData.tags) {
        formData.append('tags', postData.tags);
      }
      return apiClient.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return apiClient.post('/api/posts', postData);
  },
  deletePost: (id) => apiClient.delete(`/api/posts/${id}`),
  likePost: (id) => apiClient.put(`/api/posts/${id}/like`),
  reactToPost: (id, type) => apiClient.post(`/api/posts/${id}/react`, { type }),
  commentOnPost: (id, content) => apiClient.post(`/api/posts/${id}/comment`, { content }),
  toggleBookmark: (id) => apiClient.post(`/api/posts/${id}/bookmark`),
  sharePost: (id, payload) => apiClient.post(`/api/posts/${id}/share`, payload || {}),
  savePost: (id) => apiClient.post(`/api/posts/${id}/save`),
  unsavePost: (id) => apiClient.delete(`/api/posts/${id}/save`),
  deleteComment: (postId, commentId) =>
    apiClient.delete(`/api/posts/${postId}/comment/${commentId}`),
};

export const eventsAPI = {
  getEvents: (upcomingOnly = false) =>
    apiClient.get('/api/events', { params: { upcoming: upcomingOnly } }),
  getMyEvents: () => apiClient.get('/api/events/mine'),
  getEvent: (id) => apiClient.get(`/api/events/${id}`),
  createEvent: (eventData) => {
    const formData = new FormData();
    Object.keys(eventData).forEach((key) => {
      appendToFormData(formData, key, eventData[key]);
    });
    return apiClient.post('/api/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateEvent: (id, eventData) => {
    const formData = new FormData();
    Object.keys(eventData).forEach((key) => {
      appendToFormData(formData, key, eventData[key]);
    });
    return apiClient.put(`/api/events/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteEvent: (id) => apiClient.delete(`/api/events/${id}`),
  rsvpEvent: (id) => apiClient.post(`/api/events/${id}/rsvp`),
  getPendingEvents: () => apiClient.get('/api/admin/events/pending'),
  approveEvent: (id) => apiClient.put(`/api/events/${id}/approve`),
  rejectEvent: (id) => apiClient.put(`/api/events/${id}/reject`),
};

export const connectionAPI = {
  sendRequest: (userId) => apiClient.post('/api/connections', { userId }),
  acceptRequest: (userId) => apiClient.put(`/api/connections/${userId}/accept`),
  rejectRequest: (userId) => apiClient.delete(`/api/connections/${userId}/reject`),
  removeConnection: (userId) => apiClient.delete(`/api/connections/${userId}`),
  getConnectionStatus: (userId) => apiClient.get(`/api/connections/status/${userId}`),
  getConnections: () => apiClient.get('/api/connections'),
  getPendingRequests: () => apiClient.get('/api/connections/requests'),
  getSuggestedConnections: () => apiClient.get('/api/connections/suggested'),
  getRequestHistory: () => apiClient.get('/api/connections/requests/history'),
};

export const recommendationsAPI = {
  getAlumni: (studentId) => apiClient.get(`/api/ai/recommendations/${studentId}`),
};

export const userAPI = {
  register: (userData) => axios.post('/api/auth/register', userData),
  login: (credentials) => axios.post('/api/auth/login', credentials),
  logout: () => axios.post('/api/auth/logout'),
  getProfile: () => apiClient.get('/api/auth/profile'),
  getUserByUsername: (username) => apiClient.get(`/api/users/username/${username}`),
  getUserById: (userId) => apiClient.get(`/api/users/${userId}`),
  updateProfile: (userData, avatar = null) => {
    if (avatar || Object.keys(userData).some(key => userData[key] !== undefined)) { // Only send formData if avatar or other data exists
      const formData = new FormData();
      Object.keys(userData).forEach((key) => {
        if (key === 'socials' && typeof userData[key] === 'object') {
          Object.keys(userData[key]).forEach((socialKey) => {
            if (userData[key][socialKey] !== undefined) {
              formData.append(`socials[${socialKey}]`, userData[key][socialKey]);
            }
          });
        } else if (Array.isArray(userData[key])) {
          userData[key].forEach(item => formData.append(`${key}[]`, item)); // For array fields
        }
        else if (typeof userData[key] === 'object' && userData[key] !== null) {
          // Handle nested objects if necessary, e.g., higher_studies
          Object.keys(userData[key]).forEach(nestedKey => {
            if (userData[key][nestedKey] !== undefined) {
              formData.append(`${key}[${nestedKey}]`, userData[key][nestedKey]);
            }
          })
        }
        else if (userData[key] !== undefined) {
          formData.append(key, userData[key]);
        }
      });
      if (avatar) {
        formData.append('avatar', avatar);
      }
      return apiClient.put('/api/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    // If no avatar and no other user data to update, send a simple PUT
    return apiClient.put('/api/auth/profile', userData);
  },
  // NEW: Function to delete user avatar
  deleteAvatar: () => apiClient.delete('/api/users/remove-avatar'), // Updated to match backend route
  updatePresence: (isOnline) => apiClient.put('/api/users/presence', { isOnline }),
  getPresence: (userId) => apiClient.get(`/api/users/${userId}/presence`),
};

export const fetchMessages = async (userId) => {
  try {
    const response = await apiClient.get(`/api/messages/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const sendMessage = async (userId, content, image = null) => {
  try {
    const formData = new FormData();
    formData.append('content', content);
    if (image) {
      formData.append('image', image);
    }
    const response = await apiClient.post(`/api/messages/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const followAPI = {
  getFollowing: (userId) => apiClient.get(`/api/users/${userId}/following`),
  getMutualConnections: (userId) => apiClient.get(`/api/users/${userId}/mutual`),
  getMyMutualConnections: () => apiClient.get('/api/users/mutual/connections'),
  followUser: (userId) => apiClient.post(`/api/users/${userId}/follow`),
  unfollowUser: (userId) => apiClient.post(`/api/users/${userId}/unfollow`),
  getSuggestedConnections: () => apiClient.get('/api/users/suggested/connections'),
};

export default axios;