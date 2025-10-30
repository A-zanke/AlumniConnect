import React, { useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Avatar from "./ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { connectionAPI } from "./utils/api";
import axios from "axios";
import { io } from "socket.io-client";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  const socketRef = useRef(null);
  const [pulseBadge, setPulseBadge] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("/api/notifications");
        // Backend returns array directly now
        const notifications = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setItems(notifications);
      } catch (err) {
        console.error('Error loading notifications:', err);
        setItems([]);
      }
    };
    if (user) {
      load();
      // Refresh notifications every 5 minutes as fallback
      const interval = setInterval(load, 300000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Establish socket connection and listeners
  useEffect(() => {
    if (!user) return;

    const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const socket = io(baseURL, {
      auth: { token: localStorage.getItem("token") },
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("notification:new", (notification) => {
      setItems((prev) => [notification, ...prev]);
      setPulseBadge(true);
      setTimeout(() => setPulseBadge(false), 1000); // Reset pulse after 1s

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        const notif = new Notification(
          `New notification from ${notification.sender?.name || "User"}`,
          {
            body: notification.content || notification.type,
            icon: "/favicon.ico", // or appropriate icon
          }
        );
        notif.onclick = () => {
          window.focus();
          navigate("/notifications"); // or relevant page
        };
      }
    });

    socket.on("notificationUpdated", ({ _id, read, type, content, status }) => {
      setItems((prev) =>
        prev.map((item) =>
          item._id === _id ? { ...item, read, type, content, status } : item
        )
      );
    });

    socket.on("notificationDeleted", ({ _id }) => {
      setItems((prev) => prev.filter((item) => item._id !== _id));
    });

    socket.on("notification:read", ({ notificationId }) => {
      setItems((prev) =>
        prev.map((item) =>
          item._id === notificationId ? { ...item, read: true } : item
        )
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, navigate]);

  // Calculate unread count
  const unreadCount = items.filter((item) => !item.read).length;

  const markAllAsRead = async () => {
    try {
      await axios.put("/api/notifications/read-all");
      // Optimistically update local state
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("Error marking all as read", e);
    }
  };

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const goProfile = async (sender, notificationId, notification = null) => {
    // Mark notification as read if it's not already read
    if (
      notificationId &&
      !items.find((item) => item._id === notificationId)?.read
    ) {
      try {
        await axios.put(
          `/api/notifications/${notificationId}/read`,
          {},
          {
            withCredentials: true,
          }
        );
        // Update local state
        setItems((prev) =>
          prev.map((item) =>
            item._id === notificationId ? { ...item, read: true } : item
          )
        );
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Prefer routing to messages when notification relates to a chat/message
    const relatedType = notification?.type || '';
    if (relatedType === 'message' || relatedType === 'chat' || (notification && notification.onModel === 'Message')) {
      navigate('/messages');
    } else if (sender?.username) {
      navigate(`/profile/${sender.username}`);
    } else if (sender?._id) {
      navigate(`/profile/id/${sender._id}`);
    }
    setOpen(false);
  };

  const accept = async (userId) => {
    try {
      await connectionAPI.acceptRequest(userId);
      // Optimistically update the notification
      setItems((prev) =>
        prev.map((n) =>
          n.sender._id === userId && n.type === 'connection_request'
            ? {
                ...n,
                type: 'connection_accepted',
                status: 'accepted',
                content: `You are now connected with ${n.sender?.name || 'User'}`,
                read: true
              }
            : n
        )
      );
    } catch (error) {
      console.error("Error accepting connection request:", error);
    }
  };

  const reject = async (userId) => {
    try {
      await connectionAPI.rejectRequest(userId);
      // Optimistically remove the notification
      setItems((prev) => prev.filter((n) => n.sender._id !== userId));
    } catch (error) {
      console.error("Error rejecting connection request:", error);
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
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full text-xs px-2 py-1 font-bold shadow-lg ${
              pulseBadge ? "animate-pulse" : ""
            }`}
            style={{
              minWidth: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-2xl shadow-2xl bg-white border border-gray-200 z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{unreadCount} new</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-colors"
                    title="Mark all as read"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                items
                  .filter((n) => {
                    const allowedTypes = ['message', 'reaction', 'connection_request', 'comment', 'like', 'post', 'connection_accepted', 'event'];
                    return allowedTypes.includes(n.type);
                  })
                  .map((n) => (
                  <div
                    key={n._id}
                    className={`flex items-start gap-3 p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-200 border-b border-gray-100 last:border-b-0 cursor-pointer ${
                      !n.read ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                    }`}
                    onClick={() => {
                      if (n.type === 'event' && n.link) {
                        navigate(n.link);
                        setOpen(false);
                        return;
                      }
                      if (n.type === 'message' || n.type === 'reaction') {
                        window.location.href = `/messages?user=${n.sender?._id}`;
                      } else {
                        goProfile(n.sender, n._id, n);
                      }
                    }}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        goProfile(n.sender, n._id, n);
                      }}
                      className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                    >
                      <Avatar
                        name={n.sender?.name}
                        avatarUrl={n.sender?.avatarUrl}
                        size={48}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span
                          className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            goProfile(n.sender, n._id, n);
                          }}
                        >
                          {n.sender?.name || "User"}
                        </span>{" "}
                        <span className="text-gray-600">
                          {n.content || n.type}
                        </span>
                        {!n.read && (
                          <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                      {n.type === "connection_request" && n.status !== 'accepted' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-md"
                            onClick={() => accept(n.sender._id)}
                          >
                            ✓ Accept
                          </button>
                          <button
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200"
                            onClick={() => reject(n.sender._id)}
                          >
                            ✗ Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationBell;
