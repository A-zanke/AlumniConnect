import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000'
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
      if (Array.isArray(v)) v.forEach(item => formData.append(k, item));
      else if (v !== undefined && v !== null) formData.append(k, v);
    });
    return apiClient.post('/api/forum/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getPost: (id) => apiClient.get(`/api/forum/posts/${id}`),
  upvotePost: (id) => apiClient.post(`/api/forum/posts/${id}/upvote`),
  bookmarkPost: (id) => apiClient.post(`/api/forum/posts/${id}/bookmark`),
  addComment: (id, body) => apiClient.post(`/api/forum/posts/${id}/comments`, body),
  upvoteComment: (commentId) => apiClient.post(`/api/forum/comments/${commentId}/upvote`),
  votePoll: (id, optionIndex) => apiClient.post(`/api/forum/posts/${id}/poll/vote`, { optionIndex }),
  reportTarget: (id, targetType, reason) => apiClient.post(`/api/forum/${id}/report`, { targetType, reason }),
  leaderboard: () => apiClient.get('/api/forum/leaderboard')
};