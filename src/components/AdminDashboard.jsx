import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userDetails, setUserDetails] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('token');

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Admin access required');
          return;
        }
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Failed to load analytics');
    }
  };

  // Fetch users
  const fetchUsers = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/admin/users?page=${pageNum}&limit=25`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.pages);
      setPage(pageNum);
    } catch (error) {
      console.error('Users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user details
  const fetchUserDetails = async (userId) => {
    try {
      const response = await fetch(`${apiUrl}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setUserDetails(data);
      setShowUserModal(true);
    } catch (error) {
      console.error('User details error:', error);
      toast.error('Failed to load user details');
    }
  };

  // Delete user
  const deleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}" and all their data?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      const data = await response.json();
      toast.success(`Deleted user ${username} and ${data.deletedDecks} decks`);
      fetchUsers(page); // Refresh users list
      fetchAnalytics(); // Refresh analytics
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete user');
    }
  };

  // Bulk operations
  const bulkOperation = async (operation) => {
    if (selectedUsers.length === 0) {
      toast.error('No users selected');
      return;
    }

    if (operation === 'delete' && !confirm(`Delete ${selectedUsers.length} users and all their data?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/admin/bulk-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          operation,
          userIds: selectedUsers
        })
      });

      if (!response.ok) {
        throw new Error('Bulk operation failed');
      }

      const data = await response.json();
      
      if (operation === 'delete') {
        toast.success(`Deleted ${data.deletedUsers} users and ${data.deletedDecks} decks`);
        setSelectedUsers([]);
        fetchUsers(page);
        fetchAnalytics();
      } else if (operation === 'export') {
        // Download user data as JSON
        const blob = new Blob([JSON.stringify(data.users, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        toast.success(`Exported ${data.count} users`);
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast.error('Bulk operation failed');
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  useEffect(() => {
    fetchAnalytics();
    fetchUsers();
  }, []);

  if (loading && !analytics) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading Admin Dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', color: '#333' }}>🛡️ Admin Dashboard</h1>

      {/* Analytics Cards */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#2196f3' }}>Total Users</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>{analytics.summary.totalUsers}</div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#4caf50' }}>New This Week</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>{analytics.summary.recentUsers}</div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff9800' }}>Total Decks</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>{analytics.summary.totalDecks}</div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#9c27b0' }}>Public Decks</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>{analytics.summary.publicDecks}</div>
          </div>
        </div>
      )}

      {/* Bulk Operations */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ fontWeight: '500' }}>
          {selectedUsers.length} users selected
        </span>
        {selectedUsers.length > 0 && (
          <>
            <button
              onClick={() => bulkOperation('export')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📤 Export Selected
            </button>
            <button
              onClick={() => bulkOperation('delete')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🗑️ Delete Selected
            </button>
          </>
        )}
      </div>

      {/* Users Table */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(users.map(u => u.id));
                    } else {
                      setSelectedUsers([]);
                    }
                  }}
                />
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Username</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Decks</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Joined</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                  />
                </td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{user.username}</td>
                <td style={{ padding: '1rem', color: '#666' }}>{user.email}</td>
                <td style={{ padding: '1rem' }}>{user.deckCount}</td>
                <td style={{ padding: '1rem', color: '#666' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => fetchUserDetails(user.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => deleteUser(user.id, user.username)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button
          onClick={() => fetchUsers(page - 1)}
          disabled={page <= 1}
          style={{
            padding: '8px 16px',
            margin: '0 4px',
            backgroundColor: page <= 1 ? '#ccc' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: page <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Previous
        </button>
        <span style={{ margin: '0 1rem' }}>Page {page} of {totalPages}</span>
        <button
          onClick={() => fetchUsers(page + 1)}
          disabled={page >= totalPages}
          style={{
            padding: '8px 16px',
            margin: '0 4px',
            backgroundColor: page >= totalPages ? '#ccc' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next
        </button>
      </div>

      {/* User Details Modal */}
      {showUserModal && userDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>User Details: {userDetails.user.username}</h2>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong>Email:</strong> {userDetails.user.email}<br />
              <strong>User ID:</strong> {userDetails.user.id}<br />
              <strong>Joined:</strong> {new Date(userDetails.user.createdAt).toLocaleString()}<br />
              <strong>Last Seen:</strong> {new Date(userDetails.user.lastSeen).toLocaleString()}
            </div>

            <h3>Decks ({userDetails.decks.length})</h3>
            {userDetails.decks.length > 0 ? (
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {userDetails.decks.map(deck => (
                  <div key={deck.id} style={{
                    padding: '0.5rem',
                    border: '1px solid #eee',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }}>
                    <strong>{deck.name}</strong> ({deck.format})<br />
                    <small style={{ color: '#666' }}>
                      Created: {new Date(deck.createdAt).toLocaleDateString()}
                      {deck.updatedAt && ` • Updated: ${new Date(deck.updatedAt).toLocaleDateString()}`}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666' }}>No decks created yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}