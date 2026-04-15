import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const stats = data || {};
  const totalBookings = stats.totalBookings || stats.total_bookings || 0;
  const totalRevenue = stats.totalRevenue || stats.total_revenue || 0;
  const upcomingEvents = stats.upcomingEvents || stats.upcoming_events || 0;
  const todayBookings = stats.todayBookings || stats.today_bookings || 0;
  const recentBookings = stats.recentBookings || stats.recent_bookings || stats.recentParties || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Bookings</div>
          <div className="stat-value">{totalBookings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">${Number(totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming Events</div>
          <div className="stat-value">{upcomingEvents}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Bookings</div>
          <div className="stat-value">{todayBookings}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent Activity</h2>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/bookings')}>
            View All
          </button>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Host</th>
                <th>Date</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">No recent bookings</td>
                </tr>
              ) : (
                recentBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                  >
                    <td>{booking.childName || booking.child_name || booking.eventName || 'Event'}</td>
                    <td>{booking.parentFirstName || booking.parent_first_name || ''} {booking.parentLastName || booking.parent_last_name || ''}</td>
                    <td>{booking.partyDate || booking.party_date ? new Date(booking.partyDate || booking.party_date).toLocaleDateString() : '-'}</td>
                    <td><span className={`badge badge-${(booking.status || 'requested').toLowerCase()}`}>{booking.status || 'REQUESTED'}</span></td>
                    <td>${Number(booking.totalPrice || booking.total_price || 0).toFixed(2)}</td>
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
