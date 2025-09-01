import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    emailPrefix: '',
    useEmailPrefix: false,
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const identifier = formData.useEmailPrefix
        ? `${formData.emailPrefix}@mit.asia`
        : formData.username;
      const result = await login(identifier, formData.password);
      if (result.success) {
        navigate('/profile');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-container">
        <h2 className="login-title">Sign in to your account</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          <div className="login-field">
            <label className="login-label">Email or Username</label>
            {!formData.useEmailPrefix ? (
              <input
                name="username"
                type="text"
                autoComplete="username"
                required
                className="login-input"
                placeholder="Enter your email or username"
                value={formData.username}
                onChange={handleChange}
              />
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  name="emailPrefix"
                  type="text"
                  required
                  className="login-input"
                  placeholder="email prefix"
                  value={formData.emailPrefix}
                  onChange={(e) => {
                    if (e.target.value.includes('@')) return;
                    handleChange(e);
                  }}
                />
                <span>@mit.asia</span>
              </div>
            )}
            <div style={{ marginTop: '8px' }}>
              <label className="login-checkbox">
                <input
                  type="checkbox"
                  checked={formData.useEmailPrefix}
                  onChange={(e) => setFormData(prev => ({ ...prev, useEmailPrefix: e.target.checked }))}
                />
                Use email prefix (@mit.asia)
              </label>
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="password" className="login-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="login-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div className="login-row">
            <label className="login-checkbox">
              <input type="checkbox" /> Remember me
            </label>
            <button
              type="button"
              className="login-link"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot your password?
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="login-btn"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="login-footer">
          <span>Don't have an account? </span>
          <button
            type="button"
            className="login-link"
            onClick={() => navigate('/register')}
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;