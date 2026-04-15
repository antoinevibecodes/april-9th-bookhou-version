import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let data;
      try {
        data = await api.get('/customers');
      } catch {
        data = await api.get('/waivers/signed');
      }
      const list = Array.isArray(data) ? data : (data.data || data.customers || data.waivers || []);
      setCustomers(list);
    } catch (err) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = `${c.firstName || c.first_name || c.signerName || c.signer_name || ''} ${c.lastName || c.last_name || ''}`.toLowerCase();
    const email = (c.email || c.signerEmail || '').toLowerCase();
    const phone = (c.phone || c.signerPhone || '').toLowerCase();
    return name.includes(s) || email.includes(s) || phone.includes(s);
  });

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Marketing Opt-in', 'Created'];
    const rows = filtered.map((c) => [
      `${c.firstName || c.first_name || c.signerName || c.signer_name || ''} ${c.lastName || c.last_name || ''}`.trim(),
      c.email || c.signerEmail || '',
      c.phone || c.signerPhone || '',
      c.marketingOptIn || c.marketing_opt_in ? 'Yes' : 'No',
      c.createdAt || c.created_at || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Customer List</h1>
        <button className="btn btn-outline" onClick={exportCsv} disabled={filtered.length === 0}>
          Export CSV
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-row">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-search"
        />
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Marketing</th>
                <th>Waivers</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center">No customers found</td></tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.id || i}>
                    <td>
                      {`${c.firstName || c.first_name || c.signerName || c.signer_name || ''} ${c.lastName || c.last_name || ''}`.trim() || '-'}
                    </td>
                    <td>{c.email || c.signerEmail || '-'}</td>
                    <td>{c.phone || c.signerPhone || '-'}</td>
                    <td>
                      <span className={`badge ${(c.marketingOptIn || c.marketing_opt_in) ? 'badge-confirmed' : 'badge-completed'}`}>
                        {(c.marketingOptIn || c.marketing_opt_in) ? 'Opted In' : 'Opted Out'}
                      </span>
                    </td>
                    <td>{c.waiverCount || c.waiver_count || (c.signedAt ? 1 : 0)}</td>
                    <td>{c.createdAt || c.created_at ? new Date(c.createdAt || c.created_at).toLocaleDateString() : '-'}</td>
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
