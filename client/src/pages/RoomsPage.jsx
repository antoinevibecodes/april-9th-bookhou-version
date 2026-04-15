import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = { name: '', description: '', capacity: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await api.get('/rooms');
      const list = Array.isArray(data) ? data : (data.data || data.rooms || []);
      setRooms(list);
    } catch (err) {
      setError(err.message || 'Failed to load rooms');
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

  const openEdit = (room) => {
    setEditing(room);
    setForm({
      name: room.name || '',
      description: room.description || '',
      capacity: room.capacity || '',
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
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };
      if (editing) {
        await api.patch(`/rooms/${editing.id}`, payload);
      } else {
        await api.post('/rooms', payload);
      }
      setShowModal(false);
      fetchRooms();
    } catch (err) {
      setError(err.message || 'Failed to save room');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await api.delete(`/rooms/${id}`);
      fetchRooms();
    } catch (err) {
      setError(err.message || 'Failed to delete room');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Rooms</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Room</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="cards-grid">
        {rooms.length === 0 ? (
          <div className="card"><p className="text-center text-muted">No rooms yet</p></div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="card">
              <h3>{room.name}</h3>
              {room.description && <p className="text-muted">{room.description}</p>}
              {room.capacity && <p>Capacity: {room.capacity}</p>}
              <div className="card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(room)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(room.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Room' : 'Create Room'}</h2>
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
                <div className="form-group">
                  <label>Capacity</label>
                  <input name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange} />
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
