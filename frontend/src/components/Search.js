import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { connectionAPI } from '../utils/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FILTERS = [
    { label: 'All', value: 'all', color: 'bg-blue-100 text-blue-700 border-blue-500' },
    { label: 'Alumni', value: 'alumni', color: 'bg-purple-100 text-purple-700 border-purple-500' },
    { label: 'Teacher', value: 'teacher', color: 'bg-green-100 text-green-700 border-green-500' },
    { label: 'Student', value: 'student', color: 'bg-yellow-100 text-yellow-700 border-yellow-500' },
    { label: 'Event', value: 'event', color: 'bg-pink-100 text-pink-700 border-pink-500' },
    { label: 'Post', value: 'post', color: 'bg-cyan-100 text-cyan-700 border-cyan-500' },
];

const typeLabels = {
    alumni: 'Alumni',
    teacher: 'Teacher',
    student: 'Student',
    event: 'Event',
    post: 'Post',
};

const typeColors = {
    alumni: 'border-blue-500 bg-blue-50',
    teacher: 'border-green-500 bg-green-50',
    student: 'border-yellow-500 bg-yellow-50',
};

const Search = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [requested, setRequested] = useState({});
    const [connectionStatuses, setConnectionStatuses] = useState({});
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const currentUserId = currentUser?._id;

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (query.trim()) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 400);
        return () => clearTimeout(delayDebounce);
        // eslint-disable-next-line
    }, [query]);

    useEffect(() => {
        const fetchStatuses = async () => {
            if (results.length > 0) {
                const statuses = {};
                await Promise.all(results.map(async (user) => {
                    const res = await connectionAPI.getConnectionStatus(user._id);
                    statuses[user._id] = res.status;
                }));
                setConnectionStatuses(statuses);
            }
        };
        fetchStatuses();
    }, [results]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5000/api/search/users?query=${encodeURIComponent(query)}&excludeId=${currentUserId}`,
                { withCredentials: true }
            );
            setResults(response.data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileClick = (user) => {
        navigate(`/profile/${user._id}`);
    };

    const handleConnect = async (e, userId) => {
        e.stopPropagation(); // Prevent card click
        try {
            if (!userId || userId === currentUserId) {
                toast.error('Invalid user or cannot connect to yourself.');
                return;
            }
            await connectionAPI.sendRequest(userId);
            toast.success('Connection request sent!');
            setConnectionStatuses(prev => ({ ...prev, [userId]: 'pending' }));
        } catch (error) {
            toast.error('Failed to send connection request');
        }
    };

    // Filter results on the frontend by role/type
    const filteredResults = activeFilter === 'all'
        ? results
        : results.filter(user => (user.role || '').toLowerCase() === activeFilter);

    // Group filtered results by role/type
    const groupedResults = filteredResults.reduce((acc, user) => {
        const type = (user.role || '').toLowerCase();
        acc[type] = acc[type] || [];
        acc[type].push(user);
        return acc;
    }, {});

    // Helper for profile image fallback
    const handleImgError = (e) => {
        e.target.onerror = null;
        e.target.src = '/default-avatar.png';
    };

    return (
        <div className="flex flex-col items-center min-h-[60vh] bg-gray-50 py-10 px-2">
            <div className="w-full max-w-2xl flex flex-col items-center mb-8">
                <div className="flex items-center mb-6">
                    <span className="text-3xl mr-2" role="img" aria-label="search">🔍</span>
                    <h1 className="text-3xl font-bold text-blue-900">Search Users</h1>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, username, skills, etc..."
                    className="w-full px-4 py-3 rounded-lg border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg shadow-sm"
                />
                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            className={`px-5 py-2 rounded-full border-2 font-semibold transition-all duration-150 ${f.color} ${activeFilter === f.value ? 'ring-2 ring-offset-2 scale-105' : 'opacity-80 hover:opacity-100'}`}
                            onClick={() => setActiveFilter(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="w-full max-w-4xl">
                {loading && <p className="text-center text-gray-500 text-lg mt-10">Searching...</p>}
                {Object.keys(groupedResults).length > 0 ? (
                    <div className="grid gap-8">
                        {Object.entries(groupedResults).map(([type, users]) => (
                            <div key={type}>
                                <h2 className={`text-2xl font-semibold mb-4 capitalize text-gray-800 border-l-4 pl-3 ${type === 'alumni' ? 'border-purple-500' : type === 'teacher' ? 'border-green-500' : type === 'student' ? 'border-yellow-500' : 'border-blue-500'}`}>{typeLabels[type] || type}</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {users.map((user) => (
                                        <div
                                            key={user._id}
                                            className={`flex items-center border-l-4 bg-white rounded-lg shadow p-4 hover:shadow-lg transition cursor-pointer border-blue-200`}
                                        >
                                            <Link to={`/profile/${user.username}`}>
                                                <img
                                                    src={user.avatarUrl || '/default-avatar.png'}
                                                    alt={user.name}
                                                    onError={handleImgError}
                                                    className="w-16 h-16 rounded-full object-cover border mr-4"
                                                />
                                            </Link>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-blue-800">{user.name} <span className="text-gray-500 text-base">@{user.username}</span></h3>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {user.skills && user.skills.map((skill, idx) => (
                                                        <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{skill}</span>
                                                    ))}
                                                </div>
                                                <p className="text-gray-600 mt-1">
                                                    {user.position || user.department || user.major || ''}
                                                </p>
                                            </div>
                                            <button
                                                className={`ml-4 px-4 py-2 rounded transition ${connectionStatuses[user._id] === 'pending' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                                disabled={connectionStatuses[user._id] === 'pending' || connectionStatuses[user._id] === 'accepted'}
                                                onClick={e => handleConnect(e, user._id)}
                                            >
                                                {connectionStatuses[user._id] === 'pending' ? 'Requested'
                                                    : connectionStatuses[user._id] === 'accepted' ? 'Connected'
                                                    : 'Connect'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    query && !loading && (
                        <p className="text-center text-gray-500 text-lg mt-10">No results found</p>
                    )
                )}
            </div>
        </div>
    );
};

export default Search;