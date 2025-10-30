import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import FileInput from '../components/ui/FileInput';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiEdit, FiTrash2, FiCalendar, FiMapPin, FiLink, FiUsers, FiCheck, FiX, FiPlus, FiMinus, FiClock } from 'react-icons/fi';
import axios from 'axios';

const years = [1, 2, 3, 4];
const roles = ['student', 'teacher', 'alumni'];
const DEFAULT_DEPARTMENTS = ['CSE', 'AI-DS', 'E&TC', 'Mechanical', 'Civil', 'Other'];
const graduationYears = [2020, 2021, 2022, 2023, 2024, 2025];

const safeFormat = (value, fmt) => {
	try {
		const d = value ? new Date(value) : null;
		return d && !isNaN(d.getTime()) ? format(d, fmt) : '';
	} catch {
		return '';
	}
};

const toArray = (v) => {
	if (v === undefined || v === null) return [];
	return Array.isArray(v) ? v : [v];
};

const EventsPage = () => {
	const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
	const [pendingEvents, setPendingEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showUpcoming, setShowUpcoming] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [activeTab, setActiveTab] = useState('all'); // all | mine | pending
	const { user, canCreateContent } = useAuth();
	const [editingEvent, setEditingEvent] = useState(null);
	const [lockAudience, setLockAudience] = useState(false); // lock audience in "My Created Events" edits
	const [registrationStatus, setRegistrationStatus] = useState({}); // Track registration status for each event

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
		target_roles: [],
		target_student_combinations: [],
		target_teacher_departments: [],
		target_alumni_combinations: []
	});
	const [eventImage, setEventImage] = useState(null);
	const [error, setError] = useState(null);

	// Available target roles based on creator role: alumni/teachers cannot target alumni
	const creatorRole = String(user?.role || '').toLowerCase();
	const availableRoles = ['alumni', 'teacher', 'admin'].includes(creatorRole)
		? ['student', 'teacher']
		: roles;

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

	const fetchAll = useCallback(async () => {
		setLoading(true);
		try {
      const userRole = String(user?.role||'').toLowerCase();
      
      if (userRole === 'student') {
        // For students, fetch all events and registered events
        const [allRes, registeredRes] = await Promise.all([
          eventsAPI.getEvents(showUpcoming),
          eventsAPI.getMyRegisteredEvents()
        ]);
        setEvents(Array.isArray(allRes.data) ? allRes.data : []);
        setAttendedEvents(Array.isArray(registeredRes.data) ? registeredRes.data : []);
        setMyEvents([]); // Students don't create events
      } else {
        // For non-students, fetch all events and created events
        const [allRes, mineRes] = await Promise.all([
          eventsAPI.getEvents(showUpcoming),
          eventsAPI.getMyEvents()
        ]);
        setEvents(Array.isArray(allRes.data) ? allRes.data : []);
        setMyEvents(Array.isArray(mineRes.data) ? mineRes.data : []);
        setAttendedEvents([]);
      }
			setError(null);
		} catch (err) {
			setError('Failed to fetch events');
			console.error('Error fetching events:', err);
		} finally {
			setLoading(false);
		}
	}, [showUpcoming, user]);

	const fetchPendingEvents = useCallback(async () => {
		try {
			const data = await eventsAPI.getPendingEvents();
			setPendingEvents(Array.isArray(data.data) ? data.data : []);
		} catch (err) {
			console.error('Error fetching pending events:', err);
		}
	}, []);

	useEffect(() => {
		fetchAll();
		if (user?.role?.toLowerCase() === 'admin') {
			fetchPendingEvents();
		}
	}, [fetchAll, fetchPendingEvents, user]);

	// Check registration status for all events
	useEffect(() => {
		const checkRegistrations = async () => {
			if (String(user?.role||'').toLowerCase() === 'student' && events.length > 0) {
				const statusMap = {};
				for (const event of events) {
					try {
						const res = await eventsAPI.checkRegistration(event._id);
						statusMap[event._id] = res.data?.isRegistered || false;
					} catch (err) {
						statusMap[event._id] = false;
					}
				}
				setRegistrationStatus(statusMap);
			}
		};
		checkRegistrations();
	}, [events, user]);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData({
			...formData,
			[name]: type === 'checkbox' ? checked : value,
		});
	};

	const handleRoleChange = (role) => {
		setFormData(prev => {
			const rolesArr = toArray(prev.target_roles);
			if (['teacher', 'alumni', 'admin'].includes(creatorRole) && role === 'alumni') {
				return prev;
			}
			return {
				...prev,
				target_roles: rolesArr.includes(role)
					? rolesArr.filter(r => r !== role)
					: [...rolesArr, role]
			};
		});
	};

	const toggleTeacherDept = (dept) => {
		setFormData(prev => {
			const arr = toArray(prev.target_teacher_departments);
			return {
				...prev,
				target_teacher_departments: arr.includes(dept)
					? arr.filter(d => d !== dept)
					: [...arr, dept]
			};
		});
	};

	const addStudentCombination = () => {
		if (lockAudience) return;
		setFormData(prev => ({
			...prev,
			target_student_combinations: [...toArray(prev.target_student_combinations), { department: '', year: '' }]
		}));
	};

	const removeStudentCombination = (index) => {
		if (lockAudience) return;
		setFormData(prev => ({
			...prev,
			target_student_combinations: toArray(prev.target_student_combinations).filter((_, i) => i !== index)
		}));
	};

	const updateStudentCombination = (index, field, value) => {
		if (lockAudience) return;
		setFormData(prev => ({
			...prev,
			target_student_combinations: toArray(prev.target_student_combinations).map((combo, i) =>
				i === index ? { ...combo, [field]: value } : combo
			)
		}));
	};

	const addAlumniCombination = () => {
		if (lockAudience) return;
		setFormData(prev => ({
			...prev,
			target_alumni_combinations: [...toArray(prev.target_alumni_combinations), { department: '', graduation_year: '' }]
		}));
	};

	const removeAlumniCombination = (index) => {
		if (lockAudience) return;
		setFormData(prev => ({
			...prev,
			target_alumni_combinations: toArray(prev.target_alumni_combinations).filter((_, i) => i !== index)
		}));
	};

	const updateAlumniCombination = (index, field, value) => {
		if (lockAudience) return;
	setFormData(prev => ({
			...prev,
			target_alumni_combinations: toArray(prev.target_alumni_combinations).map((combo, i) =>
				i === index ? { ...combo, [field]: value } : combo
			)
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
			target_roles: [],
			target_student_combinations: [],
			target_teacher_departments: [],
			target_alumni_combinations: []
		});
		setEventImage(null);
		setEditingEvent(null);
		setLockAudience(false);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const studentPairs = formData.target_roles.includes('student')
				? toArray(formData.target_student_combinations).filter(c => c.department && c.year !== '')
				: [];
			const teacherDepts = formData.target_roles.includes('teacher')
				? toArray(formData.target_teacher_departments)
				: [];
			// Sanitize for creators who cannot target alumni
		const creatorRoleSubmit = String(user?.role||'').toLowerCase();
		let targetRoles = toArray(formData.target_roles);
		if (['alumni', 'teacher', 'admin'].includes(creatorRoleSubmit)) {
			targetRoles = targetRoles.filter(r => r !== 'alumni');
		}
			const alumniPairs = targetRoles.includes('alumni')
				? toArray(formData.target_alumni_combinations).filter(c => c.department && c.graduation_year !== '')
				: [];

			const eventData = {
				title: formData.title,
				description: formData.description,
				target_roles: targetRoles,
				target_student_combinations: studentPairs,
				target_teacher_departments: teacherDepts,
				target_alumni_combinations: alumniPairs,
				location: formData.isVirtual ? undefined : formData.location,
				startAt: formData.date ? new Date(formData.date).toISOString() : null,
				endAt: formData.endDate ? new Date(formData.endDate).toISOString() : (formData.date ? new Date(formData.date).toISOString() : null),
				image: eventImage
			};

			if (!eventData.startAt || !eventData.endAt) {
				toast.error('Please provide valid start and end date/time');
				return;
			}

			if (toArray(eventData.target_roles).length === 0) {
				toast.error('Please select at least one audience role');
				return;
			}

			if (editingEvent) {
				await eventsAPI.updateEvent(editingEvent._id, eventData);
				toast.success('Event updated successfully');
			} else {
				await eventsAPI.createEvent(eventData);
				toast.success(user.role?.toLowerCase() === 'alumni' ? 'Event submitted for approval' : 'Event created successfully');
			}

			resetForm();
			setShowCreateForm(false);
			fetchAll();
			if (user?.role?.toLowerCase() === 'admin') {
				fetchPendingEvents();
			}
		} catch (error) {
			console.error('Error saving event:', error);
			toast.error(error?.response?.data?.message || 'Failed to save event');
		}
	};

	const canEditEvent = (event) => {
		const organizerId = typeof event?.organizer === 'object' ? event?.organizer?._id : event?.organizer;
		return user && (user._id === organizerId || user.role?.toLowerCase() === 'admin');
	};

	const onEditFromList = (event, lockAud = false) => {
		setEditingEvent(event);
		setLockAudience(lockAud);
		setFormData({
			title: event?.title || '',
			description: event?.description || '',
			date: event?.startAt ? event.startAt.slice(0, 16) : '',
			endDate: event?.endAt ? event.endAt.slice(0, 16) : '',
			location: event?.location || '',
			category: event?.category || 'other',
			isVirtual: event?.isVirtual || false,
			meetingLink: event?.meetingLink || '',
			target_roles: toArray(event?.target_roles),
			target_student_combinations: toArray(event?.target_student_combinations),
			target_teacher_departments: toArray(event?.target_teacher_departments),
			target_alumni_combinations: toArray(event?.target_alumni_combinations)
		});
		setShowCreateForm(true);
	};

	const handleDelete = async (eventId) => {
		if (window.confirm('Are you sure you want to delete this event?')) {
			try {
				await eventsAPI.deleteEvent(eventId);
				toast.success('Event deleted successfully');
				fetchAll();
				if (user?.role?.toLowerCase() === 'admin') {
					fetchPendingEvents();
				}
			} catch (error) {
				console.error('Error deleting event:', error);
				toast.error('Failed to delete event');
			}
		}
	};

	const handleApproveEvent = async (eventId) => {
		try {
			await eventsAPI.approveEvent(eventId);
			toast.success('Event approved successfully');
			fetchPendingEvents();
			fetchAll();
		} catch (error) {
			console.error('Error approving event:', error);
			toast.error('Failed to approve event');
		}
	};

	const handleRejectEvent = async (eventId) => {
		if (window.confirm('Are you sure you want to reject this event?')) {
			try {
				await eventsAPI.rejectEvent(eventId);
				toast.success('Event rejected successfully');
				fetchPendingEvents();
			} catch (error) {
				console.error('Error rejecting event:', error);
				toast.error('Failed to reject event');
			}
		}
	};

	const renderEventCard = (event, lockAudEdit = false) => {
		const title = event?.title || '';
		const startStr = safeFormat(event?.startAt || event?.date, 'PPP');
		const timeStr = safeFormat(event?.startAt || event?.date, 'p');
		const organizerName = typeof event?.organizer === 'object' ? (event?.organizer?.name || 'Unknown') : 'Unknown';
		const isMyEvent = user && (String(user._id) === String(typeof event?.organizer === 'object' ? event?.organizer?._id : event?.organizer));

		return (
			<div key={event?._id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
				<div className="relative">
					{event?.imageUrl ? (
						<img src={event.imageUrl} alt={title} className="w-full h-48 object-cover" />
					) : (
						<div className="w-full h-48 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center">
							<span className="text-white text-lg font-medium text-center px-4">{title}</span>
						</div>
					)}
					<div className="absolute top-4 left-4">
						<span className={`px-3 py-1 text-xs font-semibold rounded-full ${
							event?.status === 'active' || event?.approved ? 'bg-green-100 text-green-800' :
							event?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
							'bg-red-100 text-red-800'
						}`}>
							{event?.status === 'active' || event?.approved ? 'Active' :
							 event?.status === 'pending' ? 'Pending Approval' : 'Rejected'}
						</span>
					</div>
					{canEditEvent(event) && (
						<div className="absolute top-4 right-4 flex space-x-2">
							<button onClick={() => onEditFromList(event, lockAudEdit)} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
								<FiEdit size={14} />
							</button>
							<button onClick={() => handleDelete(event?._id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
								<FiTrash2 size={14} />
							</button>
						</div>
					)}
				</div>

				<div className="p-6">
					{isMyEvent && creatorRole === 'alumni' && (event?.status === 'pending' || !event?.approved) && (
						<div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 text-sm flex items-center gap-2">
							<FiClock size={16} />
							<span>Your event has been sent to the admin for approval. It will notify your audience once approved.</span>
						</div>
					)}
					<div className="flex justify-between items-start mb-3">
						<h3 className="text-xl font-bold text-gray-900 line-clamp-2">{title}</h3>
						<span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full capitalize">
							{event?.category || 'other'}
						</span>
					</div>

					<div className="space-y-2 text-sm text-gray-600 mb-4">
						<div className="flex items-center">
							<FiCalendar className="mr-2 text-indigo-500" />
							{(startStr && timeStr) ? `${startStr} at ${timeStr}` : 'Date TBD'}
						</div>
						<div className="flex items-center">
							{event?.isVirtual ? (
								<>
									<FiLink className="mr-2 text-indigo-500" />
									Virtual Event
								</>
							) : (
								<>
									<FiMapPin className="mr-2 text-indigo-500" />
									{event?.location || 'On Campus'}
								</>
							)}
						</div>
						<div className="flex items-center">
							<FiUsers className="mr-2 text-indigo-500" />
							Organized by {organizerName}
						</div>
					</div>

					<p className="text-gray-700 line-clamp-3 mb-6">{event?.description || ''}</p>

					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
						<Link to={`/events/${event?._id}`} className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
							View Details →
						</Link>
						<div className="flex items-center gap-2 flex-wrap">
							{event?.registrationCount > 0 && (
								<Link to={`/events/${event?._id}/registrations`} className="text-sm text-gray-600 flex items-center">
									<FiUsers className="mr-1" size={14} />
									{event.registrationCount} registered
								</Link>
							)}
							{user && String(user?.role||'').toLowerCase() === 'student' && (event?.status === 'active' || event?.approved) && (
								registrationStatus[event?._id] ? (
									<button 
										disabled
										className="px-4 py-2 bg-green-100 text-green-700 rounded-lg cursor-not-allowed flex items-center gap-1"
									>
										<FiCheck size={16} />
										Registered
									</button>
								) : (
									<Link
										to={`/events/${event?._id}`}
										className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
									>
										Register Now
									</Link>
								)
							)}
						</div>
					</div>
				</div>
			</div>
		);
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
		<div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
			<div className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-6 sm:mb-8 shadow-xl">
				<div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-90" />
				<img src="https://images.unsplash.com/photo-1551836022-deb4988cc6c7?q=80&w=1200&auto=format&fit=crop" alt="events" className="w-full h-48 sm:h-64 object-cover" />
				<div className="absolute inset-0 flex items-center px-4 sm:px-6">
					<div>
						<h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-1 sm:mb-2">Events</h1>
						<p className="text-sm sm:text-lg text-white/90 font-medium">Discover networking events, workshops, and more</p>
					</div>
				</div>
			</div>

			<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 px-2">
				<div>
					<h2 className="text-3xl font-bold text-gray-900">Explore Events</h2>
          <p className="mt-1 text-gray-600">All Events vs {String(user?.role||'').toLowerCase()==='student' ? 'My Attended Events' : 'My Created Events'}.</p>
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
							Show upcoming only
						</label>
					</div>

					{canCreateContent() && (
						<button
							onClick={() => {
								setShowCreateForm(!showCreateForm);
								resetForm();
							}}
							className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to purple-600 text-white font-semibold rounded-lg shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
						>
							{showCreateForm ? 'Cancel' : 'Create Event'}
						</button>
					)}
				</div>
			</div>

			{/* Tabs */}
			<div className="mb-6 border-b border-gray-200 overflow-x-auto">
				<nav className="-mb-px flex space-x-4 sm:space-x-8 px-2">
					<button
						onClick={() => setActiveTab('all')}
						className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'all' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
					>
						All Events
					</button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'mine' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            {String(user?.role||'').toLowerCase() === 'student' ? `My Attended Events (${attendedEvents.length})` : `My Created Events (${myEvents.length})`}
          </button>
					{user?.role?.toLowerCase() === 'admin' && (
						<button
							onClick={() => setActiveTab('pending')}
							className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
						>
							Pending Approval ({pendingEvents.length})
						</button>
					)}
				</nav>
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

							<div className="lg:col-span-2">
								<label className="block text-sm font-semibold text-gray-700 mb-4">
									<FiUsers className="inline mr-1" />
									Target Audience
								</label>

								<div className="mb-6">
									<label className="block text-sm font-medium text-gray-600 mb-3">Select Target Roles (Multiple allowed)</label>
									<div className="flex flex-wrap gap-4">
										{availableRoles.map(role => (
											<label key={role} className="flex items-center cursor-pointer">
												<input
													type="checkbox"
													disabled={lockAudience}
													checked={toArray(formData.target_roles).includes(role)}
													onChange={() => handleRoleChange(role)}
													className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
												/>
												<span className="ml-2 text-sm text-gray-700 capitalize">{role}</span>
											</label>
										))}
									</div>
								</div>

								{toArray(formData.target_roles).includes('student') && (
									<div className="mb-6">
										<div className="flex items-center justify-between mb-3">
											<label className="block text-sm font-medium text-gray-600">Student Department-Year Combinations</label>
											<button
												type="button"
												disabled={lockAudience}
												onClick={addStudentCombination}
												className="flex items-center px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
											>
												<FiPlus size={14} className="mr-1" />
												Add Combination
											</button>
										</div>
										<div className="space-y-3">
											{toArray(formData.target_student_combinations).map((combo, index) => (
												<div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
													<select
														disabled={lockAudience}
														value={combo.department}
														onChange={(e) => updateStudentCombination(index, 'department', e.target.value)}
														className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
														required
													>
														<option value="">Select Department</option>
														{departments.map(dept => (
															<option key={dept} value={dept}>{dept}</option>
														))}
													</select>
													<select
														disabled={lockAudience}
														value={combo.year}
														onChange={(e) => updateStudentCombination(index, 'year', parseInt(e.target.value))}
														className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
														required
													>
														<option value="">Select Year</option>
														{years.map(year => (
															<option key={year} value={year}>Year {year}</option>
														))}
													</select>
													<button
														type="button"
														disabled={lockAudience}
														onClick={() => removeStudentCombination(index)}
														className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
													>
														<FiMinus size={16} />
													</button>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Teacher departments */}
								{toArray(formData.target_roles).includes('teacher') && (
									<div className="mb-6">
										<label className="block text-sm font-medium text-gray-600 mb-3">Teacher Departments</label>
										<div className="grid grid-cols-2 gap-2">
											{departments.map(dept => (
												<label key={dept} className="flex items-center cursor-pointer">
													<input
														type="checkbox"
														disabled={lockAudience}
														checked={toArray(formData.target_teacher_departments).includes(dept)}
														onChange={() => toggleTeacherDept(dept)}
														className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
													/>
													<span className="ml-2 text-sm text-gray-700">{dept}</span>
												</label>
											))}
										</div>
									</div>
								)}

								{/* Alumni pairs */}
								{toArray(formData.target_roles).includes('alumni') && (
									<div className="mb-6">
										<div className="flex items-center justify-between mb-3">
											<label className="block text-sm font-medium text-gray-600">Alumni Department-Graduation Year Combinations</label>
											<button
												type="button"
												disabled={lockAudience}
												onClick={addAlumniCombination}
												className="flex items-center px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
											>
												<FiPlus size={14} className="mr-1" />
												Add Combination
											</button>
										</div>
										<div className="space-y-3">
											{toArray(formData.target_alumni_combinations).map((combo, index) => (
												<div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
													<select
														disabled={lockAudience}
														value={combo.department}
														onChange={(e) => updateAlumniCombination(index, 'department', e.target.value)}
														className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
														required
													>
														<option value="">Select Department</option>
														{departments.map(dept => (
															<option key={dept} value={dept}>{dept}</option>
														))}
													</select>
													<select
														disabled={lockAudience}
														value={combo.graduation_year}
														onChange={(e) => updateAlumniCombination(index, 'graduation_year', parseInt(e.target.value))}
														className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
														required
													>
														<option value="">Select Graduation Year</option>
														{graduationYears.map(year => (
															<option key={year} value={year}>{year}</option>
														))}
													</select>
													<button
														type="button"
														disabled={lockAudience}
														onClick={() => removeAlumniCombination(index)}
														className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
													>
														<FiMinus size={16} />
													</button>
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							<div className="lg:col-span-2">
								<label className="block text-sm font-semibold text-gray-700 mb-2">Event Image</label>
								<FileInput accept="image/*" onChange={setEventImage} />
								{eventImage && (
									<div className="mt-2 text-sm text-green-600">✓ Image selected: {eventImage.name}</div>
								)}
							</div>
						</div>

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

			{/* All Events */}
			{activeTab === 'all' && (
				<>
					{(!events || events.length === 0) ? (
						<div className="text-center py-12">
							<h3 className="text-lg font-medium text-gray-900">No events found</h3>
							<p className="mt-2 text-gray-600">
								{showUpcoming ? 'There are no upcoming events scheduled.' : 'No events have been created yet.'}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
							{events.map(e => renderEventCard(e, false))}
						</div>
					)}
				</>
			)}

      {/* My Created/Attended Events */}
			{activeTab === 'mine' && (
				<>
          {String(user?.role||'').toLowerCase()==='student' ? (
            (!attendedEvents || attendedEvents.length === 0) ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900">No attended events</h3>
                <p className="mt-2 text-gray-600">You haven't attended any events yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {attendedEvents.map(e => renderEventCard(e, false))}
              </div>
            )
          ) : (
            (!myEvents || myEvents.length === 0) ? (
						<div className="text-center py-12">
							<h3 className="text-lg font-medium text-gray-900">No created events</h3>
							<p className="mt-2 text-gray-600">You haven't created any events yet.</p>
						</div>
            ) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
							{myEvents.map(e => renderEventCard(e, true))}
						</div>
            )
          )}
				</>
			)}

			{/* Pending (Admin) */}
			{activeTab === 'pending' && user?.role?.toLowerCase() === 'admin' && (
				<>
					{(!pendingEvents || pendingEvents.length === 0) ? (
						<div className="text-center py-12">
							<h3 className="text-lg font-medium text-gray-900">No pending events</h3>
							<p className="mt-2 text-gray-600">All events have been reviewed.</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
							{pendingEvents.map(event => (
								<div key={event?._id} className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-yellow-200">
									<div className="relative">
										{event?.imageUrl ? (
											<img src={event.imageUrl} alt={event?.title} className="w-full h-48 object-cover" />
										) : (
											<div className="w-full h-48 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center">
												<span className="text-white text-lg font-medium text-center px-4">{event?.title}</span>
											</div>
										)}
										<div className="absolute top-4 left-4">
											<span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
												Pending Approval
											</span>
										</div>
									</div>

									<div className="p-6">
										<h3 className="text-xl font-bold text-gray-900 mb-3">{event?.title}</h3>
										<p className="text-gray-700 line-clamp-3 mb-4">{event?.description}</p>

										<div className="space-y-2 text-sm text-gray-600 mb-4">
											<div className="flex items-center">
												<FiUsers className="mr-2 text-indigo-500" />
												Organized by {typeof event?.organizer === 'object' ? event?.organizer?.name : 'Unknown'}
											</div>
											<div className="flex items-center">
												<FiCalendar className="mr-2 text-indigo-500" />
												{safeFormat(event?.startAt, 'PPP p')}
											</div>
										</div>

										<div className="flex justify-between items-center">
											<Link to={`/events/${event?._id}`} className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
												View Details →
											</Link>
											<div className="flex space-x-2">
												<button
													onClick={() => handleApproveEvent(event?._id)}
													className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
												>
													<FiCheck className="mr-1" size={16} />
													Approve
												</button>
												<button
													onClick={() => handleRejectEvent(event?._id)}
													className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
												>
													<FiX className="mr-1" size={16} />
													Reject
												</button>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default EventsPage;