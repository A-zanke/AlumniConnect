import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://10.183.168.134:5000'
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const forumAPI = {
  listPosts: (params = {}) => apiClient.get('/api/forum/posts', { params }),
  createPost: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(k => {
      const v = data[k];
      if (k === 'media' && Array.isArray(v)) {
        v.forEach(file => formData.append('media', file));
      } else if (Array.isArray(v)) {
        v.forEach(item => formData.append(k, item));
      } else if (v !== undefined && v !== null) {
        formData.append(k, v);
      }
    });
    return apiClient.post('/api/forum/posts', formData, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
  },
  getPost: (id) => apiClient.get(`/api/forum/posts/${id}`),
  upvotePost: (id) => apiClient.post(`/api/forum/posts/${id}/upvote`),
  // Support all reaction types: 'like'|'love'|'laugh'|'wow'|'sad'|'angry'
  addReaction: (id, reactionType = 'like') => apiClient.post(`/api/forum/posts/${id}/reactions`, { reactionType }),
  getReactions: (id) => apiClient.get(`/api/forum/posts/${id}/reactions`),
  sharePost: (id, connectionIds, message = '') => apiClient.post(`/api/forum/posts/${id}/share`, { connectionIds, message }),
  deletePost: (id) => apiClient.delete(`/api/forum/posts/${id}`),
  bookmarkPost: (id) => apiClient.post(`/api/forum/posts/${id}/bookmark`),
  addComment: (id, body) => apiClient.post(`/api/forum/posts/${id}/comments`, body),
  upvoteComment: (commentId) => apiClient.post(`/api/forum/comments/${commentId}/upvote`),
  reactToComment: (commentId, type = 'like') => apiClient.post(`/api/forum/comments/${commentId}/reactions`, { type }),
  votePoll: (id, optionIndex) => apiClient.post(`/api/forum/posts/${id}/poll/vote`, { optionIndex }),
  getPollOptionVoters: (id, optionIndex) => apiClient.get(`/api/forum/posts/${id}/poll/${optionIndex}/voters`),
  getUserConnections: () => apiClient.get('/api/forum/connections'),
  reportTarget: (id, targetType, reason) => apiClient.post(`/api/forum/${id}/report`, { targetType, reason }),
  leaderboard: () => apiClient.get('/api/forum/leaderboard')
};