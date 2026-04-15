import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function EventWaiversPage() {
  const [signedWaivers, setSignedWaivers] = useState([]);
  const [unsignedWaivers, setUnsignedWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchWaivers();
  }, []);

  const fetchWaivers = async () => {
    setLoading(true);
    try {
      const [signedRes, unsignedRes] = await Promise.all([
        api.get('/waivers/signed').catch(() => []),
        api.get('/waivers/unsigned').catch(() => []),
      ]);
      const signed = Array.isArray(signedRes) ? signedRes : (signedRes.data || signedRes.waivers || []);
      const unsigned = Array.isArray(unsignedRes) ? unsignedRes : (unsignedRes.data || unsignedRes.waivers || []);
      setSignedWaivers(signed);
      setUnsignedWaivers(unsigned);
    } catch (err) {
      setError(err.message || 'Failed to load waivers');
    } finally {
      setLoading(false);
    }
  };

  const allWaivers = [
    ...signedWaivers.map((w) => ({ ...w, _status: 'signed' })),
    ...unsignedWaivers.map((w) => ({ ...w, _status: 'unsigned' })),
  ];

  const now = new Date();
  const totalSigned = signedWaivers.length;
  const totalPending = unsignedWaivers.length;
  const expiredCount = signedWaivers.filter((w) => {
    const exp = w.expiresAt || w.expires_at;
    return exp && new Date(exp) < now;
  }).length;
  const signedToday = signedWaivers.filter((w) => {
    const signed = w.signedAt || w.signed_at;
    if (!signed) return false;
    const d = new Date(signed);
    return d.toDateString() === now.toDateString();
  }).length;

  const filtered = allWaivers.filter((w) => {
    if (statusFilter === 'signed' && w._status !== 'signed') return false;
    if (statusFilter === 'unsigned' && w._status !== 'unsigned') return false;
    if (statusFilter === 'expired') {
      const exp = w.expiresAt || w.expires_at;
      if (!exp || new Date(exp) >= now) return false;
    }

    if (search) {
      const s = search.toLowerCase();
      const name = (w.signerName || w.signer_name || w.name || w.guestName || '').toLowerCase();
      const email = (w.email || w.signerEmail || '').toLowerCase();
      if (!name.includes(s) && !email.includes(s)) return false;
    }

    return true;
  });

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Waiver Dashboard</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card stat-clickable" onClick={() => setStatusFilter('all')}>
          <div className="stat-label">Total Waivers</div>
          <div className="stat-value">{allWaivers.length}</div>
        </div>
        <div className="stat-card stat-clickable" onClick={() => setStatusFilter('signed')}>
          <div className="stat-label">Total Signed</div>
          <div className="stat-value">{totalSigned}</div>
        </div>
        <div className="stat-card stat-clickable" onClick={() => setStatusFilter('unsigned')}>
          <div className="stat-label">Pending</div>
          <div className="stat-value">{totalPending}</div>
        </div>
        <div className="stat-card stat-clickable" onClick={() => setStatusFilter('expired')}>
          <div className="stat-label">Expired</div>
          <div className="stat-value">{expiredCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Signed Today</div>
          <div className="stat-value">{signedToday}</div>
        </div>
      </div>

      <div className="filters-row">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-search"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="signed">Signed</option>
          <option value="unsigned">Unsigned</option>
          <option value="expired">Expired</option>
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
                <th>Event</th>
                <th>Status</th>
                <th>Signed Date</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center">No waivers found</td></tr>
              ) : (
                filtered.map((w, i) => {
                  const exp = w.expiresAt || w.expires_at;
                  const isExpired = exp && new Date(exp) < now;
                  let badgeClass = w._status === 'signed' ? (isExpired ? 'badge-cancelled' : 'badge-confirmed') : 'badge-requested';
                  let badgeText = w._status === 'signed' ? (isExpired ? 'Expired' : 'Signed') : 'Unsigned';

                  return (
                    <tr key={w.id || i}>
                      <td>{w.signerName || w.signer_name || w.name || w.guestName || '-'}</td>
                      <td>{w.email || w.signerEmail || '-'}</td>
                      <td>{w.phone || w.signerPhone || '-'}</td>
                      <td>{w.partyId || w.party_id || w.eventName || '-'}</td>
                      <td><span className={`badge ${badgeClass}`}>{badgeText}</span></td>
                      <td>{w.signedAt || w.signed_at ? new Date(w.signedAt || w.signed_at).toLocaleDateString() : '-'}</td>
                      <td>{exp ? new Date(exp).toLocaleDateString() : '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
