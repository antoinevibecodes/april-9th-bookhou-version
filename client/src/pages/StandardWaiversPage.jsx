import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function StandardWaiversPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    name: '',
    content: '',
    isActive: true,
    requireSignature: true,
    expirationDays: 365,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.get('/waivers/templates');
      const list = Array.isArray(data) ? data : (data.data || data.templates || []);
      setTemplates(list);
    } catch (err) {
      if (err.status !== 404) {
        setError(err.message || 'Failed to load waiver templates');
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
      content: tpl.content || tpl.body || tpl.text || '',
      isActive: tpl.isActive ?? tpl.is_active ?? true,
      requireSignature: tpl.requireSignature ?? tpl.require_signature ?? true,
      expirationDays: tpl.expirationDays || tpl.expiration_days || 365,
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
        content: form.content,
        isActive: form.isActive,
        requireSignature: form.requireSignature,
        expirationDays: Number(form.expirationDays),
      };
      if (editing) {
        await api.patch(`/waivers/templates/${editing.id}`, payload);
      } else {
        await api.post('/waivers/templates', payload);
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
    if (!window.confirm('Are you sure you want to delete this waiver template?')) return;
    try {
      await api.delete(`/waivers/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Waiver Settings</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Template</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>How Waivers Work</h3>
        <div className="info-steps">
          <div className="info-step">
            <div className="step-number">1</div>
            <div>
              <strong>QR Code / Link</strong>
              <p>Customers scan a QR code or click a link to access the waiver form</p>
            </div>
          </div>
          <div className="info-step">
            <div className="step-number">2</div>
            <div>
              <strong>Fill Information</strong>
              <p>Customer enters their personal details and emergency contact</p>
            </div>
          </div>
          <div className="info-step">
            <div className="step-number">3</div>
            <div>
              <strong>Read & Accept</strong>
              <p>Customer reads the liability waiver and accepts the terms</p>
            </div>
          </div>
          <div className="info-step">
            <div className="step-number">4</div>
            <div>
              <strong>Sign</strong>
              <p>Customer provides a digital signature to complete the waiver</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Waiver Templates</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Signature Required</th>
                <th>Expires After</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr><td colSpan="5" className="text-center">No waiver templates yet</td></tr>
              ) : (
                templates.map((tpl) => {
                  const active = tpl.isActive ?? tpl.is_active ?? true;
                  return (
                    <tr key={tpl.id}>
                      <td>{tpl.name}</td>
                      <td>{(tpl.requireSignature ?? tpl.require_signature ?? true) ? 'Yes' : 'No'}</td>
                      <td>{tpl.expirationDays || tpl.expiration_days || 365} days</td>
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
              <h2>{editing ? 'Edit Waiver Template' : 'Create Waiver Template'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Template Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Waiver Content *</label>
                  <textarea
                    name="content"
                    value={form.content}
                    onChange={handleChange}
                    rows="12"
                    required
                    placeholder="Enter the full liability waiver text..."
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Expiration (days)</label>
                    <input
                      name="expirationDays"
                      type="number"
                      min="1"
                      value={form.expirationDays}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="requireSignature" checked={form.requireSignature} onChange={handleChange} />
                    Require Signature
                  </label>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
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
