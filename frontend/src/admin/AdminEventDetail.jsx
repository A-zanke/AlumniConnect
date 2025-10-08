import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import AdminNavbar from './AdminNavbar.jsx';

const Row = ({ label, value }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 10 }}>
    <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
    <div>{value}</div>
  </div>
);

const AdminEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/events/${id}`);
      setEvent(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const onDelete = async () => {
    if (!window.confirm('Delete this event?')) return;
    await axios.delete(`/api/admin/events/${id}`);
    navigate('/admin');
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!event) return <div style={{ padding: 24 }}>Not found</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <AdminNavbar />
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{event.title}</h2>
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
        <Row label="Description" value={event.description} />
        <Row label="Status" value={event.status} />
        <Row label="Organizer" value={event.organizer?.name || '-'} />
        <Row label="Created By" value={`${event.createdBy?.name || ''} (${event.createdBy?.role || '-'})`} />
        <Row label="Start" value={new Date(event.startAt).toLocaleString()} />
        <Row label="End" value={new Date(event.endAt).toLocaleString()} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onDelete} style={{ padding: '8px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8 }}>Delete Event</button>
        </div>
      </div>
    </div>
  );
};

export default AdminEventDetail;

