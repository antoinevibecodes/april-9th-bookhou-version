import React, { useState, useEffect } from 'react';
import api from '../api/client';

const TRIGGER_TYPES = [
  'booking_confirmation',
  'booking_reminder',
  'booking_followup',
  'payment_received',
  'invitation_sent',
  'waiver_reminder',
  'custom',
];

export default function EmailAutomationPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    name: '',
    triggerType: 'booking_confirmation',
    subject: '',
    body: '',
    isActive: true,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.get('/email/templates');
      const list = Array.isArray(data) ? data : (data.data || data.templates || []);
      setTemplates(list);
    } catch (err) {
      if (err.status !== 404) {
        setError(err.message || 'Failed to load email templates');
      }
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setForm({
      name: tpl.name || '',
      triggerType: tpl.triggerType || tpl.trigger_type || 'custom',
      subject: tpl.subject || '',
      body: tpl.body || tpl.content || '',
      isActive: tpl.isActive ?? tpl.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        triggerType: form.triggerType,
        subject: form.subject,
        body: form.body,
        isActive: form.isActive,
      };
      if (editing) {
        await api.patch(`/email/templates/${editing.id}`, payload);
      } else {
        await api.post('/email/templates', payload);
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/email/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Email Automation</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Template</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Trigger</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr><td colSpan="5" className="text-center">No email templates yet</td></tr>
              ) : (
                templates.map((tpl) => {
                  const active = tpl.isActive ?? tpl.is_active ?? true;
                  return (
                    <tr key={tpl.id}>
                      <td>{tpl.name}</td>
                      <td>{(tpl.triggerType || tpl.trigger_type || '').replace(/_/g, ' ')}</td>
                      <td>{tpl.subject || '-'}</td>
                      <td>
                        <span className={`badge ${active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(tpl)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tpl.id)}>Delete</button>
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
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Template' : 'Create Template'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Template Name *</label>
                    <input name="name" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Trigger Type *</label>
                    <select name="triggerType" value={form.triggerType} onChange={handleChange}>
                      {TRIGGER_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <input name="subject" value={form.subject} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Body *</label>
                  <textarea
                    name="body"
                    value={form.body}
                    onChange={handleChange}
                    rows="10"
                    required
                    placeholder="Use {{parentFirstName}}, {{childName}}, {{partyDate}} as placeholders..."
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleChange}
                    />
                    Active
                  </label>
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
