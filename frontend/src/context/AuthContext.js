import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { storePrivateKey } from '../services/encryptionService';

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from storage on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await axios.get('/api/auth/profile');
        setUser(res.data);
      } catch (err) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post('/api/auth/register', userData);
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        
        // Store private key if provided (first-time registration)
        if (res.data.encryptionKeys && res.data.encryptionKeys.privateKey) {
          storePrivateKey(res.data._id, res.data.encryptionKeys.privateKey);
          console.log('🔐 Private key stored for new user');
        }
        
        setUser(res.data);
        return { success: true };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Send OTP to prefix@mit.asia
  const sendOtp = async (emailPrefix) => {
    try {
      const res = await axios.post('/api/auth/send-otp', { emailPrefix });
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP';
      return { success: false, error: errorMsg };
    }
  };

  // Verify OTP
  const verifyOtp = async (emailPrefix, code) => {
    try {
      const res = await axios.post('/api/auth/verify-otp', { emailPrefix, code });
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'OTP verification failed';
      return { success: false, error: errorMsg };
    }
  };

  // Forgot password: send OTP
  const sendResetOtp = async (emailPrefix) => {
    try {
      const res = await axios.post('/api/auth/forgot/send-otp', { emailPrefix });
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP';
      return { success: false, error: errorMsg };
    }
  };

  // Forgot password: verify OTP
  const verifyResetOtp = async (emailPrefix, code) => {
    try {
      const res = await axios.post('/api/auth/forgot/verify-otp', { emailPrefix, code });
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'OTP verification failed';
      return { success: false, error: errorMsg };
    }
  };

  // Forgot password: reset
  const resetPassword = async (emailOrPrefix, newPassword, usePersonalEmail = false) => {
    try {
      const payload = usePersonalEmail 
        ? { email: emailOrPrefix, newPassword, usePersonalEmail: true }
        : { emailPrefix: emailOrPrefix, newPassword };
      const res = await axios.post('/api/auth/forgot/reset', payload);
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Password reset failed';
      return { success: false, error: errorMsg };
    }
  };

  // Check username availability
  const checkUsername = async (username) => {
    try {
      const res = await axios.get('/api/auth/check-username', { params: { username } });
      return { success: true, ...res.data };
    } catch (err) {
      return { success: false, available: false, suggestions: [] };
    }
  };

  // Send OTP to personal email (for alumni)
  const sendPersonalEmailOtp = async (email) => {
    try {
      const res = await axios.post('/api/auth/send-personal-email-otp', { email });
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP';
      return { success: false, error: errorMsg };
    }
  };

  // Verify personal email OTP (for alumni)
  const verifyPersonalEmailOtp = async (email, code) => {
    try {
      const res = await axios.post('/api/auth/verify-personal-email-otp', { email, code });
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'OTP verification failed';
      return { success: false, error: errorMsg };
    }
  };

  // Login user
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      // Store private key if provided (for existing users who just got keys generated)
      if (res.data.encryptionKeys && res.data.encryptionKeys.privateKey) {
        storePrivateKey(res.data._id, res.data.encryptionKeys.privateKey);
        console.log('🔐 Private key stored for existing user');
      }
      
      setUser(res.data);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Invalid credentials';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (profileData, avatar) => {
    try {
      setLoading(true);
      setError(null);
      let formData;
      if (avatar) {
        formData = new FormData();
        Object.keys(profileData).forEach(key => {
          if (key === 'skills' && Array.isArray(profileData.skills)) {
            profileData.skills.forEach(skill => formData.append('skills[]', skill));
          } else if (key === 'socials' && typeof profileData.socials === 'object') {
            Object.keys(profileData.socials).forEach(socialKey => {
              formData.append(`socials[${socialKey}]`, profileData.socials[socialKey]);
            });
          } else {
            formData.append(key, profileData[key]);
          }
        });
        formData.append('avatar', avatar);
      }
      const res = await axios.put(
        '/api/auth/profile',
        formData || profileData,
        formData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
      );
      setUser(res.data);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Profile update failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Check if user can create content
  const canCreateContent = () => {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'teacher' || role === 'alumni' || role === 'admin';
  };

  // Logout user
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {}
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, logout, updateProfile, sendOtp, verifyOtp, checkUsername, canCreateContent, sendResetOtp, verifyResetOtp, resetPassword, sendPersonalEmailOtp, verifyPersonalEmailOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext; 