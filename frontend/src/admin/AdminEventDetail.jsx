import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import AdminShell from './AdminShell.jsx';
import { DataPanel } from './components/AdminPrimitives.jsx';

const DetailRow = ({ label, value }) => (
  <div className="grid gap-2 border-t border-white/5 py-3 first:border-none first:pt-0">
    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
    <p className="text-sm text-slate-200">{value}</p>
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

  if (loading) {
    return (
      <AdminShell title="Loading event" subtitle="Fetching event intelligence">
        <div className="flex h-64 items-center justify-center">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </AdminShell>
    );
  }

  if (!event) {
    return (
      <AdminShell title="Event not found" subtitle="We couldn't locate that experience">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center text-slate-300">
          This event may have been deleted or never existed.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={event.title}
      subtitle="Deep insights and controls for this experience"
      rightSlot={
        <button
          onClick={onDelete}
          className="rounded-2xl bg-red-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/30"
        >
          Delete Event
        </button>
      }
    >
      <DataPanel title="Event Overview" description="Key details and ownership">
        <div className="grid gap-2">
          <DetailRow label="Description" value={event.description || 'No description provided'} />
          <DetailRow label="Status" value={event.status || (event.approved ? 'active' : 'pending')} />
          <DetailRow label="Organizer" value={event.organizer?.name || '-'} />
          <DetailRow
            label="Created By"
            value={`${event.createdBy?.name || 'Unknown'} (${event.createdBy?.role || '-'})`}
          />
          <DetailRow label="Audience" value={event.audienceSummary || 'Campus-wide'} />
        </div>
      </DataPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataPanel title="Schedule" description="Timeline for participants">
          <div className="grid gap-4 rounded-2xl border border-white/5 bg-white/5 p-6 text-sm text-slate-200">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Start</p>
              <p className="mt-2 text-base text-white">{new Date(event.startAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">End</p>
              <p className="mt-2 text-base text-white">{new Date(event.endAt).toLocaleString()}</p>
            </div>
          </div>
        </DataPanel>

        <DataPanel title="Engagement" description="Participation indicators">
          <div className="grid gap-4 text-sm text-slate-200">
            <DetailRow label="Registrations" value={event.metrics?.registrations ?? '—'} />
            <DetailRow label="Check-ins" value={event.metrics?.checkins ?? '—'} />
            <DetailRow label="Feedback Score" value={event.metrics?.feedbackScore ?? '—'} />
          </div>
        </DataPanel>
      </div>
    </AdminShell>
  );
};

export default AdminEventDetail;

