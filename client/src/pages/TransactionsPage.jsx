import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentType, setPaymentType] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get(`/reports/payments${query}`);
      const list = Array.isArray(data) ? data : (data.data || data.payments || data.transactions || []);
      setTransactions(list);
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filtered = transactions.filter((t) => {
    if (paymentType) {
      const method = (t.method || t.paymentMethod || t.payment_method || '').toLowerCase();
      if (method !== paymentType.toLowerCase()) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-row">
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
        <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
          <option value="">All Payment Types</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="check">Check</option>
          <option value="stripe">Stripe</option>
        </select>
        <button className="btn btn-primary" onClick={fetchTransactions}>Apply Filters</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{filtered.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Booking</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center">No transactions found</td></tr>
              ) : (
                filtered.map((t, i) => (
                  <tr key={t.id || i}>
                    <td>{t.createdAt || t.created_at || t.date ? new Date(t.createdAt || t.created_at || t.date).toLocaleDateString() : '-'}</td>
                    <td>{t.partyId || t.party_id || t.bookingId || '-'}</td>
                    <td>{t.customerName || t.customer_name || t.parentName || '-'}</td>
                    <td>{t.method || t.paymentMethod || t.payment_method || '-'}</td>
                    <td>${Number(t.amount || 0).toFixed(2)}</td>
                    <td><span className={`badge badge-${(t.status || 'completed').toLowerCase()}`}>{t.status || 'Completed'}</span></td>
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
