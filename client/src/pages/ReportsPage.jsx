import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('payments');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);
      const query = params.toString() ? `?${params.toString()}` : '';

      let endpoint;
      switch (activeReport) {
        case 'payments': endpoint = `/reports/payments${query}`; break;
        case 'parties': endpoint = `/reports/parties${query}`; break;
        case 'taxes': endpoint = `/reports/taxes${query}`; break;
        default: endpoint = `/reports/payments${query}`;
      }

      const result = await api.get(endpoint);
      const list = Array.isArray(result) ? result : (result.data || result.payments || result.parties || result.taxes || []);
      setData(list);
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const exportCsv = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeReport}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const totalAmount = data.reduce((sum, d) => sum + Number(d.amount || d.totalPrice || d.total_price || d.revenue || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports</h1>
        <button className="btn btn-outline" onClick={exportCsv} disabled={data.length === 0}>
          Export CSV
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        <button className={`tab ${activeReport === 'payments' ? 'tab-active' : ''}`} onClick={() => setActiveReport('payments')}>
          Payments
        </button>
        <button className={`tab ${activeReport === 'parties' ? 'tab-active' : ''}`} onClick={() => setActiveReport('parties')}>
          Bookings
        </button>
        <button className={`tab ${activeReport === 'taxes' ? 'tab-active' : ''}`} onClick={() => setActiveReport('taxes')}>
          Taxes
        </button>
      </div>

      <div className="filters-row">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-date" />
        <button className="btn btn-primary" onClick={fetchReport}>Generate Report</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Records</div>
          <div className="stat-value">{data.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  {data.length > 0 &&
                    Object.keys(data[0]).map((key) => (
                      <th key={key}>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan="10" className="text-center">No data found</td></tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.id || i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j}>
                          {val === null || val === undefined
                            ? '-'
                            : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
