import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { connectionAPI } from '../utils/api';
import { toast } from 'react-toastify';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    setIsOpen(false);
  };

  const handleAccept = async (notification) => {
    try {
      await connectionAPI.acceptFollowRequest(notification.relatedId);
      toast.success('Connection request accepted!');
      // Optionally, refresh notifications or update UI
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleReject = async (notification) => {
    try {
      await connectionAPI.rejectFollowRequest(notification.relatedId);
      toast.info('Connection request removed.');
      // Optionally, refresh notifications or update UI
    } catch (error) {
      toast.error('Failed to remove request');
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.type === 'connection_request' || notification.type === 'connection_accepted') {
      return `/profile/${notification.sender.username}`;
    }
    switch (notification.type) {
      case 'message':
        return `/messages/${notification.sender._id}`;
      case 'event_invite':
      case 'event_reminder':
        return `/events/${notification.relatedId}`;
      case 'post_like':
      case 'post_comment':
        return `/posts/${notification.relatedId}`;
      default:
        return '#';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
      >
        <FaBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification._id} className={`block p-4 border-b hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}>
                  <Link
                    to={getNotificationLink(notification)}
                    onClick={() => handleNotificationClick(notification)}
                    className="flex items-start"
                  >
                    <img
                      src={notification.sender.avatarUrl || '/default-avatar.png'}
                      alt={notification.sender.name}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{notification.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <FaCheck className="w-4 h-4 text-blue-500 ml-2" />
                    )}
                  </Link>
                  {notification.type === 'connection_request' && (
                    <div className="flex gap-2 mt-2">
                      {notification.relatedId ? (
                        <>
                          <button className="btn btn-primary btn-xs" onClick={() => handleAccept(notification)}>Accept</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => handleReject(notification)}>Remove</button>
                        </>
                      ) : (
                        <span className="text-xs text-red-500">This request cannot be managed. Please ignore or delete this notification.</span>
                      )}
                    </div>
                  )}
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