import React, { useEffect, useState } from 'react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [show2FA, setShow2FA] = useState(false);
  const [qr, setQR] = useState('');
  const [otp, setOTP] = useState('');
  const [twoFAStatus, setTwoFAStatus] = useState('');
  const [sessionStatus, setSessionStatus] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      (() => { const apiUrl = import.meta.env.VITE_API_URL; return fetch(`${apiUrl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()); })(),
      (() => { const apiUrl = import.meta.env.VITE_API_URL; return fetch(`${apiUrl}/api/decks/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()); })(),
      (() => { const apiUrl = import.meta.env.VITE_API_URL; return fetch(`${apiUrl}/api/auth/sessions`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()); })()
    ]).then(([userData, deckData, sessionData]) => {
      setUser(userData);
      setDecks(deckData);
      setSessions(sessionData);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="container">Loading...</div>;
  if (!user) return <div className="container">Not logged in.</div>;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL;
    const res = await fetch(`${apiUrl}/api/auth/delete-account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      localStorage.removeItem('token');
      window.location.href = '/';
    } else {
      alert('Error deleting account');
    }
  };

  // 2FA setup
  const handle2FASetup = async () => {
    setTwoFAStatus('');
    setShow2FA(true);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/2fa/setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.qr) setQR(data.qr);
    else setTwoFAStatus(data.error || 'Error generating QR');
  };

  // 2FA verify
  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setTwoFAStatus('');
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: otp })
    });
    const data = await res.json();
    if (res.ok) {
      setTwoFAStatus('2FA enabled!');
      setShow2FA(false);
      setUser({ ...user, twoFactorEnabled: true });
    } else {
      setTwoFAStatus(data.error || 'Error verifying 2FA');
    }
  };

  // 2FA disable
  const handle2FADisable = async () => {
    setTwoFAStatus('');
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setUser({ ...user, twoFactorEnabled: false });
      setTwoFAStatus('2FA disabled');
    } else {
      setTwoFAStatus('Error disabling 2FA');
    }
  };

  // Session revoke
  const handleRevokeSession = async (jwtId) => {
    setSessionStatus('');
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/sessions/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jwtId })
    });
    if (res.ok) {
      setSessions(sessions.map(s => s.jwtId === jwtId ? { ...s, revoked: true } : s));
      setSessionStatus('Session revoked');
    } else {
      setSessionStatus('Error revoking session');
    }
  };

  return (
    <div className="container">
      <h2>Profile</h2>
      <div><strong>Username:</strong> {user.username}</div>
      <h3>Your Decks</h3>
      <ul>
        {decks.map(deck => (
          <li key={deck._id}>{deck.name} ({deck.cards.length} cards)</li>
        ))}
      </ul>
      <button onClick={handleDelete} style={{ background: '#c00', color: '#fff', marginTop: 16 }}>Delete Account</button>
      <hr style={{ margin: '24px 0' }} />
      <h3>Security</h3>
      <div>
        <strong>Two-Factor Authentication (2FA):</strong>
        {user.twoFactorEnabled ? (
          <>
            <span style={{ color: 'green', marginLeft: 8 }}>Enabled</span>
            <button onClick={handle2FADisable} style={{ marginLeft: 16 }}>Disable 2FA</button>
          </>
        ) : (
          <>
            <span style={{ color: 'red', marginLeft: 8 }}>Disabled</span>
            <button onClick={handle2FASetup} style={{ marginLeft: 16 }}>Enable 2FA</button>
          </>
        )}
        {twoFAStatus && <div style={{ marginTop: 8, color: twoFAStatus.includes('enabled') ? 'green' : 'red' }}>{twoFAStatus}</div>}
        {show2FA && qr && (
          <form onSubmit={handle2FAVerify} style={{ marginTop: 16 }}>
            <div>Scan this QR code with your authenticator app:</div>
            <img src={qr} alt="2FA QR" style={{ margin: '12px 0', width: 180, height: 180 }} />
            <div>
              <input
                type="text"
                value={otp}
                onChange={e => setOTP(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                style={{ width: 120, marginRight: 8 }}
              />
              <button type="submit">Verify</button>
            </div>
          </form>
        )}
      </div>
      <div style={{ marginTop: 32 }}>
        <strong>Active Sessions:</strong>
        {sessionStatus && <div style={{ color: 'green', marginBottom: 8 }}>{sessionStatus}</div>}
        <ul>
          {sessions.map(s => (
            <li key={s.jwtId} style={{ opacity: s.revoked ? 0.5 : 1 }}>
              {s.userAgent} — {new Date(s.createdAt).toLocaleString()} {s.revoked ? <span style={{ color: 'red' }}>(revoked)</span> : <button onClick={() => handleRevokeSession(s.jwtId)} style={{ marginLeft: 8 }}>Revoke</button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
