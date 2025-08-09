import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:5000';
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

  // Login user
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
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
    <AuthContext.Provider value={{ user, loading, error, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext; 