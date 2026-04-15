import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function BlockTimePage() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
    roomId: '',
  });

  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetchBlocks();
    api.get('/rooms').then((data) => {
      setRooms(Array.isArray(data) ? data : (data.data || data.rooms || []));
    }).catch(() => {});
  }, []);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const data = await api.get('/block-times');
      const list = Array.isArray(data) ? data : (data.data || data.blockTimes || []);
      setBlocks(list);
    } catch (err) {
      if (err.status !== 404) {
        setError(err.message || 'Failed to load block times');
      }
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/block-times', {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        reason: form.reason || undefined,
        roomId: form.roomId ? Number(form.roomId) : undefined,
      });
      setForm({ date: '', startTime: '', endTime: '', reason: '', roomId: '' });
      fetchBlocks();
    } catch (err) {
      setError(err.message || 'Failed to create block time');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (blockId) => {
    if (!window.confirm('Are you sure you want to delete this block time?')) return;
    try {
      await api.delete(`/block-times/${blockId}`);
      fetchBlocks();
    } catch (err) {
      setError(err.message || 'Failed to delete block time');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Block Time</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Create Block Time</h3>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Date *</label>
            <input name="date" type="date" value={form.date} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Start Time *</label>
            <input name="startTime" type="time" value={form.startTime} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>End Time *</label>
            <input name="endTime" type="time" value={form.endTime} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Room (optional)</label>
            <select name="roomId" value={form.roomId} onChange={handleChange}>
              <option value="">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group form-group-full">
            <label>Reason</label>
            <input name="reason" value={form.reason} onChange={handleChange} placeholder="e.g. Maintenance, Private event..." />
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Block Time'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Existing Block Times</h3>
        {loading ? (
          <div className="page-loading">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Room</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blocks.length === 0 ? (
                  <tr><td colSpan="6" className="text-center">No block times set</td></tr>
                ) : (
                  blocks.map((b) => (
                    <tr key={b.id}>
                      <td>{b.date ? new Date(b.date).toLocaleDateString() : '-'}</td>
                      <td>{b.startTime || b.start_time || '-'}</td>
                      <td>{b.endTime || b.end_time || '-'}</td>
                      <td>{b.room?.name || b.roomName || 'All'}</td>
                      <td>{b.reason || '-'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
