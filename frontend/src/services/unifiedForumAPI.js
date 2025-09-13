import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000'
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No token found in localStorage');
  }
  console.log('API Request:', config.method?.toUpperCase(), config.url, config.headers);
  return config;
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.config?.url, error.response?.data);
    return Promise.reject(error);
  }
);

// Unified Forum API
export const unifiedForumAPI = {
  // Posts
  getPosts: (params = {}) => apiClient.get('/api/unified-forum/posts', { params }),
  
  createPost: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (Array.isArray(value)) {
        value.forEach(item => formData.append(key, item));
      } else if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
    return apiClient.post('/api/unified-forum/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getPost: (id, params = {}) => apiClient.get(`/api/unified-forum/posts/${id}`, { params }),
  
  updatePost: (id, data) => apiClient.put(`/api/unified-forum/posts/${id}`, data),
  
  deletePost: (id) => apiClient.delete(`/api/unified-forum/posts/${id}`),
  
  // Reactions
  addReaction: (postId, emoji) => 
    apiClient.post(`/api/unified-forum/posts/${postId}/reactions`, { emoji }),
  
  // Comments
  createComment: (postId, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (Array.isArray(value)) {
        value.forEach(item => formData.append(key, item));
      } else if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
    return apiClient.post(`/api/unified-forum/posts/${postId}/comments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  addCommentReaction: (commentId, emoji) => 
    apiClient.post(`/api/unified-forum/comments/${commentId}/reactions`, { emoji }),
  
  deleteComment: (commentId) => apiClient.delete(`/api/unified-forum/comments/${commentId}`),
  
  // Polls
  votePoll: (postId, optionIndex) => 
    apiClient.post(`/api/unified-forum/posts/${postId}/poll/vote`, { optionIndex })
};

export default unifiedForumAPI;
