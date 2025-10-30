import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../components/utils/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiCalendar, FiMapPin, FiUsers, FiCheckCircle, FiClock } from 'react-icons/fi';
import Avatar from '../components/ui/Avatar';

const safeFormat = (value, fmt) => {
  try {
    const d = value ? new Date(value) : null;
    return d && !isNaN(d.getTime()) ? format(d, fmt) : 'Date TBD';
  } catch {
    return 'Date TBD';
  }
};

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);
  const [registrations, setRegistrations] = useState([]);

  const isCreator = () => {
    const organizerId = typeof event?.organizer === 'object' ? event?.organizer?._id : event?.organizer;
    return user && organizerId && String(user._id) === String(organizerId);
  };

  const canSeeAudience = () => {
    const userRole = (user?.role || '').toLowerCase();
    return userRole === 'admin' || isCreator();
  };

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const response = await eventsAPI.getEvent(id);
        setEvent(response.data);
        setError(null);
        
        // Check if user is registered
        if (user) {
          checkRegistrationStatus();
        }
      } catch (err) {
        setError('Failed to fetch event details');
        console.error('Error fetching event details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id, user]);

  const checkRegistrationStatus = async () => {
    try {
      const response = await fetch(`/api/events/${id}/check-registration`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setIsRegistered(data.isRegistered);
        setRegistrationData(data.registration);
      }
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  const handleRegister = async () => {
    if (!user) return;
    const userRole = (user.role || '').toLowerCase();
    const organizerRole = typeof event?.organizer === 'object' ? (event?.organizer?.role || '') : '';

    const updateCount = () => {
      setEvent(prev => prev ? { ...prev, registrationCount: (prev.registrationCount || 0) + 1 } : prev);
    };

    const registerDirectly = async (payload = {}) => {
      try {
        await eventsAPI.registerForEvent(id, payload);
        toast.success('Registered for the event');
        setIsRegistered(true);
        updateCount();
        checkRegistrationStatus();
      } catch (error) {
        console.error('Error registering for event:', error);
        toast.error(error.response?.data?.message || 'Failed to register');
      }
    };

    const basePayload = {
      name: user.name || user.username || 'Participant',
      rollNo: user.rollNo || user.studentId || 'N/A',
      year: user.year || user.currentYear || null,
      department: user.department || 'General',
      division: user.division || user.section || 'A'
    };

    // Alumni-organized events: backend auto-hydrates; blank payload OK
    if ((organizerRole || '').toLowerCase() === 'alumni') {
      await registerDirectly({});
      return;
    }

    // For other organizers, send best-effort payload
    await registerDirectly(basePayload);
  };

  const isEventCreator = () => {
    const organizerId = typeof event?.organizer === 'object' ? event?.organizer?._id : event?.organizer;
    return user && organizerId && String(user._id) === String(organizerId);
  };

  useEffect(() => {
    const maybeFetchRegistrations = async () => {
      try {
        if (event && isEventCreator()) {
          const res = await eventsAPI.getEventRegistrations(id);
          setRegistrations(Array.isArray(res.data) ? res.data : []);
        } else {
          setRegistrations([]);
        }
      } catch (e) {
        setRegistrations([]);
      }
    };
    maybeFetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsAPI.deleteEvent(id);
        toast.success('Event deleted successfully');
        navigate('/events');
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-8">{error}</div>;
  }

  if (!event) {
    return <div className="text-center mt-8">Event not found</div>;
  }

  const organizerName = typeof event?.organizer === 'object' ? (event?.organizer?.name || 'Unknown') : 'Unknown';
  const startDate = safeFormat(event?.startAt, 'PPP');
  const startTime = safeFormat(event?.startAt, 'p');
  const endDate = safeFormat(event?.endAt, 'PPP');
  const endTime = safeFormat(event?.endAt, 'p');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="w-full h-64 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
            <span className="text-white text-2xl font-medium">{event.title}</span>
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span>{startDate} at {startTime}</span>
                {event.endAt && event.endAt !== event.startAt && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Ends: {endDate} at {endTime}</span>
                  </>
                )}
                <span className="mx-2">•</span>
                <span>{event.location || 'Virtual Event'}</span>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                event?.status === 'active' || event?.approved ? 'bg-green-100 text-green-800' :
                event?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {event?.status === 'active' || event?.approved ? 'Active' :
                 event?.status === 'pending' ? 'Pending Approval' : 'Rejected'}
              </span>
              <span className="badge badge-primary">{event.category || 'Event'}</span>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Description</h2>
            <p className="mt-2 text-gray-600">{event.description}</p>
          </div>

          {(event.target_roles && event.target_roles.length > 0 && canSeeAudience()) && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Target Audience</h2>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="font-medium">Roles: </span>
                  <span className="text-gray-600">{event.target_roles.join(', ')}</span>
                </div>

                {event.target_student_combinations && event.target_student_combinations.length > 0 && (
                  <div>
                    <span className="font-medium">Student Combinations: </span>
                    <span className="text-gray-600">
                      {event.target_student_combinations.map(combo =>
                        `${combo.department} Year ${combo.year}`
                      ).join(', ')}
                    </span>
                  </div>
                )}

                {event.target_teacher_departments && event.target_teacher_departments.length > 0 && (
                  <div>
                    <span className="font-medium">Teacher Departments: </span>
                    <span className="text-gray-600">
                      {event.target_teacher_departments.join(', ')}
                    </span>
                  </div>
                )}

                {event.target_alumni_combinations && event.target_alumni_combinations.length > 0 && (
                  <div>
                    <span className="font-medium">Alumni Combinations: </span>
                    <span className="text-gray-600">
                      {event.target_alumni_combinations.map(combo =>
                        `${combo.department} ${combo.graduation_year}`
                      ).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Attendees</h2>
            <p className="mt-2 text-gray-600">
              {event.rsvps?.length || 0} people attending
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Registered: {event.registrationCount || registrations.length || 0}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={() => navigate('/events')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Back to Events
            </button>

            <div className="flex flex-wrap gap-3">
              {/* Register Button */}
              {user && !isEventCreator() && !isRegistered && (event.status === 'active' || event.approved) && (
                <button
                  onClick={handleRegister}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg"
                >
                  <FiCheckCircle className="mr-2" />
                  Register for Event
                </button>
              )}

              {/* Already Registered Badge */}
              {isRegistered && registrationData && (
                <div className="flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-lg font-medium">
                  <FiCheckCircle className="mr-2" />
                  Already Registered
                  {registrationData.attended && <span className="ml-2">(Attended)</span>}
                </div>
              )}

              {/* Delete Button */}
              {user && ((typeof event.organizer === 'object' ? String(event.organizer?._id) : String(event.organizer)) === String(user._id) || user.role === 'admin') && (
                <button
                  onClick={handleDelete}
                  className="px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Delete Event
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Modals */}
      </div>

      {/* Simple registrants list for event creator */}
      {isEventCreator() && (
        <div className="mt-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gradient-to-r from-indigo-50 via-purple-50 to-cyan-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Registered Attendees</h3>
                <p className="text-xs text-gray-500">Showing everyone who has registered for this event.</p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white text-sm font-medium text-indigo-600 shadow-sm">
                Total: {registrations.length}
              </span>
            </div>
            {registrations.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-500 text-sm">
                No one has registered yet. Share the event to attract attendees!
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {registrations.map(r => (
                  <li key={r._id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={r.user?.name || r.name || 'User'}
                        avatarUrl={r.user?.avatarUrl}
                        size={48}
                        style={{ boxShadow: '0 4px 12px rgba(79,70,229,0.1)' }}
                      />
                      <div className="min-w-0">
                        {r.user?._id ? (
                          <Link to={`/profile/id/${r.user._id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 truncate">
                            {r.name || r.user?.name || r.user?.username || 'User'}
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {r.name || r.user?.name || r.user?.username || 'User'}
                          </span>
                        )}
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {[r.department, r.year ? `Year ${r.year}` : null]
                            .filter(Boolean)
                            .join(' • ') || 'Details unavailable'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {r.registeredAt ? new Date(r.registeredAt).toLocaleString() : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default EventDetailsPage;