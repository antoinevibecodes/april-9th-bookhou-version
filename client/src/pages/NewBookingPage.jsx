import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function NewBookingPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
    childName: '',
    childDob: '',
    packageId: '',
    roomId: '',
    partyDate: '',
    startTime: '',
    endTime: '',
    guestCount: '',
    selectedAddons: [],
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/packages').catch(() => []),
      api.get('/rooms').catch(() => []),
      api.get('/addons').catch(() => []),
    ]).then(([pkgs, rms, ads]) => {
      setPackages(Array.isArray(pkgs) ? pkgs : (pkgs.data || pkgs.packages || []));
      setRooms(Array.isArray(rms) ? rms : (rms.data || rms.rooms || []));
      setAddons(Array.isArray(ads) ? ads : (ads.data || ads.addons || []));
      setLoading(false);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAddon = (addonId) => {
    setForm((prev) => ({
      ...prev,
      selectedAddons: prev.selectedAddons.includes(addonId)
        ? prev.selectedAddons.filter((id) => id !== addonId)
        : [...prev.selectedAddons, addonId],
    }));
  };

  const selectedPkg = packages.find((p) => String(p.id) === String(form.packageId));
  const packagePrice = selectedPkg ? Number(selectedPkg.price || 0) : 0;
  const addonsTotal = form.selectedAddons.reduce((sum, id) => {
    const addon = addons.find((a) => String(a.id) === String(id));
    return sum + (addon ? Number(addon.price || 0) : 0);
  }, 0);
  const totalPrice = packagePrice + addonsTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        parentFirstName: form.parentFirstName,
        parentLastName: form.parentLastName,
        parentEmail: form.parentEmail,
        parentPhone: form.parentPhone,
        childName: form.childName,
        childDob: form.childDob || undefined,
        packageId: form.packageId ? Number(form.packageId) : undefined,
        roomId: form.roomId ? Number(form.roomId) : undefined,
        partyDate: form.partyDate,
        startTime: form.startTime,
        endTime: form.endTime,
        guestCount: form.guestCount ? Number(form.guestCount) : undefined,
        addonIds: form.selectedAddons.map(Number),
        notes: form.notes || undefined,
        totalPrice,
      };
      const result = await api.post('/parties', payload);
      navigate(`/bookings/${result.id || result.data?.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Create Event</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-layout">
        <div className="card">
          <h3>Host Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>First Name *</label>
              <input name="parentFirstName" value={form.parentFirstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input name="parentLastName" value={form.parentLastName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input name="parentEmail" type="email" value={form.parentEmail} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input name="parentPhone" type="tel" value={form.parentPhone} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Child Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Child's Name *</label>
              <input name="childName" value={form.childName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input name="childDob" type="date" value={form.childDob} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Event Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Package *</label>
              <select name="packageId" value={form.packageId} onChange={handleChange} required>
                <option value="">Select a package</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} - ${Number(pkg.price || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Room</label>
              <select name="roomId" value={form.roomId} onChange={handleChange}>
                <option value="">Select a room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} {room.capacity ? `(Capacity: ${room.capacity})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Party Date *</label>
              <input name="partyDate" type="date" value={form.partyDate} onChange={handleChange} required />
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
              <label>Guest Count</label>
              <input name="guestCount" type="number" min="1" value={form.guestCount} onChange={handleChange} />
            </div>
          </div>
        </div>

        {addons.length > 0 && (
          <div className="card">
            <h3>Add-Ons</h3>
            <div className="addons-grid">
              {addons.map((addon) => (
                <label key={addon.id} className={`addon-card ${form.selectedAddons.includes(addon.id) ? 'addon-selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.selectedAddons.includes(addon.id)}
                    onChange={() => toggleAddon(addon.id)}
                  />
                  <div className="addon-info">
                    <div className="addon-name">{addon.name}</div>
                    <div className="addon-price">${Number(addon.price || 0).toFixed(2)}</div>
                    {addon.description && <div className="addon-desc">{addon.description}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h3>Notes</h3>
          <div className="form-group">
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any special requests or notes..."
            />
          </div>
        </div>

        <div className="card price-summary">
          <h3>Price Summary</h3>
          <div className="price-row">
            <span>Package: {selectedPkg ? selectedPkg.name : 'None selected'}</span>
            <span>${packagePrice.toFixed(2)}</span>
          </div>
          {form.selectedAddons.map((id) => {
            const addon = addons.find((a) => String(a.id) === String(id));
            return addon ? (
              <div key={id} className="price-row">
                <span>Add-on: {addon.name}</span>
                <span>${Number(addon.price || 0).toFixed(2)}</span>
              </div>
            ) : null;
          })}
          <div className="price-row price-total">
            <span>Total</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/bookings')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
