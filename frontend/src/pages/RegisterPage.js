import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './RegisterPage.css';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    emailPrefix: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
    otherDepartment: '',
    year: '',
    graduationYear: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, sendOtp, verifyOtp, checkUsername } = useAuth();
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ available: null, suggestions: [] });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSendOtp = async () => {
    if (!formData.emailPrefix || /@/.test(formData.emailPrefix)) {
      setError('Enter email prefix only');
      return;
    }
    setError('');
    const resp = await sendOtp(formData.emailPrefix.trim());
    if (resp.success) {
      setOtpSent(true);
    } else {
      setError(resp.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    const resp = await verifyOtp(formData.emailPrefix.trim(), otpCode.trim());
    if (resp.success) {
      setEmailVerified(true);
      setFormData(prev => ({ ...prev, email: resp.data?.email || `${formData.emailPrefix}@mit.asia` }));
    } else {
      setError(resp.error || 'OTP verification failed');
    }
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!formData.username) { setUsernameStatus({ available: null, suggestions: [] }); return; }
      const resp = await checkUsername(formData.username);
      if (resp.success) {
        setUsernameStatus({ available: resp.available, suggestions: resp.suggestions || [] });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [formData.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Step gating
    if (step === 1) {
      if (!formData.name.trim()) { setError('Full Name is required'); return; }
      setStep(2); return;
    }
    if (step === 2) {
      if (!emailVerified) { setError('Please verify your email via OTP'); return; }
      setStep(3); return;
    }
    if (step === 3) {
      if (!formData.username) { setError('Username is required'); return; }
      if (usernameStatus.available === false) { setError('Choose a different username'); return; }
      setStep(4); return;
    }
    if (step === 4) {
      if (!formData.department || (formData.department === 'Other' && !formData.otherDepartment.trim())) { setError('Select department'); return; }
      if (formData.role === 'student' && !formData.year) { setError('Select year'); return; }
      setStep(5); return;
    }
    if (step === 5) {
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
      const finalEmail = `${formData.emailPrefix}@mit.asia`;
      setLoading(true);
      try {
        const result = await register({
          name: formData.name,
          username: formData.username,
          email: finalEmail,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: formData.role,
          department: formData.department === 'Other' ? formData.otherDepartment : formData.department,
          year: formData.role === 'student' ? Number(formData.year) : undefined,
          graduationYear: formData.role === 'alumni' ? Number(formData.graduationYear) : undefined
        });
        if (result.success) { navigate('/profile'); } else { setError(result.error || 'Registration failed'); }
      } catch (err) {
        setError(err.message || 'Registration failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="register-container">
      <div className="register-content">
        <div className="register-form-container">
          <h2 className="register-title">Create Account</h2>
          <p className="register-subtitle">Join our alumni network today</p>
          
          <form className="register-form" onSubmit={handleSubmit}>
            {error && <div className="register-error">{error}</div>}

            {step === 1 && (
              <div className="register-field">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
            )}

            {step === 2 && (
              <div className="register-field">
                <label>Institution Email</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="emailPrefix"
                    value={formData.emailPrefix}
                    onChange={(e) => {
                      if (e.target.value.includes('@')) return; // prevent typing @
                      handleChange(e);
                    }}
                    required
                    placeholder="email prefix"
                  />
                  <span>@mit.asia</span>
                  {!otpSent && (
                    <button type="button" onClick={handleSendOtp} className="register-button" style={{ padding: '8px 12px' }}>Verify</button>
                  )}
                </div>
                {otpSent && !emailVerified && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    />
                    <button type="button" onClick={handleVerifyOtp} className="register-button" style={{ padding: '8px 12px' }}>Submit OTP</button>
                  </div>
                )}
                {emailVerified && <div className="register-success">Email verified</div>}
              </div>
            )}

            {step === 3 && (
              <div className="register-field">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Choose a username"
                />
                {usernameStatus.available === false && (
                  <div className="register-error">Username taken. Suggestions: {usernameStatus.suggestions.join(', ')}</div>
                )}
                {usernameStatus.available === true && formData.username && (
                  <div className="register-success">Username available</div>
                )}
              </div>
            )}

            {step === 4 && (
              <>
                <div className="register-field">
                  <label>I am a</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="register-select"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="alumni">Alumni</option>
                  </select>
                </div>

                <div className="register-field">
                  <label>Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="register-select"
                    required
                  >
                    <option value="">Select department</option>
                    <option value="CSE">CSE</option>
                    <option value="AI-DS">AI-DS</option>
                    <option value="Civil">Civil</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="ETC">ETC</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.department === 'Other' && (
                    <input
                      type="text"
                      name="otherDepartment"
                      placeholder="Enter your department"
                      value={formData.otherDepartment}
                      onChange={handleChange}
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </div>

                {formData.role === 'student' && (
                  <div className="register-field">
                    <label>Year</label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className="register-select"
                      required
                    >
                      <option value="">Select year</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                )}

                {formData.role === 'alumni' && (
                  <div className="register-field">
                    <label>Graduation Year</label>
                    <input
                      type="number"
                      name="graduationYear"
                      placeholder="e.g., 2022"
                      value={formData.graduationYear}
                      onChange={handleChange}
                      min="1950"
                      max="2099"
                      step="1"
                    />
                  </div>
                )}
              </>
            )}

            {step === 5 && (
              <>
                <div className="register-field">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a password"
                  />
                  <small>Min 8 chars, uppercase, lowercase, number, special</small>
                </div>

                <div className="register-field">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your password"
                  />
                </div>
              </>
            )}

            <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
              {step > 1 && (
                <button type="button" className="register-button" onClick={() => setStep(step - 1)}>Back</button>
              )}
              <button type="submit" className="register-button" disabled={loading}>
                {step < 5 ? 'Next' : (loading ? 'Creating Account...' : 'Create Account')}
              </button>
            </div>
          </form>

          <p className="register-login-link">
            Already have an account?{' '}
            <button
              type="button"
              className="register-link"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </p>
        </div>

        <div className="register-image-container">
          <div className={`register-image ${formData.role}`}>
            <div className="register-overlay">
              <h3>Welcome to MIT Alumni Network</h3>
              <p>Connect, Share, and Grow Together</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;