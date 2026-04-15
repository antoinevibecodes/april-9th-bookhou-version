import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function DiscountsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    code: '',
    type: 'percentage',
    value: '',
    validFrom: '',
    validTo: '',
    usageLimit: '',
    isActive: true,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await api.get('/coupons');
      const list = Array.isArray(data) ? data : (data.data || data.coupons || []);
      setCoupons(list);
    } catch (err) {
      if (err.status !== 404) {
        setError(err.message || 'Failed to load coupons');
      }
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code || '',
      type: coupon.type || coupon.discountType || 'percentage',
      value: coupon.value || coupon.discountValue || '',
      validFrom: coupon.validFrom || coupon.valid_from ? (coupon.validFrom || coupon.valid_from).slice(0, 10) : '',
      validTo: coupon.validTo || coupon.valid_to ? (coupon.validTo || coupon.valid_to).slice(0, 10) : '',
      usageLimit: coupon.usageLimit || coupon.usage_limit || '',
      isActive: coupon.isActive ?? coupon.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: Number(form.value),
        validFrom: form.validFrom || undefined,
        validTo: form.validTo || undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await api.patch(`/coupons/${editing.id}`, payload);
      } else {
        await api.post('/coupons', payload);
      }
      setShowModal(false);
      fetchCoupons();
    } catch (err) {
      setError(err.message || 'Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      fetchCoupons();
    } catch (err) {
      setError(err.message || 'Failed to delete coupon');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Discounts & Coupons</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Coupon</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Valid From</th>
                <th>Valid To</th>
                <th>Usage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan="8" className="text-center">No coupons yet</td></tr>
              ) : (
                coupons.map((coupon) => {
                  const active = coupon.isActive ?? coupon.is_active ?? true;
                  return (
                    <tr key={coupon.id}>
                      <td><code className="coupon-code">{coupon.code}</code></td>
                      <td>{coupon.type || coupon.discountType || '-'}</td>
                      <td>
                        {(coupon.type || coupon.discountType) === 'percentage'
                          ? `${coupon.value || coupon.discountValue}%`
                          : `$${Number(coupon.value || coupon.discountValue || 0).toFixed(2)}`}
                      </td>
                      <td>{coupon.validFrom || coupon.valid_from ? new Date(coupon.validFrom || coupon.valid_from).toLocaleDateString() : '-'}</td>
                      <td>{coupon.validTo || coupon.valid_to ? new Date(coupon.validTo || coupon.valid_to).toLocaleDateString() : '-'}</td>
                      <td>{coupon.usageCount || coupon.usage_count || 0} / {coupon.usageLimit || coupon.usage_limit || 'Unlimited'}</td>
                      <td>
                        <span className={`badge ${active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(coupon)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(coupon.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Coupon Code *</label>
                  <input
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    required
                    placeholder="e.g. SUMMER20"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Discount Type *</label>
                    <select name="type" value={form.type} onChange={handleChange}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Value *</label>
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.value}
                      onChange={handleChange}
                      required
                      placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 10.00'}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Valid From</label>
                    <input name="validFrom" type="date" value={form.validFrom} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Valid To</label>
                    <input name="validTo" type="date" value={form.validTo} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Usage Limit (leave blank for unlimited)</label>
                  <input name="usageLimit" type="number" min="0" value={form.usageLimit} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleChange}
                    />
                    Active
                  </label>
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
