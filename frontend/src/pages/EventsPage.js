import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiEdit, FiTrash2, FiCalendar, FiMapPin, FiLink, FiUsers } from 'react-icons/fi';

// Dummy data for filters - replace with actual data fetching if needed
const departments = ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Business Administration"];
const years = [1, 2, 3, 4];
const roles = ["student", "teacher", "alumni", "staff"];

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user, canCreateContent } = useAuth();
  const [editingEvent, setEditingEvent] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    category: 'other',
    isVirtual: false,
    meetingLink: '',
    audienceType: 'college',
    targetDepartments: [],
    targetYears: [],
    targetRoles: [],
    targetGraduationYears: []
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

  const handleArrayChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].includes(value)
        ? prev[name].filter(item => item !== value)
        : [...prev[name], value]
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      endDate: '',
      location: '',
      category: 'other',
      isVirtual: false,
      meetingLink: '',
      audienceType: 'college',
      targetDepartments: [],
      targetYears: [],
      targetRoles: [],
      targetGraduationYears: []
    });
    setEventImage(null);
    setEditingEvent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Map frontend fields to backend schema
      const eventData = {
        title: formData.title,
        description: formData.description,
        audience: formData.audienceType === 'college' ? 'college' : (formData.audienceType === 'department' ? 'department' : (formData.audienceType === 'year' ? 'year' : 'custom')),
        departmentScope: formData.targetDepartments,
        yearScope: formData.targetYears,
        graduationYearScope: formData.targetGraduationYears,
        roleScope: formData.targetRoles.map(r => r.toLowerCase()),
        location: formData.isVirtual ? undefined : formData.location,
        startAt: formData.date,
        endAt: formData.endDate || formData.date,
        image: eventImage
      };

      if (editingEvent) {
        await eventsAPI.updateEvent(editingEvent._id, eventData);
        toast.success('Event updated successfully');
      } else {
        await eventsAPI.createEvent(eventData);
        const message = user.role?.toLowerCase() === 'alumni'
          ? 'Event submitted for approval'
          : 'Event created successfully';
        toast.success(message);
      }

      resetForm();
      setShowCreateForm(false);
      fetchEventsData();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: event.startAt ? event.startAt.slice(0, 16) : '',
      endDate: event.endAt ? event.endAt.slice(0, 16) : '',
      location: event.location || '',
      category: event.category || 'other',
      isVirtual: event.isVirtual || false,
      meetingLink: event.meetingLink || '',
      audienceType: event.audience || 'college',
      targetDepartments: event.departmentScope || [],
      targetYears: event.yearScope || [],
      targetRoles: event.roleScope || [],
      targetGraduationYears: event.graduationYearScope || []
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsAPI.deleteEvent(eventId);
        toast.success('Event deleted successfully');
        fetchEventsData();
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event');
      }
    }
  };

  const canEditEvent = (event) => {
    return user && (user._id === event.organizer._id || user.role?.toLowerCase() === 'admin');
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
      <div className="relative overflow-hidden rounded-2xl mb-8 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-90" />
        <img src="https://images.unsplash.com/photo-1551836022-deb4988cc6c7?q=80&w=1200&auto=format&fit=crop" alt="events" className="w-full h-64 object-cover" />
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-2">Events</h1>
            <p className="text-lg text-white/90 font-medium">Discover networking events, workshops, and more</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 px-2">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Explore Events</h2>
          <p className="mt-1 text-gray-600">Find and create events relevant to you.</p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showUpcoming"
              checked={showUpcoming}
              onChange={() => setShowUpcoming(!showUpcoming)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-md"
            />
            <label htmlFor="showUpcoming" className="ml-2 block text-sm font-medium text-gray-700">
              Show upcoming events only
            </label>
          </div>

          {canCreateContent() && (
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                resetForm();
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              {showCreateForm ? 'Cancel' : 'Create Event'}
            </button>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-2xl p-8 mb-8 border border-indigo-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Event Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter an engaging event title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Describe your event in detail..."
                    required
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date & Time</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date & Time</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="networking">🤝 Networking</option>
                  <option value="workshop">🛠️ Workshop</option>
                  <option value="seminar">📚 Seminar</option>
                  <option value="career">💼 Career Fair</option>
                  <option value="social">🎉 Social Gathering</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>

              {/* Virtual/Physical Toggle */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isVirtual"
                    checked={formData.isVirtual}
                    onChange={handleChange}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm font-semibold text-gray-700">Virtual Event</span>
                </label>
              </div>

              {/* Location/Link */}
              <div className="lg:col-span-2">
                {formData.isVirtual ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FiLink className="inline mr-1" />
                      Meeting Link
                    </label>
                    <input
                      type="url"
                      name="meetingLink"
                      value={formData.meetingLink}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://zoom.us/j/..."
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FiMapPin className="inline mr-1" />
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter venue address"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Audience Targeting */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  <FiUsers className="inline mr-1" />
                  Target Audience
                </label>

                {/* Audience Type */}
                <div className="mb-4">
                  <select
                    name="audienceType"
                    value={formData.audienceType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="college">Entire College</option>
                    <option value="department">Specific Departments</option>
                    <option value="year">Specific Years</option>
                    <option value="role">Specific Roles</option>
                    <option value="custom">Custom Filter</option>
                  </select>
                </div>

                {/* Department Filter */}
                {(formData.audienceType === 'department' || formData.audienceType === 'custom') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Target Departments</label>
                    <div className="grid grid-cols-2 gap-2">
                      {departments.map(dept => (
                        <label key={dept} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.targetDepartments.includes(dept)}
                            onChange={() => handleArrayChange('targetDepartments', dept)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{dept}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Year Filter */}
                {(formData.audienceType === 'year' || formData.audienceType === 'custom') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Target Years</label>
                    <div className="flex gap-4">
                      {years.map(year => (
                        <label key={year} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.targetYears.includes(year)}
                            onChange={() => handleArrayChange('targetYears', year)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Year {year}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Role Filter */}
                {(formData.audienceType === 'role' || formData.audienceType === 'custom') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Target Roles</label>
                    <div className="flex gap-4">
                      {roles.map(role => (
                        <label key={role} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.targetRoles.includes(role)}
                            onChange={() => handleArrayChange('targetRoles', role)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Event Image */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Event Image</label>
                <FileInput
                  accept="image/*"
                  onChange={setEventImage}
                />
                {eventImage && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ Image selected: {eventImage.name}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                {editingEvent ? 'Update Event' : 'Create Event'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event) => (
            <div key={event._id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="relative">
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white text-lg font-medium text-center px-4">{event.title}</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    event.approved
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>

                {/* Action Buttons for Event Creator */}
                {canEditEvent(event) && (
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    >
                      <FiEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(event._id)}
                      className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{event.title}</h3>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full capitalize">
                    {event.category}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2 text-indigo-500" />
                    {format(new Date(event.date), 'PPP')} at {format(new Date(event.date), 'p')}
                  </div>

                  <div className="flex items-center">
                    {event.isVirtual ? (
                      <>
                        <FiLink className="mr-2 text-indigo-500" />
                        Virtual Event
                      </>
                    ) : (
                      <>
                        <FiMapPin className="mr-2 text-indigo-500" />
                        {event.location}
                      </>
                    )}
                  </div>

                  <div className="flex items-center">
                    <FiUsers className="mr-2 text-indigo-500" />
                    Organized by {event.organizer?.name || 'Unknown'}
                  </div>
                </div>

                <p className="text-gray-700 line-clamp-3 mb-6">{event.description}</p>

                <div className="flex justify-between items-center">
                  <Link
                    to={`/events/${event._id}`}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                  >
                    View Details →
                  </Link>

                  {user && event.approved && (
                    <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105">
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