import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function SettingsPage() {
  const [form, setForm] = useState({
    businessName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    facebook: '',
    instagram: '',
    twitter: '',
    timezone: '',
    taxRate: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/settings');
      const settings = data.settings || data.data || data;
      setForm({
        businessName: settings.businessName || settings.business_name || '',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        zipCode: settings.zipCode || settings.zip_code || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        facebook: settings.facebook || settings.socialLinks?.facebook || '',
        instagram: settings.instagram || settings.socialLinks?.instagram || '',
        twitter: settings.twitter || settings.socialLinks?.twitter || '',
        timezone: settings.timezone || '',
        taxRate: settings.taxRate || settings.tax_rate || '',
      });
    } catch (err) {
      if (err.status !== 404) {
        setError(err.message || 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.patch('/settings', {
        businessName: form.businessName,
        address: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        phone: form.phone,
        email: form.email,
        website: form.website,
        facebook: form.facebook,
        instagram: form.instagram,
        twitter: form.twitter,
        timezone: form.timezone,
        taxRate: form.taxRate ? Number(form.taxRate) : undefined,
      });
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3>Business Information</h3>
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label>Business Name</label>
              <input name="businessName" value={form.businessName} onChange={handleChange} />
            </div>
            <div className="form-group form-group-full">
              <label>Address</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>City</label>
              <input name="city" value={form.city} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>State/Province</label>
              <input name="state" value={form.state} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Zip/Postal Code</label>
              <input name="zipCode" value={form.zipCode} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Website</label>
              <input name="website" value={form.website} onChange={handleChange} placeholder="https://" />
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Social Links</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Facebook</label>
              <input name="facebook" value={form.facebook} onChange={handleChange} placeholder="https://facebook.com/..." />
            </div>
            <div className="form-group">
              <label>Instagram</label>
              <input name="instagram" value={form.instagram} onChange={handleChange} placeholder="https://instagram.com/..." />
            </div>
            <div className="form-group">
              <label>Twitter</label>
              <input name="twitter" value={form.twitter} onChange={handleChange} placeholder="https://twitter.com/..." />
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Other Settings</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Timezone</label>
              <select name="timezone" value={form.timezone} onChange={handleChange}>
                <option value="">Select timezone</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Toronto">Eastern (Canada)</option>
                <option value="America/Vancouver">Pacific (Canada)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tax Rate (%)</label>
              <input name="taxRate" type="number" step="0.01" min="0" max="100" value={form.taxRate} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
