import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user, canCreateContent } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    category: 'other',
    isVirtual: false,
    meetingLink: '',
  });
  const [eventImage, setEventImage] = useState(null);
  const [error, setError] = useState(null);
  
  const fetchEventsData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventsAPI.getEvents(showUpcoming);
      setEvents(data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch events');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [showUpcoming]);
  
  useEffect(() => {
    fetchEventsData();
  }, [fetchEventsData]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        ...formData,
        image: eventImage,
      };
      
      await eventsAPI.createEvent(eventData);
      toast.success('Event created successfully');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        date: '',
        location: '',
        category: 'other',
        isVirtual: false,
        meetingLink: '',
      });
      setEventImage(null);
      setShowCreateForm(false);
      
      // Refresh events
      fetchEventsData();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return <div className="text-red-500 text-center mt-8">{error}</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-90" />
        <img src="https://images.unsplash.com/photo-1551836022-deb4988cc6c7?q=80&w=1200&auto=format&fit=crop" alt="events" className="w-full h-48 object-cover" />
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow">Events</h1>
            <p className="text-white/90">Discover networking events, workshops, and more</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Explore</h2>
          <p className="mt-1 text-gray-600">Use filters to find what matters to you</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showUpcoming"
              checked={showUpcoming}
              onChange={() => setShowUpcoming(!showUpcoming)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="showUpcoming" className="ml-2 block text-sm text-gray-900">
              Show upcoming events only
            </label>
          </div>
          
          {canCreateContent() && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary"
            >
              {showCreateForm ? 'Cancel' : 'Create Event'}
            </button>
          )}
        </div>
      </div>
      
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Event</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="title" className="form-label">Event Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="form-input"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="date" className="form-label">Date & Time</label>
                <input
                  type="datetime-local"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="category" className="form-label">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="networking">Networking</option>
                  <option value="workshop">Workshop</option>
                  <option value="seminar">Seminar</option>
                  <option value="career">Career Fair</option>
                  <option value="social">Social Gathering</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isVirtual"
                  name="isVirtual"
                  checked={formData.isVirtual}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isVirtual" className="ml-2 block text-sm text-gray-900">
                  Virtual Event
                </label>
              </div>
              
              {formData.isVirtual ? (
                <div>
                  <label htmlFor="meetingLink" className="form-label">Meeting Link</label>
                  <input
                    type="url"
                    id="meetingLink"
                    name="meetingLink"
                    value={formData.meetingLink}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="https://zoom.us/..."
                    required
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="location" className="form-label">Location</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              )}
              
              <div className="md:col-span-2">
                <label className="form-label">Event Image</label>
                <FileInput
                  accept="image/*"
                  onChange={setEventImage}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                Create Event
              </button>
            </div>
          </form>
        </div>
      )}
      
      {events.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No events found</h3>
          <p className="mt-2 text-gray-600">
            {showUpcoming
              ? "There are no upcoming events scheduled."
              : "No events have been created yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">{event.title}</span>
                </div>
              )}
              
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                  <span className="badge badge-primary">{event.category}</span>
                </div>
                
                <p className="mt-2 text-sm text-gray-600">
                  {format(new Date(event.date), 'PPP')} at {format(new Date(event.date), 'p')}
                </p>
                
                <p className="mt-1 text-sm text-gray-600">
                  {event.isVirtual ? 'Virtual Event' : event.location}
                </p>
                
                <p className="mt-4 text-gray-700 line-clamp-3">{event.description}</p>
                
                <div className="mt-6 flex justify-between items-center">
                  <Link
                    to={`/events/${event._id}`}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Details
                  </Link>
                  
                  {user && (
                    <button className="btn btn-outline">
                      Attend
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;