import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const STATUS_TABS = ['All', 'Active', 'Requested', 'Completed', 'Cancelled'];

export default function BookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/parties');
      const list = Array.isArray(data) ? data : (data.data || data.parties || []);
      setBookings(list);
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusForTab = (tab) => {
    switch (tab) {
      case 'Active': return 'CONFIRMED';
      case 'Requested': return 'REQUESTED';
      case 'Completed': return 'COMPLETED';
      case 'Cancelled': return 'CANCELLED';
      default: return null;
    }
  };

  const filtered = bookings.filter((b) => {
    const statusFilter = getStatusForTab(activeTab);
    if (statusFilter && (b.status || '').toUpperCase() !== statusFilter) return false;

    if (search) {
      const s = search.toLowerCase();
      const name = `${b.parentFirstName || b.parent_first_name || ''} ${b.parentLastName || b.parent_last_name || ''} ${b.childName || b.child_name || ''}`.toLowerCase();
      const email = (b.parentEmail || b.parent_email || '').toLowerCase();
      if (!name.includes(s) && !email.includes(s)) return false;
    }

    const partyDate = b.partyDate || b.party_date;
    if (dateFrom && partyDate && partyDate < dateFrom) return false;
    if (dateTo && partyDate && partyDate > dateTo) return false;

    return true;
  });

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Event List</h1>
        <button className="btn btn-primary" onClick={() => navigate('/bookings/new')}>
          + Create Event
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="filters-row">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-search"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="input-date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="input-date"
        />
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Host</th>
                <th>Date</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">No bookings found</td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/bookings/${b.id}`)}
                  >
                    <td>{b.childName || b.child_name || 'Event'}</td>
                    <td>{b.parentFirstName || b.parent_first_name || ''} {b.parentLastName || b.parent_last_name || ''}</td>
                    <td>{(b.partyDate || b.party_date) ? new Date(b.partyDate || b.party_date).toLocaleDateString() : '-'}</td>
                    <td>{b.guestCount || b.guest_count || b.numberOfGuests || '-'}</td>
                    <td><span className={`badge badge-${(b.status || 'requested').toLowerCase()}`}>{b.status || 'REQUESTED'}</span></td>
                    <td>${Number(b.totalPrice || b.total_price || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
