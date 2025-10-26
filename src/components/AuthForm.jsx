import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import './AuthForm.css';

import { useEffect } from 'react';

export default function AuthForm({ mode = 'login' }) {
  // Removed excessive console logs to prevent spam
  
  const location = useLocation();
  
  // Clear error and success messages on unmount or route change
  useEffect(() => {
    return () => {
      setErrorMsg('');
      setSuccessMsg('');
    };
  }, [mode]);

  // Check for redirect message in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const message = urlParams.get('message');
    if (message) {
      setErrorMsg(decodeURIComponent(message));
    }
  }, [location]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const navigate = useNavigate();

  // Password requirements
  const passwordRequirements = 'At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character';
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  // Individual password requirement checks
  const getPasswordRequirements = (pw) => {
    return {
      length: pw && pw.length >= 8,
      lowercase: pw && /[a-z]/.test(pw),
      uppercase: pw && /[A-Z]/.test(pw),
      number: pw && /\d/.test(pw),
      special: pw && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)
    };
  };

  // Check if passwords match
  const getPasswordMatch = () => {
    if (!password || !confirmPassword) return null;
    return password === confirmPassword;
  };

  // Password strength checker
  function getPasswordStrength(pw) {
    if (!pw) return '';
    if (pw.length < 8) return 'Too short';
    let score = 0;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) score++;
    if (score <= 2) return 'Weak';
    if (score === 3) return 'Medium';
    if (score === 4) return 'Strong';
    return '';
  }

  // Update password strength on change
  React.useEffect(() => {
    setPasswordStrength(getPasswordStrength(password));
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (mode === 'register') {
      if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
        setErrorMsg('Please enter a valid email.');
        return;
      }
      if (!passwordRegex.test(password)) {
        setErrorMsg('Password does not meet requirements.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/auth/${mode}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { username, email, password } : { username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setSuccessMsg('Logged in!');
        toast.success('Logged in!');
        navigate('/');
      } else if (res.ok) {
        setSuccessMsg('Registered! Please check your email to verify your account.');
        toast.success('Registered! Please check your email to verify your account.');
        navigate('/login');
      } else {
        setErrorMsg(
          data.error ||
          data.message ||
          data.errors?.[0]?.msg ||
          'An unknown error occurred. Please try again.'
        );
      }
    } catch {
      setErrorMsg('Network error');
    }
    setLoading(false);
  };

  // Resend verification
  const handleResend = async (e) => {
    e.preventDefault();
    setResendSent(false);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail })
      });
      const data = await res.json();
      if (res.ok) setResendSent(true);
      else setErrorMsg(data.error || 'Error');
    } catch {
      setErrorMsg('Network error');
    }
  };

  // Password reset request
  const handleReset = async (e) => {
    e.preventDefault();
    setResetSent(false);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const url = `${apiUrl}/api/auth/reset-password-request`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (res.ok) setResetSent(true);
      else setErrorMsg(data.error || 'Error');
    } catch (err) {
      setErrorMsg('Network error');
    }
  };

  // Show reset password form
  if (showReset) {
    return (
      <form onSubmit={handleReset} className="auth-form" aria-label="Reset password form">
        <h2>Reset Password</h2>
        <div className="form-group">
          <input
            id="resetEmail"
            type="email"
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
            placeholder="Email"
            required
          />
        </div>
        {resetSent && <div className="success-message">If an account exists, a reset link has been sent.</div>}
        {errorMsg && <div className="error-message">{errorMsg}</div>}
        <button type="submit" className="auth-button">Send Reset Link</button>
        <div className="auth-link">
          <a href="#" onClick={e => { e.preventDefault(); setShowReset(false); }}>Back to login</a>
        </div>
      </form>
    );
  }

  // Show resend verification form
  if (showResend) {
    return (
      <form onSubmit={handleResend} className="auth-form" aria-label="Resend verification form">
        <h2>Resend Verification Email</h2>
        <div className="form-group">
          <input
            type="email"
            value={resendEmail}
            onChange={e => setResendEmail(e.target.value)}
            placeholder="Email"
            required
          />
        </div>
        <button type="submit" className="auth-button">Resend</button>
        {resendSent && <div className="success-message">Verification email sent.</div>}
        {errorMsg && <div className="error-message">{errorMsg}</div>}
        <div className="auth-link">
          <a href="#" onClick={e => { e.preventDefault(); setShowResend(false); }}>Back to login</a>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form" aria-label={mode === 'login' ? 'Login form' : 'Register form'}>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <div className="form-group">
        <input
          id="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          required
          minLength={3}
          aria-required="true"
          autoComplete="username"
        />
      </div>
      {mode === 'register' && (
        <div className="form-group">
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            aria-required="true"
            autoComplete="email"
          />
        </div>
      )}
      <div className="form-group">
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={8}
          aria-required="true"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          aria-describedby={mode === 'register' ? 'password-req password-strength' : undefined}
        />
      </div>
      {mode === 'register' && (
        <>
          <div id="password-req" className="password-requirements">
            {(() => {
              const reqs = getPasswordRequirements(password);
              return (
                <div>
                  <div className={`requirement ${reqs.length ? 'met' : 'unmet'}`}>
                    <span className="checkmark">{reqs.length ? '✓' : '○'}</span>
                    At least 8 characters
                  </div>
                  <div className={`requirement ${reqs.lowercase ? 'met' : 'unmet'}`}>
                    <span className="checkmark">{reqs.lowercase ? '✓' : '○'}</span>
                    One lowercase letter
                  </div>
                  <div className={`requirement ${reqs.uppercase ? 'met' : 'unmet'}`}>
                    <span className="checkmark">{reqs.uppercase ? '✓' : '○'}</span>
                    One uppercase letter
                  </div>
                  <div className={`requirement ${reqs.number ? 'met' : 'unmet'}`}>
                    <span className="checkmark">{reqs.number ? '✓' : '○'}</span>
                    One number
                  </div>
                  <div className={`requirement ${reqs.special ? 'met' : 'unmet'}`}>
                    <span className="checkmark">{reqs.special ? '✓' : '○'}</span>
                    One special character
                  </div>
                </div>
              );
            })()}
          </div>
          <div id="password-strength" className={`password-strength ${passwordStrength.toLowerCase()}`}>Strength: {passwordStrength}</div>
        </>
      )}
      {mode === 'register' && (
        <>
          <div className="form-group">
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              minLength={8}
              aria-required="true"
              autoComplete="new-password"
            />
          </div>
          {confirmPassword && (
            <div className="password-match">
              {(() => {
                const isMatch = getPasswordMatch();
                return (
                  <div className={`requirement ${isMatch ? 'met' : 'unmet'}`}>
                    <span className="checkmark">{isMatch ? '✓' : '✗'}</span>
                    {isMatch ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
      {errorMsg && <div role="alert" className="error-message">{errorMsg}</div>}
      {successMsg && <div role="status" className="success-message">{successMsg}</div>}
      <button type="submit" disabled={loading} className="auth-button">
        {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Register'}
      </button>
      {mode === 'login' && (
        <>
          <div className="auth-link">
            <a href="#" onClick={e => { e.preventDefault(); setShowReset(true); }}>Forgot password?</a>
          </div>
          <div className="auth-link">
            <a href="/register">make an account</a>
          </div>
          <div className="auth-link">
            <a href="#" onClick={e => { e.preventDefault(); setShowResend(true); }}>Resend verification email</a>
          </div>
        </>
      )}
      {mode === 'register' && (
        <div className="auth-link" style={{ fontSize: '13px' }}>
          By creating an account, you agree to our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.
        </div>
      )}
    </form>
  );
}
