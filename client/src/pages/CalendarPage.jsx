import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchBookings();
  }, [year, month]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/parties');
      const list = Array.isArray(data) ? data : (data.data || data.parties || []);
      setBookings(list);
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getBookingsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter((b) => {
      const d = b.partyDate || b.party_date || '';
      return d.startsWith(dateStr) || (d.includes('T') && d.slice(0, 10) === dateStr);
    });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const today = new Date();
  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const selectedBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Calendar View</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="calendar-header">
          <button className="btn btn-outline btn-sm" onClick={prevMonth}>&larr;</button>
          <h2>{MONTHS[month]} {year}</h2>
          <button className="btn btn-outline btn-sm" onClick={nextMonth}>&rarr;</button>
        </div>

        {loading ? (
          <div className="page-loading">Loading...</div>
        ) : (
          <div className="calendar-grid">
            {DAYS.map((day) => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}
            {calendarCells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="calendar-cell empty" />;
              const dayBookings = getBookingsForDay(day);
              return (
                <div
                  key={day}
                  className={`calendar-cell ${isToday(day) ? 'today' : ''} ${selectedDay === day ? 'selected' : ''} ${dayBookings.length > 0 ? 'has-events' : ''}`}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                >
                  <div className="calendar-day-number">{day}</div>
                  {dayBookings.length > 0 && (
                    <div className="calendar-events">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div key={b.id} className={`calendar-event badge-${(b.status || 'requested').toLowerCase()}`}>
                          {b.childName || b.child_name || 'Event'}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="calendar-more">+{dayBookings.length - 3} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Events on {MONTHS[month]} {selectedDay}, {year}</h3>
          {selectedBookings.length === 0 ? (
            <p className="text-muted">No events on this day</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Host</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.childName || b.child_name || 'Event'}</td>
                      <td>{b.parentFirstName || b.parent_first_name || ''} {b.parentLastName || b.parent_last_name || ''}</td>
                      <td>{b.startTime || b.start_time || '-'} - {b.endTime || b.end_time || '-'}</td>
                      <td><span className={`badge badge-${(b.status || 'requested').toLowerCase()}`}>{b.status || 'REQUESTED'}</span></td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/bookings/${b.id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
