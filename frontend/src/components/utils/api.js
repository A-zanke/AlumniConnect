import axios from "axios";
import { toast } from "react-toastify";

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  timeout: 30000, // Default timeout 30 seconds
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Set longer timeout for file uploads
    if (
      config.headers["Content-Type"] &&
      config.headers["Content-Type"].includes("multipart/form-data")
    ) {
      config.timeout = 60000; // 60 seconds for uploads
    }
    // Set shorter timeout for health checks
    if (config.url && config.url.includes("health")) {
      config.timeout = 10000; // 10 seconds for health checks
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    if (
      response &&
      response.status === 401 &&
      !error.config.url.includes("/api/auth/")
    ) {
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
        toast.error("Session expired. Please login again.");
      }
    }
    // Enhanced error logging
    const timestamp = new Date().toISOString();
    const userId = localStorage.getItem("userId") || "unknown"; // Assuming userId is stored, fallback to unknown
    const errorDetails = {
      timestamp,
      userId,
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
      headers: error.config?.headers,
      status: response?.status,
      responseData: response?.data,
      responseHeaders: response?.headers,
      message: error.message,
    };
    console.error("API Error:", errorDetails);
    // Send to error tracking service if available (placeholder)
    // if (window.errorTrackingService) window.errorTrackingService.captureException(error, errorDetails);

    if (response && response.status === 500) {
      toast.error("Server error. Please try again later.");
    }
    // Handle timeout errors
    if (error.code === "ECONNABORTED") {
      toast.error("Request timed out. Please try again.");
    }
    // Retry logic for 500 errors on idempotent operations or network errors
    let retryCount = error.config.retryCount || 0;
    const maxRetries = 2; // Up to 2 retries for 500, adjust if needed for network
    const isIdempotent500 =
      response &&
      response.status === 500 &&
      ["GET", "PUT"].includes(error.config.method?.toUpperCase());
    const isNetworkError = !response;
    if ((isIdempotent500 || isNetworkError) && retryCount < maxRetries) {
      retryCount++;
      error.config.retryCount = retryCount;
      const retryDelay = (attempt) => Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(apiClient.request(error.config));
        }, retryDelay(retryCount));
      });
    }
    return Promise.reject(error);
  }
);

const appendToFormData = (formData, key, value) => {
  if (value === undefined || value === null) return;

  if (key === "image") {
    formData.append("image", value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item === undefined || item === null) return;
      if (typeof item === "object") {
        formData.append(key, JSON.stringify(item));
      } else {
        formData.append(key, item);
      }
    });
    return;
  }

  if (typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, value);
};

export const postsAPI = {
  getPosts: (params) => apiClient.get("/api/posts", { params }),
  getFeed: () => apiClient.get("/api/posts/feed"),
  getPost: (id) => apiClient.get(`/api/posts/${id}`),
  getUserPosts: (userId) => apiClient.get(`/api/posts/user/${userId}`),
  getSavedPosts: () => apiClient.get("/api/posts/saved/mine"),
  createPost: (postData) => {
    if (postData.media) {
      const formData = new FormData();
      formData.append("content", postData.content);
      formData.append("media", postData.media);
      if (postData.tags) {
        formData.append("tags", postData.tags);
      }
      return apiClient.post("/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return apiClient.post("/api/posts", postData);
  },
  deletePost: (id) => apiClient.delete(`/api/posts/${id}`),
  likePost: (id) => apiClient.put(`/api/posts/${id}/like`),
  reactToPost: (id, type) => apiClient.post(`/api/posts/${id}/react`, { type }),
  commentOnPost: (postId, content) =>
    apiClient.post(`/api/posts/${postId}/comment`, { content }),
  toggleBookmark: (id) => apiClient.post(`/api/posts/${id}/bookmark`),
  sharePost: (id, payload) =>
    apiClient.post(`/api/posts/${id}/share`, payload || {}),
  savePost: (id) => apiClient.post(`/api/posts/${id}/save`),
  unsavePost: (id) => apiClient.delete(`/api/posts/${id}/save`),
  deleteComment: (postId, commentId) =>
    apiClient.delete(`/api/posts/${postId}/comment/${postId}`),
};

export const eventsAPI = {
  getEvents: (upcomingOnly = false) =>
    apiClient.get("/api/events", { params: { upcoming: upcomingOnly } }),
  getMyEvents: () => apiClient.get("/api/events/mine"),
  getMyRegisteredEvents: () => apiClient.get("/api/events/registered/mine"),
  getEvent: (id) => apiClient.get(`/api/events/${id}`),
  createEvent: (eventData) => {
    const formData = new FormData();
    Object.keys(eventData).forEach((key) => {
      appendToFormData(formData, key, eventData[key]);
    });
    return apiClient.post("/api/events", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  updateEvent: (id, eventData) => {
    const formData = new FormData();
    Object.keys(eventData).forEach((key) => {
      appendToFormData(formData, key, eventData[key]);
    });
    return apiClient.put(`/api/events/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteEvent: (id) => apiClient.delete(`/api/events/${id}`),
  rsvpEvent: (id) => apiClient.post(`/api/events/${id}/rsvp`),
  getPendingEvents: () => apiClient.get("/api/admin/events/pending"),
  approveEvent: (id) => apiClient.put(`/api/events/${id}/approve`),
  rejectEvent: (id) => apiClient.put(`/api/events/${id}/reject`),
  // Registration endpoints
  registerForEvent: (id, registrationData) =>
    apiClient.post(`/api/events/${id}/register`, registrationData),
  checkRegistration: (id) =>
    apiClient.get(`/api/events/${id}/check-registration`),
  getEventRegistrations: (id) =>
    apiClient.get(`/api/events/${id}/registrations`),
  downloadRegistrationsCSV: (id) =>
    apiClient.get(`/api/events/${id}/registrations/download`, {
      responseType: "blob",
    }),
  markAttendance: (registrationId, attended) =>
    apiClient.put(`/api/events/registrations/${registrationId}/attendance`, {
      attended,
    }),
};

export const connectionAPI = {
  sendRequest: (userId) => apiClient.post("/api/connections", { userId }),
  acceptRequest: (userId) => apiClient.put(`/api/connections/${userId}/accept`),
  rejectRequest: (userId) =>
    apiClient.delete(`/api/connections/${userId}/reject`),
  removeConnection: (userId) => apiClient.delete(`/api/connections/${userId}`),
  getConnectionStatus: (userId) =>
    apiClient.get(`/api/connections/status/${userId}`),
  getConnections: () => apiClient.get("/api/connections"),
  getPendingRequests: () => apiClient.get("/api/connections/requests"),
  getSuggestedConnections: () => apiClient.get("/api/connections/suggested"),
  getRequestHistory: () => apiClient.get("/api/connections/requests/history"),
};

export const recommendationsAPI = {
  getAlumni: (studentId) => apiClient.get(`/api/recommendations/alumni`),
};

export const userAPI = {
  register: (userData) => axios.post("/api/auth/register", userData),
  login: (credentials) => axios.post("/api/auth/login", credentials),
  logout: () => axios.post("/api/auth/logout"),
  getProfile: () => apiClient.get("/api/auth/profile"),
  getUserByUsername: (username) =>
    apiClient.get(`/api/users/username/${username}`),
  getUserById: (userId) => apiClient.get(`/api/users/${userId}`),
  getUserConnections: (userId) =>
    apiClient.get(`/api/users/${userId}/connections`),
  updateProfile: (userData, avatar = null) => {
    if (
      avatar ||
      Object.keys(userData).some((key) => userData[key] !== undefined)
    ) {
      // Only send formData if avatar or other data exists
      const formData = new FormData();
      Object.keys(userData).forEach((key) => {
        if (key === "socials" && typeof userData[key] === "object") {
          Object.keys(userData[key]).forEach((socialKey) => {
            if (userData[key][socialKey] !== undefined) {
              formData.append(
                `socials[${socialKey}]`,
                userData[key][socialKey]
              );
            }
          });
        } else if (Array.isArray(userData[key])) {
          userData[key].forEach((item) => formData.append(`${key}[]`, item)); // For array fields
        } else if (
          typeof userData[key] === "object" &&
          userData[key] !== null
        ) {
          // Handle nested objects if necessary, e.g., higher_studies
          Object.keys(userData[key]).forEach((nestedKey) => {
            if (userData[key][nestedKey] !== undefined) {
              formData.append(`${key}[${nestedKey}]`, userData[key][nestedKey]);
            }
          });
        } else if (userData[key] !== undefined) {
          formData.append(key, userData[key]);
        }
      });
      if (avatar) {
        formData.append("avatar", avatar);
      }
      return apiClient.put("/api/auth/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    // If no avatar and no other user data to update, send a simple PUT
    return apiClient.put("/api/auth/profile", userData);
  },
  // NEW: Function to delete user avatar
  deleteAvatar: () => apiClient.delete("/api/users/remove-avatar"), // Updated to match backend route
  updatePresence: (isOnline) =>
    apiClient.put("/api/users/presence", { isOnline }),
  getPresence: (userId) => apiClient.get(`/api/users/${userId}/presence`),
  // Delete entire user account and all associated data
  deleteAccount: () => apiClient.delete("/api/users/account"),
};

export const fetchMessages = async (userId) => {
  try {
    const response = await apiClient.get(`/api/messages/${userId}`);
    return response.data?.messages || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

export const sendMessage = async (userId, content, image = null) => {
  try {
    const formData = new FormData();
    formData.append("content", content);
    if (image) {
      formData.append("image", image);
    }
    const response = await apiClient.post(`/api/messages/${userId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const unreadAPI = {
  getSnapshotFromConversations: async () => {
    try {
      const resp = await apiClient.get("/api/messages");
      const rows = Array.isArray(resp?.data?.data) ? resp.data.data : [];
      const total =
        typeof resp?.data?.totalUnread === "number"
          ? resp.data.totalUnread
          : rows.reduce((s, r) => s + (r.unreadCount || 0), 0);
      return rows.map((c) => ({
        conversationId: c.threadId || c._id,
        count: c.unreadCount || 0,
        total,
      }));
    } catch (e) {
      return [];
    }
  },
};

export const messagesAPI = {
  bulkChatActions: (payload) =>
    apiClient.post("/api/messages/bulk-actions", payload),
  markMessagesAsRead: (conversationId) =>
    apiClient.post("/api/messages/mark-read", { conversationId }),
};

export const followAPI = {
  getFollowing: (userId) => apiClient.get(`/api/users/${userId}/following`),
  getMutualConnections: (userId) =>
    apiClient.get(`/api/users/${userId}/mutual`),
  getMyMutualConnections: () => apiClient.get("/api/users/mutual/connections"),
  followUser: (userId) => apiClient.post(`/api/users/${userId}/follow`),
  unfollowUser: (userId) => apiClient.post(`/api/users/${userId}/unfollow`),
  getSuggestedConnections: () =>
    apiClient.get("/api/users/suggested/connections"),
};

export default axios;
