import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../utils/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

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
        const response = await eventsAPI.getEvents();
        const eventData = response.data.find(e => e._id === id);
        if (!eventData) {
          throw new Error('Event not found');
        }
        setEvent(eventData);
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
      await eventsAPI.updateEvent(id, {
        ...event,
        attendees: [...(event.attendees || []), user._id]
      });
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
          <div className="w-full h-64 bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
            <span className="text-white text-2xl font-medium">{event.title}</span>
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span>{format(new Date(event.date), 'PPP')} at {format(new Date(event.date), 'p')}</span>
                <span className="mx-2">•</span>
                <span>{event.isVirtual ? 'Virtual Event' : event.location}</span>
              </div>
            </div>
            <span className="badge badge-primary">{event.category}</span>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Description</h2>
            <p className="mt-2 text-gray-600">{event.description}</p>
          </div>

          {event.isVirtual && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Meeting Link</h2>
              <a
                href={event.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-primary-600 hover:text-primary-700"
              >
                {event.meetingLink}
              </a>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Attendees</h2>
            <p className="mt-2 text-gray-600">
              {event.attendees?.length || 0} people attending
            </p>
          </div>

          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={() => navigate('/events')}
              className="btn btn-outline"
            >
              Back to Events
            </button>

            <div className="flex space-x-4">
              {user && !isAttending && (
                <button
                  onClick={handleAttend}
                  className="btn btn-primary"
                >
                  Attend Event
                </button>
              )}
              {user && user._id === event.organizer && (
                <button
                  onClick={handleDelete}
                  className="btn btn-outline text-red-600 hover:bg-red-50"
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