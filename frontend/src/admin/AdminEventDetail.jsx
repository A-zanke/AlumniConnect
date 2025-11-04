import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeUser = useCallback((raw, fallbackId) => {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    // Drill down through common wrappers like { data: {...} } or { user: {...} }
    const unwrap = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (obj.data && typeof obj.data === 'object') return unwrap(obj.data);
      if (obj.user && typeof obj.user === 'object') return unwrap(obj.user);
      return obj;
    };

    const user = unwrap(raw) || {};

    const id = user._id || user.id || raw._id || raw.id || fallbackId;

    const composedName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const displayName =
      user.name ||
      user.fullName ||
      composedName ||
      user.firstName ||
      user.username ||
      (user.email ? user.email.split('@')[0] : null) ||
      (typeof id === 'string' ? `User ${id.slice(-4)}` : 'Unknown User');

    return {
      _id: id,
      name: displayName,
      email: user.email || raw.email || 'Unknown',
      role: user.role || raw.role || 'User',
      avatarUrl: user.avatarUrl || user.avatar || raw.avatarUrl || raw.avatar,
      registeredAt: raw.createdAt || raw.registeredAt || user.createdAt || user.registeredAt,
    };
  }, []);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const eventRes = await axios.get(`/api/admin/events/${id}`);
      setEvent(eventRes.data);
      
      // Get registrations from rsvps field
      let registrations = [];
      if (eventRes.data?.rsvps && eventRes.data.rsvps.length > 0) {
        // Check if rsvps contains user objects or just IDs
        const firstRsvp = eventRes.data.rsvps[0];
        
        console.log("First RSVP structure:", firstRsvp);
        console.log("Type of first RSVP:", typeof firstRsvp);
        console.log("All RSVPs:", eventRes.data.rsvps);
        console.log("RSVP keys:", Object.keys(firstRsvp || {}));
        
        if (typeof firstRsvp === 'object' && firstRsvp !== null) {
          // If rsvps contains user objects, clean them up
          registrations = eventRes.data.rsvps
            .flatMap(rsvp => {
              console.log("Processing RSVP:", rsvp);

              if (rsvp.data && Array.isArray(rsvp.data)) {
                console.log("RSVP has data array:", rsvp.data);
                return rsvp.data
                  .map(item => normalizeUser(item, item._id || item.id))
                  .filter(Boolean);
              }

              const normalized = normalizeUser(rsvp, rsvp._id || rsvp.id);
              if (normalized) return [normalized];

              console.log("Unknown RSVP structure:", rsvp);
              return [];
            })
            .filter(user => user?._id);
        } else {
          // If rsvps contains user IDs, fetch user details individually
          try {
            // Filter out invalid user IDs
            const validUserIds = eventRes.data.rsvps.filter(userId => 
              userId && 
              typeof userId === 'string' && 
              userId !== 'undefined' && 
              userId.length === 24 && 
              /^[0-9a-fA-F]{24}$/.test(userId)
            );
            
            console.log("Valid user IDs:", validUserIds);
            console.log("Invalid user IDs filtered out:", eventRes.data.rsvps.filter(id => !validUserIds.includes(id)));
            
            const userPromises = validUserIds.map(async (userId) => {
              try {
                // Try the general users endpoint first since admin endpoint returns 404
                const userRes = await axios.get(`/api/users/${userId}`);
                console.log(`Successfully fetched user ${userId}:`, userRes.data);
                const normalized = normalizeUser(userRes.data, userId);
                console.log(`Normalized API user:`, normalized);
                return normalized || {
                  _id: userId,
                  name: `User ${userId.slice(-4)}`,
                  email: 'Unknown',
                  role: 'Unknown'
                };
              } catch (err) {
                console.log(`Failed to fetch user ${userId}:`, err);
                return {
                  _id: userId,
                  name: `User ${userId.slice(-4)}`,
                  email: 'Unknown',
                  role: 'Unknown'
                };
              }
            });
            
            registrations = await Promise.all(userPromises);
          } catch (error) {
            console.log("Failed to fetch user details for RSVPs:", error);
            // Fallback: create basic user objects from valid IDs only
            const validIds = eventRes.data.rsvps.filter(id => 
              id && typeof id === 'string' && id !== 'undefined' && id.length === 24
            );
            registrations = validIds.map(id => ({
              _id: id,
              name: `User ${id.slice(-4)}`,
              email: 'Unknown',
              role: 'Unknown'
            }));
          }
        }
      }
      
      console.log("Event data:", eventRes.data);
      console.log("Registrations found:", registrations);
      console.log("Processed user IDs:", registrations.map(r => r._id));
      console.log("Processed user names:", registrations.map(r => r.name));
      setRegisteredUsers(registrations);
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

        <DataPanel title="Registered Users" description={`${registeredUsers.length} participants registered`}>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {registeredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No registrations yet</p>
                {event && (
                  <div className="mt-4 text-xs text-slate-500 max-h-40 overflow-y-auto">
                    <p>Debug info:</p>
                    <p>Event ID: {event._id}</p>
                    <p>Registration Count: {event.registrationCount || 0}</p>
                    <p>RSVPs Length: {event.rsvps?.length || 0}</p>
                    <p>Processed Users Count: {registeredUsers.length}</p>
                    <div className="mt-2 p-2 bg-slate-800 rounded text-xs">
                      <p>First RSVP Structure:</p>
                      <pre>{event.rsvps?.[0] ? JSON.stringify(event.rsvps[0], null, 2) : 'None'}</pre>
                    </div>
                    {registeredUsers.length > 0 && (
                      <div className="mt-2 p-2 bg-slate-800 rounded text-xs">
                        <p>First Processed User:</p>
                        <pre>{JSON.stringify(registeredUsers[0], null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              registeredUsers.map((user, index) => (
                <div key={user._id || index} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <img
                    src={user.avatarUrl || '/default-avatar.png'}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    {user._id && user._id !== 'unknown' ? (
                      <Link
                        to={`/profile/id/${user._id}`}
                        className="font-medium text-slate-200 hover:text-indigo-300 transition-colors block truncate"
                      >
                        {user.name || 'Unknown User'}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-200 block truncate">
                        {user.name || 'Unknown User'}
                      </span>
                    )}
                    <p className="text-xs text-slate-400 truncate">
                      {user.email || ''} • {user.role || 'User'}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </DataPanel>
      </div>
    </AdminShell>
  );
};

export default AdminEventDetail;

