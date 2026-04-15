import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = '/api/v1';

export default function WaiverPage() {
  const { partyId } = useParams();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(`waiver_draft_${partyId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      firstName: '',
      lastName: '',
      dob: '',
      phone: '',
      email: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      children: [{ name: '', dob: '' }],
      marketingOptIn: false,
      accepted1: false,
      accepted2: false,
      accepted3: false,
    };
  });

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`waiver_draft_${partyId}`, JSON.stringify(form));
    }, 500);
    return () => clearTimeout(timer);
  }, [form, partyId]);

  // Phone auto-fetch for returning customers
  useEffect(() => {
    if (form.phone && form.phone.length >= 10) {
      const timer = setTimeout(() => {
        fetch(`${API_BASE}/customers/phone/${encodeURIComponent(form.phone)}`)
          .then((res) => { if (res.ok) return res.json(); throw new Error('Not found'); })
          .then((customer) => {
            if (customer && customer.firstName) {
              setForm((prev) => ({
                ...prev,
                firstName: prev.firstName || customer.firstName || '',
                lastName: prev.lastName || customer.lastName || '',
                email: prev.email || customer.email || '',
                address: prev.address || customer.address || '',
                dob: prev.dob || customer.dob || '',
                emergencyContactName: prev.emergencyContactName || customer.emergencyContact?.name || '',
                emergencyContactPhone: prev.emergencyContactPhone || customer.emergencyContact?.phone || '',
              }));
            }
          })
          .catch(() => {});
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [form.phone]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleChildChange = (index, field, value) => {
    setForm((prev) => {
      const children = [...prev.children];
      children[index] = { ...children[index], [field]: value };
      return { ...prev, children };
    });
  };

  const addChild = () => {
    setForm((prev) => ({
      ...prev,
      children: [...prev.children, { name: '', dob: '' }],
    }));
  };

  const removeChild = (index) => {
    if (form.children.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }));
  };

  // Canvas drawing with native event listeners for touch support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || step !== 3) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      if (e.touches) {
        return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
      }
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onStart = (e) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const onMove = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
    };

    const onEnd = (e) => {
      if (e) e.preventDefault();
      isDrawingRef.current = false;
    };

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, [step]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!hasSignature) {
      setError('Please provide your signature.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const canvas = canvasRef.current;
      const signature = canvas.toDataURL('image/png');

      const payload = {
        partyId: partyId ? Number(partyId) : undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        dob: form.dob || undefined,
        phone: form.phone,
        email: form.email,
        address: form.address || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        children: form.children.filter((c) => c.name),
        marketingOptIn: form.marketingOptIn,
        signature,
      };

      const response = await fetch(`${API_BASE}/waivers/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit waiver');
      }

      localStorage.removeItem(`waiver_draft_${partyId}`);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit waiver');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="public-page">
        <div className="public-card success-card">
          <div className="success-icon">&#10003;</div>
          <h2>Waiver Signed Successfully!</h2>
          <p>Thank you for signing the waiver. A confirmation has been sent to your email and phone.</p>
        </div>
      </div>
    );
  }

  const waiverText = `ASSUMPTION OF RISK AND WAIVER OF LIABILITY

I, the undersigned, hereby acknowledge that participation in activities at this facility involves inherent risks including, but not limited to, physical injury, property damage, and other hazards.

I voluntarily assume all risks associated with participation and hereby release, waive, and discharge this facility, its owners, operators, employees, agents, and affiliates from any and all liability, claims, demands, or causes of action arising out of or related to any loss, damage, or injury that may occur.

I understand that this waiver is binding upon myself, my heirs, executors, administrators, and assigns. I have read and fully understand the terms of this waiver and agree to be bound by them.

This waiver is valid for one (1) year from the date of signing.`;

  return (
    <div className="public-page">
      <div className="public-card">
        <div className="public-logo">bookhou</div>
        <h2>Liability Waiver</h2>

        <div className="stepper">
          <div className={`stepper-step ${step >= 1 ? 'active' : ''}`}><span>1</span> Your Info</div>
          <div className={`stepper-step ${step >= 2 ? 'active' : ''}`}><span>2</span> Waiver</div>
          <div className={`stepper-step ${step >= 3 ? 'active' : ''}`}><span>3</span> Signature</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <div className="waiver-step">
            <h3>Adult Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>First Name *</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Date of Birth *</label>
                <input name="dob" type="date" value={form.dob} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder="Enter phone to auto-fill if returning" />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input name="address" value={form.address} onChange={handleChange} />
              </div>
            </div>

            <h3 style={{ marginTop: '24px' }}>Emergency Contact</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Contact Name</label>
                <input name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input name="emergencyContactPhone" type="tel" value={form.emergencyContactPhone} onChange={handleChange} />
              </div>
            </div>

            <h3 style={{ marginTop: '24px' }}>Children</h3>
            {form.children.map((child, i) => (
              <div key={i} className="form-grid child-row">
                <div className="form-group">
                  <label>Child Name</label>
                  <input value={child.name} onChange={(e) => handleChildChange(i, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Child DOB</label>
                  <input type="date" value={child.dob} onChange={(e) => handleChildChange(i, 'dob', e.target.value)} />
                </div>
                {form.children.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeChild(i)} style={{ alignSelf: 'end' }}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addChild} style={{ marginTop: '8px' }}>
              + Add Child
            </button>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="checkbox-label">
                <input type="checkbox" name="marketingOptIn" checked={form.marketingOptIn} onChange={handleChange} />
                I would like to receive promotional offers and updates
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!form.firstName || !form.lastName || !form.phone || !form.email) {
                    setError('Please fill in all required fields.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="waiver-step">
            <h3>Liability Waiver</h3>
            <div className="waiver-text-container">
              <pre className="waiver-text">{waiverText}</pre>
            </div>

            <div className="waiver-checkboxes">
              <label className="checkbox-label">
                <input type="checkbox" name="accepted1" checked={form.accepted1} onChange={handleChange} />
                I have read and understand the waiver above
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="accepted2" checked={form.accepted2} onChange={handleChange} />
                I voluntarily assume all risks associated with participation
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="accepted3" checked={form.accepted3} onChange={handleChange} />
                I agree to release the facility from all liability
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!form.accepted1 || !form.accepted2 || !form.accepted3) {
                    setError('Please accept all three checkboxes to continue.');
                    return;
                  }
                  setError('');
                  setStep(3);
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="waiver-step">
            <h3>Signature</h3>
            <p>Please sign below using your finger or mouse.</p>

            <div className="signature-container">
              <canvas ref={canvasRef} className="signature-canvas" />
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={clearSignature} style={{ marginTop: '8px' }}>
              Clear Signature
            </button>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>Back</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Waiver'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
