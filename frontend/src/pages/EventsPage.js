import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiEdit, FiTrash2, FiCalendar, FiMapPin, FiLink, FiUsers } from 'react-icons/fi';
import axios from 'axios';

const years = [1, 2, 3, 4];
const roles = ["student", "teacher", "alumni", "staff"];

const DEFAULT_DEPARTMENTS = ['CSE', 'AI-DS', 'Civil', 'Mechanical', 'Electrical', 'ETC'];

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user, canCreateContent } = useAuth();
  const [editingEvent, setEditingEvent] = useState(null);

  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
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

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const resp = await axios.get('/api/search/departments', { withCredentials: true });
        const list = Array.isArray(resp.data) ? resp.data : [];
        if (list.length) setDepartments(list);
      } catch {
        setDepartments(DEFAULT_DEPARTMENTS);
      }
    };
    fetchDepartments();
  }, []);

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
      {/* rest of your existing component stays the same */}
    </div>
  );
};

export default EventsPage;