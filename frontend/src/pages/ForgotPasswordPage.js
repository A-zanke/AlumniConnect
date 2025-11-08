import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const { sendResetOtp, verifyResetOtp, resetPassword, sendPersonalEmailOtp, verifyPersonalEmailOtp } = useAuth();
  const navigate = useNavigate();

  const [usePersonalEmail, setUsePersonalEmail] = useState(false);
  const [emailPrefix, setEmailPrefix] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [step, setStep] = useState('request'); // request | verify | reset
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    setLoading(true); setError(''); setMessage('');
    let res;
    if (usePersonalEmail) {
      res = await sendPersonalEmailOtp(personalEmail.trim());
    } else {
      res = await sendResetOtp(emailPrefix.trim());
    }
    setLoading(false);
    if (res.success) { setMessage('OTP sent to your email'); setStep('verify'); }
    else setError(res.error);
  };

  const handleVerify = async () => {
    setLoading(true); setError(''); setMessage('');
    let res;
    if (usePersonalEmail) {
      res = await verifyPersonalEmailOtp(personalEmail.trim(), otp.trim());
    } else {
      res = await verifyResetOtp(emailPrefix.trim(), otp.trim());
    }
    setLoading(false);
    if (res.success) { setMessage('OTP verified'); setStep('reset'); }
    else setError(res.error);
  };

  const handleReset = async () => {
    setLoading(true); setError(''); setMessage('');
    const email = usePersonalEmail ? personalEmail.trim() : emailPrefix.trim();
    const res = await resetPassword(email, newPassword, usePersonalEmail);
    setLoading(false);
    if (res.success) {
      setMessage('Password updated. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {message && <div className="text-green-600 mb-2">{message}</div>}

      {step === 'request' && (
        <div className="space-y-4">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!usePersonalEmail}
                onChange={() => setUsePersonalEmail(false)}
              />
              <span>College Email</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={usePersonalEmail}
                onChange={() => setUsePersonalEmail(true)}
              />
              <span>Personal Email</span>
            </label>
          </div>

          {usePersonalEmail ? (
            <label className="block">
              <span className="text-sm">Personal Email</span>
              <input
                className="border rounded px-3 py-2 w-full"
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="your.email@gmail.com"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm">Email prefix</span>
              <div className="flex items-center gap-2">
                <input
                  className="border rounded px-3 py-2 flex-1"
                  value={emailPrefix}
                  onChange={(e) => { if (!e.target.value.includes('@')) setEmailPrefix(e.target.value); }}
                  placeholder="yourname"
                />
                <span>@mit.asia</span>
              </div>
            </label>
          )}

          <button
            onClick={handleSend}
            disabled={loading || (usePersonalEmail ? !personalEmail : !emailPrefix)}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div>OTP sent to {usePersonalEmail ? personalEmail : `${emailPrefix}@mit.asia`}</div>
          <input
            className="border rounded px-3 py-2 w-full"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter 6-digit OTP"
          />
          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </div>
      )}

      {step === 'reset' && (
        <div className="space-y-4">
          <input
            className="border rounded px-3 py-2 w-full"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New strong password"
          />
          <button
            onClick={handleReset}
            disabled={loading || newPassword.length < 8}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordPage