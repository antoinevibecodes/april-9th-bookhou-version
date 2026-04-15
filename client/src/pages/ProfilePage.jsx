import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Profile</h1>
      </div>

      <div className="card">
        <h3>Account Information</h3>
        <div className="detail-rows">
          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span>{user?.email || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Name</span>
            <span>{user?.firstName || user?.first_name || ''} {user?.lastName || user?.last_name || ''}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Role</span>
            <span className="badge">{user?.role || 'User'}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Change Password</h3>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password *</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setSuccess(''); }}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password *</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setSuccess(''); }}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setSuccess(''); }}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
