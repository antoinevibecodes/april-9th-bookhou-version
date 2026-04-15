import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function AddOnsPage() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = { name: '', price: '', description: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    setLoading(true);
    try {
      const data = await api.get('/addons');
      const list = Array.isArray(data) ? data : (data.data || data.addons || []);
      setAddons(list);
    } catch (err) {
      setError(err.message || 'Failed to load add-ons');
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

  const openEdit = (addon) => {
    setEditing(addon);
    setForm({
      name: addon.name || '',
      price: addon.price || '',
      description: addon.description || '',
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
        price: Number(form.price),
        description: form.description || undefined,
      };
      if (editing) {
        await api.patch(`/addons/${editing.id}`, payload);
      } else {
        await api.post('/addons', payload);
      }
      setShowModal(false);
      fetchAddons();
    } catch (err) {
      setError(err.message || 'Failed to save add-on');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this add-on?')) return;
    try {
      await api.delete(`/addons/${id}`);
      fetchAddons();
    } catch (err) {
      setError(err.message || 'Failed to delete add-on');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Add-Ons</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Add-On</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {addons.length === 0 ? (
                <tr><td colSpan="4" className="text-center">No add-ons yet</td></tr>
              ) : (
                addons.map((addon) => (
                  <tr key={addon.id}>
                    <td>{addon.name}</td>
                    <td>${Number(addon.price || 0).toFixed(2)}</td>
                    <td>{addon.description || '-'}</td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(addon)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(addon.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Add-On' : 'Create Add-On'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Price *</label>
                  <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows="3" />
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
