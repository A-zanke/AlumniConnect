import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/ui/Spinner";
import { toast } from "react-toastify";
import { connectionAPI, fetchMessages, userAPI } from "../components/utils/api";
import { io } from "socket.io-client";
import axios from "axios";
import { getAvatarUrl } from "../components/utils/helpers";
import {
  FiSend,
  FiImage,
  FiSmile,
  FiMoreVertical,
  FiSearch,
  FiVideo,
  FiPhone,
  FiArrowLeft,
  FiCornerUpLeft,
  FiTrash2,
  FiFlag,
  FiUserX,
  FiX,
  FiCheck,
} from "react-icons/fi";
import Picker from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";

// Custom CSS for better scrolling
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  .message-bubble {
    word-wrap: break-word;
    word-break: break-word;
  }
`;

const MessagesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const messageContainerRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [presenceData, setPresenceData] = useState({});
  const [isTypingTimeout, setIsTypingTimeout] = useState(null);
  const fileInputRef = useRef(null);

  // New UI/feature states
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [activeReactionFor, setActiveReactionFor] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [sharedMedia, setSharedMedia] = useState([]);
  const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || baseURL;
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("media"); // media | links | docs
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);
  const [openMessageMenuFor, setOpenMessageMenuFor] = useState(null); // messageId
  const messageMenuRef = useRef(null);
  const headerMenuRef = useRef(null);
  const reactionMenuRef = useRef(null);

  // Load conversations + merge with connections (for names/avatars/presence)
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const [convResp, connResp] = await Promise.all([
          axios.get(`${baseURL}/api/messages`, { headers: { Authorization: `Bearer ${token}` } }),
          connectionAPI.getConnections().catch(() => ({ data: [] })),
        ]);
        const convList = Array.isArray(convResp?.data?.data) ? convResp.data.data : [];
        const rawConnections = Array.isArray(connResp?.data) ? connResp.data : [];

        const map = new Map();
        convList.forEach((item) => {
          if (!item?.user?._id) return;
          map.set(String(item.user._id), {
            _id: String(item.user._id),
            user: item.user,
            lastMessage: item.lastMessage || "",
            lastMessageTime: item.lastMessageTime || null,
          });
        });
        rawConnections.forEach((u) => {
          const uid = String(u?._id || u?.id || "");
          if (!uid) return;
          if (!map.has(uid)) {
            map.set(uid, {
              _id: uid,
              user: {
                _id: uid,
                name: u.name || u.fullName || u.username || "Unknown",
                username: u.username || "user",
                avatarUrl: u.avatarUrl || u.avatar || null,
                isOnline: u.isOnline,
                lastSeen: u.lastSeen,
              },
              lastMessage: "",
              lastMessageTime: null,
            });
          } else {
            const entry = map.get(uid);
            entry.user = {
              ...entry.user,
              name: entry.user?.name || u.name || u.fullName || u.username || "Unknown",
              username: entry.user?.username || u.username || "user",
              avatarUrl: entry.user?.avatarUrl || u.avatarUrl || u.avatar || null,
              isOnline: entry.user?.isOnline ?? u.isOnline,
              lastSeen: entry.user?.lastSeen ?? u.lastSeen,
            };
          }
        });
        const merged = Array.from(map.values()).sort((a, b) => {
          const at = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bt = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bt - at;
        });
        setConnections(merged);
        if (merged.length > 0 && !selectedUser) {
          setSelectedUser(merged[0].user);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token");
      const s = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ["websocket"] });

      s.on("connect", () => {
        console.log("Connected to server");
        // Set user as online when connected
        userAPI.updatePresence(true);
      });

      s.on("disconnect", () => {
        console.log("Disconnected from server");
        // Set user as offline when disconnected
        userAPI.updatePresence(false);
      });

      const handleIncoming = (msg) => {
        const id = msg._id || msg.id;
        if (id && seenIdsRef.current.has(String(id))) return;
        if (
          (msg.from === selectedUser?._id && msg.to === user._id) ||
          (msg.from === user._id && msg.to === selectedUser?._id)
        ) {
          if (id) seenIdsRef.current.add(String(id));
          setMessages((prev) => [
            ...prev,
            {
              id: id,
              senderId: msg.from,
              recipientId: msg.to,
              content: msg.content,
              attachments: msg.attachments || [],
              timestamp: msg.createdAt,
            },
          ]);
          // Scroll to bottom when receiving new message
          setTimeout(scrollToBottom, 100);
        }
      };
      s.on("chat:receive", handleIncoming);
      s.on("receiveMessage", handleIncoming);

      // reactions
      s.on("messageReacted", ({ messageId, reactions }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, reactions: reactions || [] } : m
          )
        );
      });

      // deletions
      s.on("messageDeleted", (payload) => {
        if (payload?.messageId) {
          setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
        } else if (payload?.messageIds) {
          const ids = new Set(payload.messageIds.map(String));
          setMessages((prev) => prev.filter((m) => !ids.has(String(m.id))));
        } else if (payload?.chatCleared && payload?.userId === selectedUser?._id) {
          setMessages([]);
        }
      });

      // Typing indicator events
      s.on("typing:update", ({ from, typing }) => {
        if (from !== user._id && selectedUser && from === selectedUser._id) {
          setTypingUser(selectedUser.name);
          setIsTyping(!!typing);
          if (isTypingTimeout) clearTimeout(isTypingTimeout);
          const timeout = setTimeout(() => {
            setIsTyping(false);
            setTypingUser(null);
          }, 2500);
          setIsTypingTimeout(timeout);
        }
      });

      setSocket(s);
      return () => {
        s.disconnect();
        if (isTypingTimeout) {
          clearTimeout(isTypingTimeout);
        }
      };
    }
  }, [user, selectedUser, isTypingTimeout]);

  // Auto-scroll to the bottom of messages
  useEffect(() => {
    if (messageContainerRef.current) {
      const scrollToBottom = () => {
        messageContainerRef.current.scrollTop =
          messageContainerRef.current.scrollHeight;
      };

      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages]);

  // Auto-scroll when new message is added
  const scrollToBottom = useCallback(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, []);

  const fetchMessagesData = useCallback(async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const data = await fetchMessages(selectedUser._id);
      setMessages(Array.isArray(data) ? data : []);
      // also fetch shared media previews
      try {
        const token = localStorage.getItem("token");
        const resp = await axios.get(`${baseURL}/api/messages/media/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSharedMedia(resp?.data?.media || []);
      } catch {}
      setError(null);
    } catch (err) {
      setError("Failed to fetch messages");
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    fetchMessagesData();
  }, [fetchMessagesData]);

  // Remove theme toggle per request (keep class intact)

  // Global click-outside listeners for menus
  useEffect(() => {
    const handler = (e) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(e.target)) {
        setOpenMessageMenuFor(null);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setOpenHeaderMenu(false);
      }
      if (reactionMenuRef.current && !reactionMenuRef.current.contains(e.target)) {
        setActiveReactionFor(null);
      }
      if (showEmojiPicker) setShowEmojiPicker(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showEmojiPicker]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if ((!newMessage.trim() && !selectedImage) || !selectedUser) return;

    try {
      // Build multipart form to support reply and image
      const formData = new FormData();
      formData.append("content", newMessage);
      if (selectedImage) formData.append("image", selectedImage);
      if (replyTo?.id) formData.append("replyToId", replyTo.id);

      const token = localStorage.getItem("token");
      const resp = await axios.post(`${baseURL}/api/messages/${selectedUser._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
      });
      const messageData = resp.data;

      // De-duplication: if the socket event already added this message,
      // skip adding it again from the HTTP response.
      const idStr = messageData?.id ? String(messageData.id) : null;
      if (!idStr || !seenIdsRef.current.has(idStr)) {
        if (idStr) seenIdsRef.current.add(idStr);
        setMessages((prev) => [...prev, messageData]);
      }

      // Clear input and image
      setNewMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      setReplyTo(null);

      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (socket && selectedUser) {
      socket.emit("typing", {
        userId: user._id,
        userName: user.name,
        recipientId: selectedUser._id,
      });

      if (isTypingTimeout) clearTimeout(isTypingTimeout);
      const timeout = setTimeout(() => {
        socket.emit("stop_typing", { userId: user._id, recipientId: selectedUser._id });
      }, 900);
      setIsTypingTimeout(timeout);
    }
  };

  const toggleMessageSelection = (id) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async (scope = "me") => {
    try {
      const ids = Array.from(selectedMessageIds);
      if (ids.length === 0) return;
      const token = localStorage.getItem("token");
      await axios.delete(`${baseURL}/api/messages/bulk-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { messageIds: ids, for: scope },
      });
      setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
      setSelectedMessageIds(new Set());
      setSelectionMode(false);
    } catch (e) {
      toast.error("Failed to delete messages");
    }
  };

  const handleDeleteSingle = async (id, scope = "me") => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${baseURL}/api/messages/${id}?for=${scope}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      toast.error("Failed to delete message");
    }
  };

  const handleReact = async (id, emoji) => {
    try {
      const token = localStorage.getItem("token");
      const resp = await axios.post(
        `${baseURL}/api/messages/react`,
        { messageId: id, emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, reactions: resp.data.reactions } : m))
      );
    } catch (e) {
      toast.error("Failed to react");
    }
  };

  const handleReport = async () => {
    try {
      const reason = prompt("Report reason?") || "";
      const token = localStorage.getItem("token");
      await axios.post(
        `${baseURL}/api/messages/report`,
        { targetUserId: selectedUser._id, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Reported to admin");
      setShowMenu(false);
    } catch (e) {
      toast.error("Failed to report");
    }
  };

  const handleBlockToggle = async (block = true) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${baseURL}/api/messages/block`,
        { targetUserId: selectedUser._id, action: block ? "block" : "unblock" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(block ? "User blocked" : "User unblocked");
      setShowMenu(false);
    } catch (e) {
      toast.error("Failed to update block");
    }
  };

  const handleDeleteChat = async (scope = "me") => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${baseURL}/api/messages/chat/${selectedUser._id}?for=${scope}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages([]);
      setShowMenu(false);
    } catch (e) {
      toast.error("Failed to delete chat");
    }
  };

  const findMessageById = (id) => messages.find((m) => String(m.id) === String(id));

  const renderHighlighted = (text) => {
    if (!chatSearchQuery) return text;
    try {
      const parts = text.split(new RegExp(`(${chatSearchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "ig"));
      return parts.map((part, i) =>
        part.toLowerCase() === chatSearchQuery.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      );
    } catch {
      return text;
    }
  };

  // Format last seen time
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Unknown";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit is handled by the form's onSubmit; avoid key handlers to prevent duplicates

  if (loading && connections.length === 0) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <style>{customScrollbarStyles}</style>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text-animated">
            Messages
          </h1>
          <p className="text-gray-600 mt-2">
            Connect and chat with your network in real-time
          </p>
        </motion.div>

        <div className="bg-white rounded-none shadow-none overflow-hidden border-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
            {/* Contacts Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${showSidebar ? "flex" : "hidden"} lg:flex bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 flex-col`}
            >
              {/* Search Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {/* Connections List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {connections.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-lg font-medium">No connections yet</p>
                    <p className="text-sm mt-2">
                      Connect with people to start conversations
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {connections
                      .filter(
                        (conn) =>
                          (conn.user?.name || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          (conn.user?.username || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                      )
                      .map((connection, index) => (
                        <motion.div
                          key={connection._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => {
                            setSelectedUser(connection.user);
                            setShowSidebar(false);
                          }}
                          className={`cursor-pointer p-4 rounded-2xl m-2 transition-all.duration-200 ${
                            selectedUser?._id === connection.user?._id
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                              : "hover:bg-white hover:shadow-md hover:scale-105"
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="relative">
                              <img
                                src={connection.user?.avatarUrl ? getAvatarUrl(connection.user.avatarUrl) : "/default-avatar.png"}
                                alt={connection.user?.name}
                                className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                              />
                              {connection.user?.isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                              )}
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold truncate ${
                                  selectedUser?._id === connection.user?._id
                                    ? "text-white"
                                    : "text-gray-900"
                                }`}
                              >
                                {connection.user?.name}
                              </p>
                              <p
                                className={`text-xs truncate ${
                                  selectedUser?._id === connection.user?._id
                                    ? "text-blue-100"
                                    : "text-gray-500"
                                }`}
                              >
                                @{connection.user?.username}
                              </p>
                              <p className={`text-xs mt-1 truncate ${selectedUser?._id === connection.user?._id ? "text-blue-100" : "text-gray-500"}`}>
                                {connection.lastMessage || ""}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Chat Area */}
            <div className={`${showSidebar ? "hidden" : "flex"} lg:flex lg:col-span-2 flex-col h-full`}
                 style={{minHeight: 'calc(100vh - 6rem)'}}>
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {/* Mobile back */}
                        <button
                          className="mr-3 lg:hidden p-2 rounded-full hover:bg-white/60"
                          onClick={() => setShowSidebar(true)}
                        >
                          <FiArrowLeft />
                        </button>
                        <div className="relative">
                          {selectedUser.avatarUrl ? (
                            <img
                              src={
                                selectedUser.avatarUrl
                                  ? getAvatarUrl(selectedUser.avatarUrl)
                                  : "/default-avatar.png"
                              }
                              alt={selectedUser.name}
                              className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <img
                              src="/default-avatar.png"
                              alt={selectedUser.name}
                              className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          )}
                        </div>

                        <div className="ml-4">
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedUser.name}
                          </p>
                          <p className="text-sm text-gray-500">
            {((presenceData[selectedUser._id]?.isOnline) ?? (selectedUser.isOnline))
                              ? "Online"
                              : `Last seen ${formatLastSeen(
                                  (presenceData[selectedUser._id]?.lastSeen) ?? (selectedUser.lastSeen)
                                )}`}
                          </p>
                          {isTyping && typingUser && (
                            <div className="text-sm text-blue-500 italic flex items-center gap-1">
                              <span className="inline-flex gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                              </span>
                              typing
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Right panel toggle removed per request */}
                        {/* Chat search */}
                        <div className="hidden md:flex items-center relative mr-2">
                          <FiSearch className="absolute left-3 text-gray-400" />
                          <input
                            value={chatSearchQuery}
                            onChange={(e) => setChatSearchQuery(e.target.value)}
                            placeholder="Search in chat"
                            className="pl-9 pr-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="relative" ref={headerMenuRef}>
                          <button
                            onClick={() => setOpenHeaderMenu((v) => !v)}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                          >
                            <FiMoreVertical className="text-gray-600" />
                          </button>
                          {openHeaderMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1e1e1e] border shadow-xl rounded-xl z-20">
                              <button
                                onClick={() => setSelectionMode((v) => !v)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50"
                              >
                                {selectionMode ? "Cancel selection" : "Select messages"}
                              </button>
                              <button
                                onClick={() => handleBlockToggle(true)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50"
                              >
                                Block user
                              </button>
                              <button
                                onClick={handleReport}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50"
                              >
                                Report user
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Messages */}
                  <div
                    ref={messageContainerRef}
                    className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-white to-gray-50 custom-scrollbar min-h-0"
                    style={{ maxHeight: "calc(100vh - 20rem)" }}
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <div className="text-6xl mb-4">💭</div>
                        <p className="text-xl font-medium">
                          Start the conversation
                        </p>
                        <p className="text-sm mt-2">
                          Send a message to begin chatting with{" "}
                          {selectedUser.name}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {messages.map((message, index) => (
                            <motion.div
                              key={message.id || index}
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{ duration: 0.3 }}
                              className={`flex ${
                                message.senderId === user._id
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[70%] ${
                                  message.senderId === user._id
                                    ? "order-2"
                                    : "order-1"
                                }`}
                              >
                                <div
                                  className={`rounded-3xl px-6 py-4 shadow-lg message-bubble smooth-transition ${
                                    message.senderId === user._id
                                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                      : "bg-white text-gray-800 border border-gray-200"
                                  }`}
                                >
                                  {/* Selection checkbox */}
                                  {selectionMode && (
                                    <div className={`mb-2 ${message.senderId === user._id ? "text-blue-100" : "text-gray-400"}`}>
                                      <label className="inline-flex items-center gap-2 text-xs">
                                        <input
                                          type="checkbox"
                                          className="accent-blue-600"
                                          checked={selectedMessageIds.has(message.id)}
                                          onChange={() => toggleMessageSelection(message.id)}
                                        />
                                        Select
                                      </label>
                                    </div>
                                  )}

                                  {/* Reply preview within bubble */}
                                  {message.replyTo?.id && (
                                    <div className={`mb-2 p-2 rounded-xl ${message.senderId === user._id ? "bg-white/10" : "bg-gray-100"}`}>
                                      <div className="text-xs opacity-70 mb-1">Replying to</div>
                                      <div className="text-xs line-clamp-2">
                                        {findMessageById(message.replyTo.id)?.content || "Media"}
                                      </div>
                                    </div>
                                  )}

                                  {message.content && (
                                    <p className="text-sm leading-relaxed">
                                      {renderHighlighted(message.content)}
                                    </p>
                                  )}
                                  {message.attachments &&
                                    message.attachments.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {message.attachments.map(
                                          (attachment, idx) =>
                                            attachment.startsWith("/forum/") ? (
                                              <a
                                                key={idx}
                                                href={attachment}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  window.location.href =
                                                    attachment;
                                                }}
                                                className="block p-3 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors"
                                              >
                                                <div className="text-sm font-semibold text-blue-800">
                                                  Forum Post
                                                </div>
                                                <div className="text-xs text-blue-700 opacity-80">
                                                  Tap to open the original post
                                                </div>
                                              </a>
                                            ) : (
                                              <img
                                                key={idx}
                                                src={attachment}
                                                alt="Message attachment"
                                                onClick={() => setLightboxSrc(attachment)}
                                                className="max-w-full h-auto rounded-2xl shadow-md cursor-zoom-in hover:opacity-90 transition"
                                              />
                                            )
                                        )}
                                      </div>
                                    )}
                                  {/* Reactions (stick to bottom-right) */}
                                  <div className={`mt-2 flex items-end ${message.senderId === user._id ? "justify-end" : "justify-start"}`}>
                                    <div className="relative" ref={reactionMenuRef}>
                                      <div className="flex items-center gap-2 text-xs opacity-80 ${message.senderId === user._id ? 'justify-end' : 'justify-start'}">
                                        {message.reactions && message.reactions.length > 0 && (
                                          <div className="inline-flex bg-black/5 dark:bg-white/10 rounded-full px-2 py-0.5">
                                            {message.reactions.map((r, i) => (
                                              <span key={i} className="mr-1 select-none">
                                                {r.emoji}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <button
                                          className="text-xs opacity-60 hover:opacity-100"
                                          onClick={() => setActiveReactionFor((v) => (v === message.id ? null : message.id))}
                                          title="Add reaction"
                                        >
                                          😀
                                        </button>
                                        <button
                                          title="Reply"
                                          onClick={() => setReplyTo({ id: message.id })}
                                          className="text-xs opacity-60 hover:opacity-100"
                                        >
                                          <FiCornerUpLeft />
                                        </button>
                                        <div className="relative inline-block" ref={messageMenuRef}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenMessageMenuFor((id) => (id === message.id ? null : message.id));
                                            }}
                                            className="text-xs opacity-60 hover:opacity-100"
                                            title="More"
                                          >
                                            ···
                                          </button>
                                          {openMessageMenuFor === message.id && (
                                            <div className={`absolute ${message.senderId === user._id ? 'right-0' : 'left-0'} mt-2 w-40 bg-white dark:bg-[#1e1e1e] border shadow-xl rounded-xl z-20`}
                                            >
                                              <button
                                                onClick={() => { setReplyTo({ id: message.id }); setOpenMessageMenuFor(null); }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                              >
                                                Reply
                                              </button>
                                              <button
                                                onClick={() => { navigator.clipboard.writeText(message.content || ''); setOpenMessageMenuFor(null); }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                              >
                                                Copy
                                              </button>
                                              <button
                                                onClick={() => { handleDeleteSingle(message.id, 'me'); setOpenMessageMenuFor(null); }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
                                              >
                                                Delete for me
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {activeReactionFor === message.id && (
                                        <div className="absolute -top-12 right-0 bg-white dark:bg-[#1e1e1e] border rounded-xl shadow-lg px-2 py-1 flex gap-2 z-30">
                                          {"👍❤️😂😮😢😡".split("").map((emo, i) => (
                                            <button
                                              key={i}
                                              onClick={() => {
                                                // toggle reaction: if already mine with same emoji, remove
                                                const mine = (message.reactions || []).find((r) => String(r.userId) === String(user._id));
                                                const emoji = mine && mine.emoji === emo ? "" : emo;
                                                handleReact(message.id, emoji);
                                                setActiveReactionFor(null);
                                              }}
                                              className="hover:scale-110 transition"
                                            >
                                              {emo}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p
                                    className={`text-xs mt-2 ${
                                      message.senderId === user._id
                                        ? "text-blue-100"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {new Date(
                                      message.timestamp
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                {/* No extra under-bubble actions per prompt; managed via menu */}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Right panel (Media/Links/Docs) - removed per request */}
                  {false && (
                    <div className="border-t border-gray-200 bg-white dark:bg-[#121212] p-3">
                      <div className="flex items-center gap-3 mb-3">
                        <button className={`px-3 py-1 rounded-xl ${rightPanelTab==='media'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setRightPanelTab('media')}>Media</button>
                        <button className={`px-3 py-1 rounded-xl ${rightPanelTab==='links'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setRightPanelTab('links')}>Links</button>
                        <button className={`px-3 py-1 rounded-xl ${rightPanelTab==='docs'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setRightPanelTab('docs')}>Docs</button>
                      </div>
                      <div className="max-h-56 overflow-y-auto custom-scrollbar">
                        {rightPanelTab==='media' && (
                          <div className="grid grid-cols-3 gap-2">
                            {sharedMedia.length === 0 ? <div className="text-sm text-gray-500">No media yet</div> : sharedMedia.map((src, i)=> (
                              <img key={i} src={src} alt="m" onClick={()=>setLightboxSrc(src)} className="w-full h-24 object-cover rounded-lg shadow" />
                            ))}
                          </div>
                        )}
                        {rightPanelTab==='links' && (
                          <div className="space-y-2">
                            {messages.filter(m=>/https?:\/\//i.test(m.content||'')).map((m,i)=>{
                              const links = (m.content.match(/https?:[^\s]+/g)||[]);
                              return links.map((lnk, idx)=> (
                                <a key={`${i}-${idx}`} href={lnk} target="_blank" rel="noreferrer" className="block p-2 rounded-lg bg-gray-50 hover:bg-gray-100 truncate">{lnk}</a>
                              ));
                            })}
                          </div>
                        )}
                        {rightPanelTab==='docs' && (
                          <div className="space-y-2">
                            {messages.flatMap(m=> (m.attachments||[]).filter(a=>/\.(pdf|docx?|pptx?)$/i.test(a)).map((doc)=>({id:m.id, doc}))).length===0 ? (
                              <div className="text-sm text-gray-500">No documents</div>
                            ) : (
                              messages.flatMap(m=> (m.attachments||[]).filter(a=>/\.(pdf|docx?|pptx?)$/i.test(a)).map((doc)=>({id:m.id, doc}))).map((d,i)=> (
                                <a key={i} href={d.doc} className="block p-2 rounded-lg bg-gray-50 hover:bg-gray-100 truncate" download>
                                  {d.doc.split('/').pop()}
                                </a>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message Input */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border-t border-gray-200 bg-white flex-shrink-0"
                  >
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mb-4 relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-xs h-32 object-cover rounded-2xl shadow-md"
                        />
                        <button
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors duration-200"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Reply banner */}
                    {replyTo?.id && (
                      <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-start justify-between">
                        <div>
                          <div className="text-xs font-semibold text-blue-700 mb-1">Replying to</div>
                          <div className="text-xs text-blue-800 line-clamp-2">
                            {findMessageById(replyTo.id)?.content || "Media"}
                          </div>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="text-blue-600 hover:text-blue-800">
                          <FiX />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-end gap-3 sticky bottom-0">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={handleTyping}
                          placeholder="Type a message... (Press Enter to send)"
                          className="w-full px-6 py-4 pr-12 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors duration-200"
                          >
                            <FiImage className="text-lg" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker((v) => !v)}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors duration-200"
                          >
                            <FiSmile className="text-lg" />
                          </button>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx" onChange={handleImageSelect} className="hidden" />
                        {showEmojiPicker && (
                          <div className="absolute bottom-full right-0 mb-2 z-20">
                            <Picker
                              onEmojiClick={(emojiData) => {
                                const emoji = emojiData?.emoji || "";
                                setNewMessage((prev) => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              skinTonesDisabled
                              searchDisabled
                              previewConfig={{ showPreview: false }}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={!newMessage.trim() && !selectedImage}
                        className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        <FiSend className="text-lg" />
                      </button>
                    </form>

                    {selectionMode && (
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div>
                          Selected: {selectedMessageIds.size}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleBulkDelete("me")} className="px-3 py-2 rounded-xl border hover:bg-gray-50">Delete for me</button>
                          <button onClick={() => handleBulkDelete("everyone")} className="px-3 py-2 rounded-xl border text-red-600 hover:bg-red-50">Delete for everyone</button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gradient-to-b from-gray-50 to-white">
                  <div className="text-8xl mb-6">💬</div>
                  <p className="text-2xl font-semibold mb-2">
                    Welcome to Messages
                  </p>
                  <p className="text-lg">
                    Select a conversation to start chatting
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for media */}
      {lightboxSrc && (
        <div className="fixed inset-0 bg-black/80 z-30 flex items-center justify-center" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="media" className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
