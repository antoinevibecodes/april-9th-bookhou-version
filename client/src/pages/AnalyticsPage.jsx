import React, { useState, useEffect } from 'react';
import api from '../api/client';

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'This Week', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'This Year', days: 365 },
];

function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  if (days === 0) {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - days);
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePreset, setActivePreset] = useState('Last 30 Days');
  const [compareMode, setCompareMode] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchData = async (preset) => {
    setLoading(true);
    setError('');
    try {
      const presetConfig = PRESETS.find((p) => p.label === preset);
      const { startDate, endDate } = presetConfig ? getDateRange(presetConfig.days) : { startDate: customFrom, endDate: customTo };
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const query = params.toString() ? `?${params.toString()}` : '';

      const result = await api.get(`/dashboard${query}`);
      setData(result);

      if (compareMode && presetConfig) {
        const compareStart = new Date(startDate);
        const compareEnd = new Date(endDate);
        const diff = compareEnd - compareStart;
        compareStart.setTime(compareStart.getTime() - diff - 86400000);
        compareEnd.setTime(compareEnd.getTime() - diff - 86400000);

        const cParams = new URLSearchParams();
        cParams.append('startDate', compareStart.toISOString().slice(0, 10));
        cParams.append('endDate', compareEnd.toISOString().slice(0, 10));

        const cResult = await api.get(`/dashboard?${cParams.toString()}`);
        setCompareData(cResult);
      } else {
        setCompareData(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activePreset);
  }, [activePreset, compareMode]);

  const calcChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const renderStat = (label, key) => {
    const current = data ? Number(data[key] || 0) : 0;
    const previous = compareData ? Number(compareData[key] || 0) : null;
    const change = previous !== null ? calcChange(current, previous) : null;
    const isCurrency = key.toLowerCase().includes('revenue') || key.toLowerCase().includes('price');

    return (
      <div className="stat-card" key={key}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">
          {isCurrency ? `$${current.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : current}
        </div>
        {change !== null && (
          <div className={`stat-change ${Number(change) >= 0 ? 'positive' : 'negative'}`}>
            {Number(change) >= 0 ? '+' : ''}{change}% vs previous period
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Analytics</h1>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => setCompareMode(e.target.checked)}
          />
          Compare to previous period
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="presets-row">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={`btn ${activePreset === p.label ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActivePreset(p.label)}
          >
            {p.label}
          </button>
        ))}
        <div className="custom-range">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          <button className="btn btn-outline btn-sm" onClick={() => { setActivePreset('custom'); fetchData('custom'); }}>
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : data ? (
        <>
          <div className="stats-grid">
            {renderStat('Total Bookings', 'totalBookings')}
            {renderStat('Total Revenue', 'totalRevenue')}
            {renderStat('Upcoming Events', 'upcomingEvents')}
            {renderStat("Today's Bookings", 'todayBookings')}
          </div>

          <div className="analytics-cards">
            <div className="card">
              <h3>Booking Status Breakdown</h3>
              <div className="status-bars">
                {(data.statusBreakdown || data.bookingsByStatus || []).map((item, i) => (
                  <div key={i} className="status-bar-item">
                    <div className="status-bar-label">
                      <span>{item.status || item.name || 'Unknown'}</span>
                      <span>{item.count || item.value || 0}</span>
                    </div>
                    <div className="status-bar-track">
                      <div
                        className={`status-bar-fill badge-${(item.status || 'requested').toLowerCase()}`}
                        style={{ width: `${Math.min(((item.count || item.value || 0) / Math.max(data.totalBookings || 1, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!(data.statusBreakdown || data.bookingsByStatus || []).length && (
                  <p className="text-muted">No status breakdown available</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Top Packages</h3>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Bookings</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topPackages || data.popularPackages || []).map((pkg, i) => (
                      <tr key={i}>
                        <td>{pkg.name || pkg.packageName || '-'}</td>
                        <td>{pkg.count || pkg.bookings || 0}</td>
                        <td>${Number(pkg.revenue || pkg.totalRevenue || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {!(data.topPackages || data.popularPackages || []).length && (
                      <tr><td colSpan="3" className="text-center">No package data available</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
