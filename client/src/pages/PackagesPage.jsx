import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    name: '',
    description: '',
    price: '',
    duration: '',
    guestCount: '',
    eventType: '',
    roomIds: [],
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchPackages();
    api.get('/rooms').then((data) => {
      setRooms(Array.isArray(data) ? data : (data.data || data.rooms || []));
    }).catch(() => {});
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await api.get('/packages');
      const list = Array.isArray(data) ? data : (data.data || data.packages || []);
      setPackages(list);
    } catch (err) {
      setError(err.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoomToggle = (roomId) => {
    setForm((prev) => ({
      ...prev,
      roomIds: prev.roomIds.includes(roomId)
        ? prev.roomIds.filter((id) => id !== roomId)
        : [...prev.roomIds, roomId],
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (pkg) => {
    setEditing(pkg);
    setForm({
      name: pkg.name || '',
      description: pkg.description || '',
      price: pkg.price || '',
      duration: pkg.duration || '',
      guestCount: pkg.guestCount || pkg.guest_count || '',
      eventType: pkg.eventType || pkg.event_type || '',
      roomIds: (pkg.rooms || []).map((r) => r.id || r),
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
        description: form.description || undefined,
        price: Number(form.price),
        duration: form.duration ? Number(form.duration) : undefined,
        guestCount: form.guestCount ? Number(form.guestCount) : undefined,
        eventType: form.eventType || undefined,
        roomIds: form.roomIds.length > 0 ? form.roomIds : undefined,
      };

      if (editing) {
        await api.patch(`/packages/${editing.id}`, payload);
      } else {
        await api.post('/packages', payload);
      }
      setShowModal(false);
      fetchPackages();
    } catch (err) {
      setError(err.message || 'Failed to save package');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      await api.delete(`/packages/${id}`);
      fetchPackages();
    } catch (err) {
      setError(err.message || 'Failed to delete package');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Packages</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Package</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="cards-grid">
        {packages.length === 0 ? (
          <div className="card"><p className="text-center text-muted">No packages yet. Create your first one.</p></div>
        ) : (
          packages.map((pkg) => (
            <div key={pkg.id} className="card package-card">
              <div className="package-header">
                <h3>{pkg.name}</h3>
                <div className="package-price">${Number(pkg.price || 0).toFixed(2)}</div>
              </div>
              {pkg.description && <p className="package-desc">{pkg.description}</p>}
              <div className="package-details">
                {pkg.duration && <span>Duration: {pkg.duration} min</span>}
                {(pkg.guestCount || pkg.guest_count) && <span>Guests: {pkg.guestCount || pkg.guest_count}</span>}
                {(pkg.eventType || pkg.event_type) && <span>Type: {pkg.eventType || pkg.event_type}</span>}
              </div>
              {pkg.rooms && pkg.rooms.length > 0 && (
                <div className="package-rooms">
                  Rooms: {pkg.rooms.map((r) => r.name || r).join(', ')}
                </div>
              )}
              <div className="card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(pkg)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(pkg.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Package' : 'Create Package'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows="3" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Price *</label>
                    <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input name="duration" type="number" min="0" value={form.duration} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Guest Count</label>
                    <input name="guestCount" type="number" min="0" value={form.guestCount} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Event Type</label>
                    <input name="eventType" value={form.eventType} onChange={handleChange} placeholder="e.g. Birthday, Corporate" />
                  </div>
                </div>
                {rooms.length > 0 && (
                  <div className="form-group">
                    <label>Available Rooms</label>
                    <div className="checkbox-group">
                      {rooms.map((room) => (
                        <label key={room.id} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={form.roomIds.includes(room.id)}
                            onChange={() => handleRoomToggle(room.id)}
                          />
                          {room.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
