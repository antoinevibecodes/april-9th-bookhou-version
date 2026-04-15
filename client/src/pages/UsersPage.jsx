import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

  const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'employee',
    password: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/team-members');
      const list = Array.isArray(data) ? data : (data.data || data.teamMembers || data.users || []);
      setUsers(list);
    } catch (err) {
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      firstName: user.firstName || user.first_name || '',
      lastName: user.lastName || user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'employee',
      password: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
      };
      if (form.password) {
        payload.password = form.password;
      }

      if (editing) {
        await api.patch(`/team-members/${editing.id}`, payload);
      } else {
        payload.password = form.password || 'temppass123';
        await api.post('/team-members', payload);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to save team member');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.patch(`/team-members/${user.id}`, {
        isActive: !(user.isActive ?? user.is_active ?? true),
      });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter && (u.role || '').toLowerCase() !== roleFilter.toLowerCase()) return false;
    return true;
  });

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Team Members</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Member</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-row">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center">No team members found</td></tr>
              ) : (
                filtered.map((user) => {
                  const isActive = user.isActive ?? user.is_active ?? true;
                  return (
                    <tr key={user.id}>
                      <td>{user.firstName || user.first_name || ''} {user.lastName || user.last_name || ''}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.phone || '-'}</td>
                      <td><span className="badge">{user.role || 'employee'}</span></td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(user)}>Edit</button>
                          <button
                            className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => toggleActive(user)}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Team Member' : 'Add Team Member'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input name="firstName" value={form.firstName} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input name="lastName" value={form.lastName} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select name="role" value={form.role} onChange={handleChange}>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{editing ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!editing}
                    placeholder={editing ? 'Leave blank to keep current' : 'Enter password'}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
