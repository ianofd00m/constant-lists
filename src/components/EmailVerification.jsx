import React, { useEffect, useState } from 'react';

export default function EmailVerification() {
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setStatus('Invalid verification link.');
      return;
    }
    const apiUrl = import.meta.env.VITE_API_URL;
    fetch(`${apiUrl}/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.message) setStatus('Email verified! You can now log in.');
        else setStatus(data.error || 'Verification failed.');
      })
      .catch(() => setStatus('Verification failed.'));
  }, []);

  return (
    <div className="container">
      <h2>Email Verification</h2>
      <div>{status}</div>
    </div>
  );
}
