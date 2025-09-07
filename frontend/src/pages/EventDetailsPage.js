import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../components/utils/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

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
  const [isAttending, setIsAttending] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const response = await eventsAPI.getEvent(id);
        setEvent(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch event details');
        console.error('Error fetching event details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id]);

  const handleAttend = async () => {
    try {
      await eventsAPI.rsvpEvent(id);
      setIsAttending(true);
      toast.success('Successfully registered for the event');
    } catch (error) {
      console.error('Error registering for event:', error);
      toast.error('Failed to register for the event');
    }
  };

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

          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Organizer</h2>
            <p className="mt-2 text-gray-600">Organized by {organizerName}</p>
          </div>

          {/* Target Audience Information */}
          {(event.target_roles && event.target_roles.length > 0) && (
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
          </div>

          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={() => navigate('/events')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Events
            </button>

            <div className="flex space-x-4">
              {user && !isAttending && (event.status === 'active' || event.approved) && (
                <button
                  onClick={handleAttend}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Attend Event
                </button>
              )}
              {user && (user._id === event.organizer || user.role === 'admin') && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete Event
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;