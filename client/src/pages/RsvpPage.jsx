import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = '/api/v1';

export default function RsvpPage() {
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responded, setResponded] = useState(false);
  const [responseStatus, setResponseStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/invitations/token/${token}`);
      if (!response.ok) {
        throw new Error('Invitation not found or expired');
      }
      const data = await response.json();
      setInvitation(data);
      if (data.rsvpStatus && data.rsvpStatus !== 'PENDING') {
        setResponded(true);
        setResponseStatus(data.rsvpStatus);
      }
    } catch (err) {
      setError(err.message || 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (status) => {
    setSubmitting(true);
    setError('');
    try {
      const invId = invitation.id;
      const response = await fetch(`${API_BASE}/invitations/${invId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit RSVP');
      }
      setResponded(true);
      setResponseStatus(status);
    } catch (err) {
      setError(err.message || 'Failed to submit RSVP');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-page">
        <div className="public-card">
          <div className="page-loading">Loading invitation...</div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="public-page">
        <div className="public-card">
          <div className="public-logo">bookhou</div>
          <div className="alert alert-error">{error}</div>
          <p className="text-center text-muted">This invitation may have expired or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  const inv = invitation || {};
  const partyDate = inv.party?.partyDate || inv.partyDate || inv.party_date;

  return (
    <div className="public-page">
      <div className="public-card">
        <div className="public-logo">bookhou</div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="rsvp-content">
          <h2>You're Invited!</h2>
          <div className="rsvp-details">
            <div className="rsvp-child-name">{inv.party?.childName || inv.childName || 'A Special'}'s Party</div>
            {partyDate && (
              <div className="rsvp-date">
                {new Date(partyDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
            {(inv.party?.startTime || inv.startTime) && (
              <div className="rsvp-time">
                {inv.party?.startTime || inv.startTime} - {inv.party?.endTime || inv.endTime}
              </div>
            )}
            {(inv.party?.room?.name || inv.roomName) && (
              <div className="rsvp-location">{inv.party?.room?.name || inv.roomName}</div>
            )}
          </div>

          <div className="rsvp-guest">
            <p>Dear <strong>{inv.guestName || inv.guest_name || 'Guest'}</strong>,</p>
            <p>Please let us know if you'll be attending.</p>
          </div>

          {responded ? (
            <div className={`rsvp-response ${responseStatus === 'ACCEPTED' || responseStatus === 'YES' ? 'response-yes' : 'response-no'}`}>
              <div className="response-icon">
                {responseStatus === 'ACCEPTED' || responseStatus === 'YES' ? '&#10003;' : '&#10007;'}
              </div>
              <h3>
                {responseStatus === 'ACCEPTED' || responseStatus === 'YES'
                  ? 'You have accepted this invitation!'
                  : 'You have declined this invitation.'}
              </h3>
              <p className="text-muted">Thank you for your response.</p>
            </div>
          ) : (
            <div className="rsvp-buttons">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => handleRsvp('ACCEPTED')}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Yes, I\'ll Be There!'}
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={() => handleRsvp('DECLINED')}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Sorry, Can\'t Make It'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
