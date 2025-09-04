import React, { useEffect, useRef, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Avatar from './ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { connectionAPI } from './utils/api';
import axios from 'axios';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/notifications');
        // MINIMAL FIX: Backend returns { data: notifications }, so access res.data.data
        setItems(res.data.data || []);
      } catch {
        setItems([]);
      }
    };
    if (user) load();
  }, [user]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const goProfile = (sender) => {
    const username = sender?.username;
    const id = sender?._id;
    if (username) navigate(`/profile/${username}`);
    else if (id) navigate(`/profile/id/${id}`);
    setOpen(false);
  };

  const accept = async (userId) => {
  try {
    await connectionAPI.acceptFollowRequest(userId);
    setItems(prev => prev.filter(n => n.sender._id !== userId));
  } catch (error) {
    console.error('Error accepting connection request:', error);
  }
};

const reject = async (userId) => {
  try {
    await connectionAPI.rejectFollowRequest(userId);
    setItems(prev => prev.filter(n => n.sender._id !== userId));
  } catch (error) {
    console.error('Error rejecting connection request:', error);
  }
};


  return (
    <div ref={ref} className="relative">
      <button
        className="p-2 rounded-full text-gray-700 hover:text-cyan-600 relative"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
      >
        <FiBell size={20} />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-lg bg-white border border-cyan-100 z-50">
          <div className="p-2">
            {items.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">No notifications</div>
            ) : (
              items.map((n) => (
                <div key={n._id} className="flex items-start gap-3 p-3 hover:bg-cyan-50 rounded-lg">
                  <div onClick={() => goProfile(n.sender)} style={{ cursor:'pointer' }}>
                    <Avatar name={n.sender?.name} avatarUrl={n.sender?.avatarUrl} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="text-sm">
                      <span
                        className="font-semibold hover:text-cyan-600 cursor-pointer"
                        onClick={() => goProfile(n.sender)}
                      >
                        {n.sender?.name || 'User'}
                      </span>{' '}
                      <span className="text-gray-600">{typeof n.content === 'string' ? n.content : String(n.content || n.type || '')}</span>
                    </div>
                    {n.type === 'connection_request' && (
                      <div className="mt-2 flex gap-2">
                        <button 
                          className="px-3 py-1 bg-cyan-600 text-white rounded-md text-sm hover:bg-cyan-700" 
                          onClick={() => accept(n.sender._id)}
                        >
                          Accept
                        </button>
                        <button 
                          className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50" 
                          onClick={() => reject(n.sender._id)}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationBell;