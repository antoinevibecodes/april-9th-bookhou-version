import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

const TABS = ['Overview', 'Guests', 'Waivers', 'Payments', 'Notes', 'Email'];

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Note form state
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const bookingData = await api.get(`/parties/${id}`);
      setBooking(bookingData);

      const [invData, waivData, emailData] = await Promise.all([
        api.get(`/invitations/party/${id}`).catch(() => []),
        api.get(`/waivers/party/${id}`).catch(() => []),
        api.get(`/email/history/${id}`).catch(() => []),
      ]);

      setInvitations(Array.isArray(invData) ? invData : (invData.data || invData.invitations || []));
      setWaivers(Array.isArray(waivData) ? waivData : (waivData.data || waivData.waivers || []));
      setEmailHistory(Array.isArray(emailData) ? emailData : (emailData.data || emailData.emails || []));
      setPayments(bookingData.payments || bookingData.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post(`/invitations`, {
        partyId: Number(id),
        guestName: inviteName,
        guestEmail: inviteEmail || undefined,
        guestPhone: invitePhone || undefined,
      });
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      const invData = await api.get(`/invitations/party/${id}`);
      setInvitations(Array.isArray(invData) ? invData : (invData.data || invData.invitations || []));
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessingPayment(true);
    try {
      await api.post(`/payments/record`, {
        partyId: Number(id),
        amount: Number(paymentAmount),
        method: paymentMethod,
        note: paymentNote || undefined,
      });
      setPaymentAmount('');
      setPaymentNote('');
      const bookingData = await api.get(`/parties/${id}`);
      setBooking(bookingData);
      setPayments(bookingData.payments || bookingData.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    setAddingNote(true);
    try {
      await api.post(`/parties/${id}/notes`, { content: noteText });
      setNoteText('');
      const bookingData = await api.get(`/parties/${id}`);
      setBooking(bookingData);
    } catch (err) {
      setError(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/parties/${id}`, { status: newStatus });
      setBooking((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleSendEmail = async (type) => {
    try {
      await api.post(`/email/send`, { partyId: Number(id), type });
      const emailData = await api.get(`/email/history/${id}`);
      setEmailHistory(Array.isArray(emailData) ? emailData : (emailData.data || emailData.emails || []));
    } catch (err) {
      setError(err.message || 'Failed to send email');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!booking) return <div className="alert alert-error">{error || 'Booking not found'}</div>;

  const b = booking;
  const notes = b.notes || b.partyNotes || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/bookings')}>
            &larr; Back to Events
          </button>
          <h1 style={{ marginTop: '8px' }}>
            {b.childName || b.child_name || 'Event'}'s Party
            <span className={`badge badge-${(b.status || 'requested').toLowerCase()}`} style={{ marginLeft: '12px', fontSize: '14px' }}>
              {b.status || 'REQUESTED'}
            </span>
          </h1>
        </div>
        <div className="header-actions">
          <select
            value={b.status || 'REQUESTED'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="status-select"
          >
            <option value="REQUESTED">Requested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="detail-grid">
          <div className="card">
            <h3>Event Information</h3>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Date</span><span>{b.partyDate || b.party_date ? new Date(b.partyDate || b.party_date).toLocaleDateString() : '-'}</span></div>
              <div className="detail-row"><span className="detail-label">Time</span><span>{b.startTime || b.start_time || '-'} - {b.endTime || b.end_time || '-'}</span></div>
              <div className="detail-row"><span className="detail-label">Guests</span><span>{b.guestCount || b.guest_count || b.numberOfGuests || '-'}</span></div>
              <div className="detail-row"><span className="detail-label">Room</span><span>{b.room?.name || b.roomName || '-'}</span></div>
              <div className="detail-row"><span className="detail-label">Package</span><span>{b.package?.name || b.packageName || '-'}</span></div>
            </div>
          </div>
          <div className="card">
            <h3>Host Information</h3>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Name</span><span>{b.parentFirstName || b.parent_first_name || ''} {b.parentLastName || b.parent_last_name || ''}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span>{b.parentEmail || b.parent_email || '-'}</span></div>
              <div className="detail-row"><span className="detail-label">Phone</span><span>{b.parentPhone || b.parent_phone || '-'}</span></div>
            </div>
          </div>
          <div className="card">
            <h3>Pricing</h3>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Package Price</span><span>${Number(b.package?.price || b.packagePrice || 0).toFixed(2)}</span></div>
              {(b.addons || b.partyAddons || []).map((addon, i) => (
                <div key={i} className="detail-row">
                  <span className="detail-label">{addon.name || addon.addon?.name || 'Add-on'}</span>
                  <span>${Number(addon.price || addon.addon?.price || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="detail-row detail-row-total">
                <span className="detail-label">Total</span>
                <span>${Number(b.totalPrice || b.total_price || 0).toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount Paid</span>
                <span>${Number(b.amountPaid || b.amount_paid || 0).toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Balance</span>
                <span>${(Number(b.totalPrice || b.total_price || 0) - Number(b.amountPaid || b.amount_paid || 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Guests' && (
        <div>
          <div className="card">
            <h3>Send Invitation</h3>
            <form onSubmit={handleInvite} className="form-inline">
              <input
                placeholder="Guest name *"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
              <input
                placeholder="Email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <input
                placeholder="Phone"
                type="tel"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={inviting}>
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Guest List ({invitations.length})</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>RSVP Status</th>
                    <th>Responded</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.length === 0 ? (
                    <tr><td colSpan="5" className="text-center">No invitations sent yet</td></tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.guestName || inv.guest_name || '-'}</td>
                        <td>{inv.guestEmail || inv.guest_email || '-'}</td>
                        <td>{inv.guestPhone || inv.guest_phone || '-'}</td>
                        <td>
                          <span className={`badge badge-${(inv.rsvpStatus || inv.rsvp_status || 'pending').toLowerCase()}`}>
                            {inv.rsvpStatus || inv.rsvp_status || 'PENDING'}
                          </span>
                        </td>
                        <td>{inv.respondedAt || inv.responded_at ? new Date(inv.respondedAt || inv.responded_at).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Waivers' && (
        <div className="card">
          <h3>Waiver Status</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Status</th>
                  <th>Signed Date</th>
                </tr>
              </thead>
              <tbody>
                {waivers.length === 0 ? (
                  <tr><td colSpan="3" className="text-center">No waivers found</td></tr>
                ) : (
                  waivers.map((w) => (
                    <tr key={w.id}>
                      <td>{w.signerName || w.signer_name || w.name || '-'}</td>
                      <td>
                        <span className={`badge badge-${w.signedAt || w.signed_at ? 'confirmed' : 'requested'}`}>
                          {w.signedAt || w.signed_at ? 'Signed' : 'Unsigned'}
                        </span>
                      </td>
                      <td>{w.signedAt || w.signed_at ? new Date(w.signedAt || w.signed_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Payments' && (
        <div>
          <div className="card">
            <h3>Record Payment</h3>
            <form onSubmit={handlePayment} className="form-inline">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount *"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
              <input
                placeholder="Note (optional)"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={processingPayment}>
                {processingPayment ? 'Processing...' : 'Record Payment'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Payment History</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan="4" className="text-center">No payments recorded</td></tr>
                  ) : (
                    payments.map((p, i) => (
                      <tr key={p.id || i}>
                        <td>{p.createdAt || p.created_at ? new Date(p.createdAt || p.created_at).toLocaleDateString() : '-'}</td>
                        <td>${Number(p.amount || 0).toFixed(2)}</td>
                        <td>{p.method || p.paymentMethod || p.payment_method || '-'}</td>
                        <td>{p.note || p.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Notes' && (
        <div>
          <div className="card">
            <h3>Add Note</h3>
            <form onSubmit={handleAddNote}>
              <div className="form-group">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows="3"
                  placeholder="Write a note..."
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addingNote}>
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Notes</h3>
            {(Array.isArray(notes) ? notes : []).length === 0 ? (
              <p className="text-muted">No notes yet</p>
            ) : (
              <div className="notes-list">
                {(Array.isArray(notes) ? notes : []).map((note, i) => (
                  <div key={note.id || i} className="note-item">
                    <div className="note-meta">
                      <span className="note-author">{note.author || note.createdBy || 'Admin'}</span>
                      <span className="note-date">{note.createdAt || note.created_at ? new Date(note.createdAt || note.created_at).toLocaleString() : ''}</span>
                    </div>
                    <div className="note-content">{note.content || note.text || note.note || ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Email' && (
        <div>
          <div className="card">
            <h3>Send Email</h3>
            <div className="btn-group">
              <button className="btn btn-outline" onClick={() => handleSendEmail('confirmation')}>Send Confirmation</button>
              <button className="btn btn-outline" onClick={() => handleSendEmail('reminder')}>Send Reminder</button>
              <button className="btn btn-outline" onClick={() => handleSendEmail('followup')}>Send Follow-up</button>
            </div>
          </div>

          <div className="card">
            <h3>Email History</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emailHistory.length === 0 ? (
                    <tr><td colSpan="5" className="text-center">No emails sent</td></tr>
                  ) : (
                    emailHistory.map((em, i) => (
                      <tr key={em.id || i}>
                        <td>{em.sentAt || em.sent_at || em.createdAt ? new Date(em.sentAt || em.sent_at || em.createdAt).toLocaleDateString() : '-'}</td>
                        <td>{em.type || em.templateType || '-'}</td>
                        <td>{em.recipient || em.to || '-'}</td>
                        <td>{em.subject || '-'}</td>
                        <td><span className={`badge badge-${(em.status || 'sent').toLowerCase()}`}>{em.status || 'Sent'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
