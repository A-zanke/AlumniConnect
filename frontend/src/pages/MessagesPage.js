import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Trash2,
  Ban,
  Flag,
  X as LucideX,
  Check,
  CheckCheck,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { createPortal } from "react-dom";
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
  FiArrowLeft,
  FiCornerUpLeft,
  FiTrash2,
  FiFlag,
  FiX,
  FiChevronDown,
  FiStar,
  FiInfo,
  FiCopy,
  FiShare2,
  FiCheckSquare,
  FiCheck,
  FiPhone,
  FiVideo,
  FiPaperclip,
  FiCamera,
  FiMic,
  FiEdit3,
  FiArchive,
  FiVolume2,
  FiVolumeX,
  FiShield,
  FiUserX,
  FiAlertTriangle,
  FiDownload,
  FiExternalLink,
  FiClock,
  FiEye,
  FiUsers,
  FiSettings,
} from "react-icons/fi";
import { BiCheckDouble } from "react-icons/bi";
import {
  BsEmojiSmile,
  BsThreeDotsVertical,
  BsReply,
  BsForward,
  BsStar,
  BsStarFill,
} from "react-icons/bs";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { HiOutlineEmojiHappy } from "react-icons/hi";
import Picker from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";

const MessagesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [unreadByConversationId, setUnreadByConversationId] = useState({});
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
  const [totalUnread, setTotalUnread] = useState(0);
  const typingTimeoutRef = useRef(null);
  const selectedUserRef = useRef(null);
  const fileInputRef = useRef(null);

  // WhatsApp-like UI states
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
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("media");
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);
  const [openMessageMenuFor, setOpenMessageMenuFor] = useState(null);
  const [forwardSource, setForwardSource] = useState(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardSelected, setForwardSelected] = useState(new Set());
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());
  const [lastSelectedChatIndex, setLastSelectedChatIndex] = useState(null);
  const [starredMessages, setStarredMessages] = useState(new Set());
  const [pinnedMessages, setPinnedMessages] = useState(new Set());
  const [blockedUsers, setBlockedUsers] = useState(new Set());
  const [mutedChats, setMutedChats] = useState(new Set());
  const [archivedChats, setArchivedChats] = useState(new Set());
  const [messageInfo, setMessageInfo] = useState(null);
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [reactionsModalFor, setReactionsModalFor] = useState(null);
  const [reactionsModalItems, setReactionsModalItems] = useState([]);
  const [reactionsModalData, setReactionsModalData] = useState(null);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [chatSelectionMode, setChatSelectionMode] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [showUnblockSuccess, setShowUnblockSuccess] = useState(false);

  const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || baseURL;

  // Message status update callback
  const updateMessageStatus = useCallback((messageId, status) => {
    if (!messageId || !status) return;
    setMessages((prev) =>
      prev.map((m) =>
        String(m.id) === String(messageId) ? { ...m, status } : m
      )
    );
  }, []);

  const generateClientKey = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Load conversations + merge with connections
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const [convResp, connResp] = await Promise.all([
          axios.get(`${baseURL}/api/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          connectionAPI.getConnections().catch(() => ({ data: [] })),
        ]);

        const convList = Array.isArray(convResp?.data?.data)
          ? convResp.data.data
          : [];
        const rawConnections = Array.isArray(connResp?.data)
          ? connResp.data
          : [];

        const map = new Map();
        convList.forEach((item) => {
          if (!item?.user?._id) return;
          map.set(String(item.user._id), {
            _id: String(item.user._id),
            user: item.user,
            lastMessage: item.lastMessage || "",
            lastMessageTime: item.lastMessageTime || null,
            threadId: item.threadId || null,
            unreadCount: item.unreadCount || 0,
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
              name:
                entry.user?.name ||
                u.name ||
                u.fullName ||
                u.username ||
                "Unknown",
              username: entry.user?.username || u.username || "user",
              avatarUrl:
                entry.user?.avatarUrl || u.avatarUrl || u.avatar || null,
              isOnline: entry.user?.isOnline ?? u.isOnline,
              lastSeen: entry.user?.lastSeen ?? u.lastSeen,
            };
          }
        });

        const merged = Array.from(map.values()).sort((a, b) => {
          const at = a.lastMessageTime
            ? new Date(a.lastMessageTime).getTime()
            : 0;
          const bt = b.lastMessageTime
            ? new Date(b.lastMessageTime).getTime()
            : 0;
          return bt - at;
        });

        setConnections(merged);
        const initUnread = {};
        merged.forEach((row) => {
          if (row.threadId) initUnread[row.threadId] = row.unreadCount || 0;
        });
        setUnreadByConversationId(initUnread);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  // Keep a ref of selected user for event handlers
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // Socket.IO connection
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token");
      const s = io(SOCKET_URL, {
        auth: { token },
        withCredentials: true,
        // Let Socket.IO negotiate transports for stability
      });

      s.on("connect", () => {
        console.log("Connected to server");
        userAPI.updatePresence(true);
      });

      s.on("disconnect", () => {
        console.log("Disconnected from server");
        userAPI.updatePresence(false);
      });

      // Message events
      s.on(
        "message:new",
        ({ conversationId, messageId, senderId, body, createdAt }) => {
          const currentSelected = selectedUserRef.current;
          const isCurrent =
            currentSelected && String(senderId) === String(currentSelected._id);
          const tabFocused = document.visibilityState === "visible";

          if (isCurrent && tabFocused) {
            setMessages((prev) => [
              ...prev,
              {
                id: messageId,
                senderId,
                recipientId: user._id,
                content: body,
                attachments: [],
                timestamp: createdAt,
                status: "delivered",
              },
            ]);
            if (s && conversationId)
              s.emit("messages:markRead", { conversationId });
            return;
          }

          setUnreadByConversationId((prev) => {
            const next = { ...prev };
            if (conversationId)
              next[conversationId] = Math.min(
                1000,
                (prev[conversationId] || 0) + 1
              );
            return next;
          });
        }
      );

      // Status updates
      const handleAck = (payload = {}) => {
        const realId = String(payload.id || payload.messageId || "");
        const clientKey = payload.clientKey ? String(payload.clientKey) : "";
        if (clientKey) {
          setMessages((prev) =>
            prev.map((m) => {
              if (String(m.id) === clientKey) {
                return { ...m, id: realId, status: "sent" };
              }
              return m;
            })
          );
          return;
        }
        if (realId) updateMessageStatus(realId, "sent");
      };

      s.on("message:ack", handleAck);
      s.on("message:sent", handleAck);
      s.on("message:delivered", (payload) => {
        const id = payload.messageId || payload.id;
        if (id) updateMessageStatus(id, "delivered");
      });
      s.on("message:seen", (payload) => {
        const id = payload.messageId || payload.id;
        if (id) updateMessageStatus(id, "seen");
      });

      // Reactions
      s.on("message:reacted", ({ messageId, reactions }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, reactions: reactions || [] } : m
          )
        );
        // Update connections' last message preview if applicable
        setConnections((prev) =>
          prev.map((conn) => {
            if (conn.lastMessage && conn.lastMessage.id === messageId) {
              const updatedPreview = getLastMessagePreview({
                ...conn,
                lastMessage: {
                  ...conn.lastMessage,
                  reactions: reactions || [],
                },
              });
              return { ...conn, lastMessage: updatedPreview };
            }
            return conn;
          })
        );
      });

      // Unread counters updates
      s.on("unread:update", ({ conversationId, newCount }) => {
        setUnreadByConversationId((prev) => ({
          ...prev,
          [conversationId]: Math.max(0, Number(newCount || 0)),
        }));
      });
      s.on("unread:total", ({ total }) => {
        if (typeof total === "number") setTotalUnread(total);
      });

      // Deletions
      s.on("messageDeleted", (payload) => {
        if (payload?.messageId) {
          setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
        } else if (payload?.messageIds) {
          const ids = new Set(payload.messageIds.map(String));
          setMessages((prev) => prev.filter((m) => !ids.has(String(m.id))));
        } else if (
          payload?.chatCleared &&
          payload?.userId === selectedUser?._id
        ) {
          setMessages([]);
        }
      });

      // Typing indicators
      s.on("typing:update", ({ from, typing }) => {
        const currentSelected = selectedUserRef.current;
        if (
          from !== user._id &&
          currentSelected &&
          from === currentSelected._id
        ) {
          setTypingUser(currentSelected.name);
          setIsTyping(!!typing);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          const timeout = setTimeout(() => {
            setIsTyping(false);
            setTypingUser(null);
          }, 2500);
          typingTimeoutRef.current = timeout;
        }
      });

      setSocket(s);
      return () => {
        s.disconnect();
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }
  }, [user, updateMessageStatus]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch messages for selected user
  const fetchMessagesData = useCallback(async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const data = await fetchMessages(selectedUser._id);
      const normalized = (Array.isArray(data) ? data : []).map((m) => ({
        ...m,
        status: m.status || "sent",
      }));
      setMessages(normalized);

      try {
        const token = localStorage.getItem("token");
        const resp = await axios.get(
          `${baseURL}/api/messages/media/${selectedUser._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
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

  // Message handlers
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if ((!newMessage.trim() && !selectedImage) || !selectedUser) return;

    try {
      const formData = new FormData();
      formData.append("content", newMessage);
      if (selectedImage) formData.append("image", selectedImage);
      if (replyTo?.id) formData.append("replyToId", replyTo.id);

      const token = localStorage.getItem("token");
      const isTextOnly = !!newMessage.trim() && !selectedImage;
      let clientKey = null;

      if (isTextOnly) {
        clientKey = generateClientKey();
        const optimistic = {
          id: clientKey,
          senderId: user._id,
          recipientId: selectedUser._id,
          content: newMessage,
          attachments: [],
          timestamp: new Date().toISOString(),
          status: "sent",
          replyTo: replyTo,
        };
        setMessages((prev) => [...prev, optimistic]);
        setTimeout(scrollToBottom, 50);

        if (socket) {
          socket.emit("chat:send", {
            to: selectedUser._id,
            content: newMessage,
            clientKey,
          });
        }

        setNewMessage("");
        setReplyTo(null);
      }

      if (clientKey) formData.append("clientKey", clientKey);

      const resp = await axios.post(
        `${baseURL}/api/messages/${selectedUser._id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const payload = resp.data;
      const serverMessage = payload && payload.message ? payload.message : null;
      if (!clientKey) {
        const idStr = serverMessage?.id ? String(serverMessage.id) : null;
        if (!idStr || !seenIdsRef.current.has(idStr)) {
          if (idStr) seenIdsRef.current.add(idStr);
          if (serverMessage) {
            setMessages((prev) => [
              ...prev,
              { ...serverMessage, status: "sent" },
            ]);
          }
        }
        setNewMessage("");
        setSelectedImage(null);
        setImagePreview(null);
        setReplyTo(null);
      } else {
        setSelectedImage(null);
        setImagePreview(null);
      }

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (socket && selectedUser) {
      socket.emit("typing", {
        userId: user._id,
        userName: user.name,
        recipientId: selectedUser._id,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      const timeout = setTimeout(() => {
        socket.emit("stop_typing", {
          userId: user._id,
          recipientId: selectedUser._id,
        });
      }, 900);
      typingTimeoutRef.current = timeout;
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem("token");
      const resp = await axios.post(
        `${baseURL}/api/messages/react`,
        { messageId: String(messageId), emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? { ...m, reactions: resp.data.reactions }
            : m
        )
      );
    } catch (e) {
      console.error("Reaction error:", e.response?.data || e.message);
      toast.error("Failed to react to message");
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

  const toggleMessageSelection = (id) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStar = (messageId) => {
    setStarredMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
        toast.success("Message unstarred");
      } else {
        next.add(messageId);
        toast.success("Message starred");
      }
      return next;
    });
  };

  const handleBlock = async (block = true) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${baseURL}/api/messages/block`,
        { targetUserId: selectedUser._id, action: block ? "block" : "unblock" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (block) {
        setBlockedUsers((prev) => new Set([...prev, selectedUser._id]));
      } else {
        setBlockedUsers((prev) => {
          const next = new Set(prev);
          next.delete(selectedUser._id);
          return next;
        });
        setShowUnblockSuccess(true);
      }
      toast.success(block ? "User blocked" : "User unblocked");
    } catch (e) {
      console.error("Block error:", e.response?.data || e.message);
      toast.error(e.response?.data?.message || "Failed to block/unblock user");
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
      toast.success("Report submitted successfully");
    } catch (e) {
      console.error("Report error:", e.response?.data || e.message);
      toast.error(e.response?.data?.message || "Failed to submit report");
    }
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

  const toggleChatSelection = (id) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteChats = async () => {
    try {
      const ids = Array.from(selectedChatIds);
      if (ids.length === 0) return;
      const token = localStorage.getItem("token");
      await axios.delete(`${baseURL}/api/messages/bulk-delete-chats`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { chatIds: ids },
      });
      setConnections((prev) => prev.filter((c) => !ids.includes(c._id)));
      setSelectedChatIds(new Set());
      setChatSelectionMode(false);
      toast.success(`${ids.length} chats deleted`);
    } catch (e) {
      toast.error("Failed to delete chats");
    }
  };

  const handleBulkBlockUsers = async () => {
    try {
      const ids = Array.from(selectedChatIds);
      if (ids.length === 0) return;
      const token = localStorage.getItem("token");
      await axios.post(
        `${baseURL}/api/messages/bulk-block`,
        { userIds: ids },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlockedUsers((prev) => new Set([...prev, ...ids]));
      setSelectedChatIds(new Set());
      setChatSelectionMode(false);
      toast.success(`${ids.length} users blocked`);
    } catch (e) {
      toast.error("Failed to block users");
    }
  };

  const handleBulkReportUsers = async () => {
    try {
      const ids = Array.from(selectedChatIds);
      if (ids.length === 0) return;
      const reason = prompt("Report reason?") || "";
      const token = localStorage.getItem("token");
      await axios.post(
        `${baseURL}/api/messages/bulk-report`,
        { userIds: ids, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedChatIds(new Set());
      setChatSelectionMode(false);
      toast.success(`${ids.length} users reported`);
    } catch (e) {
      toast.error("Failed to report users");
    }
  };

  // Format time helpers
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const getMessageStatusIcon = (status, isMine) => {
    if (!isMine) return null;

    switch (status) {
      case "sent":
        return <Check size={16} className="text-gray-400" />;
      case "delivered":
        return <CheckCheck size={16} className="text-gray-400" />;
      case "seen":
        return <CheckCheck size={16} className="text-blue-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  // Render message content with emoji support
  const renderMessageContent = (text) => {
    if (!text) return null;

    // Simple emoji detection
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const isEmojiOnly = text.replace(emojiRegex, "").trim() === "";

    if (isEmojiOnly) {
      return <div className="text-4xl py-2">{text}</div>;
    }

    return <div className="whitespace-pre-wrap break-words">{text}</div>;
  };

  // Helper function for reaction preview
  const getLastMessagePreview = (connection) => {
    if (!connection.lastMessage) return "";
    const lastMsg = connection.lastMessage;
    const userReaction = Array.isArray(lastMsg.reactions)
      ? lastMsg.reactions.find((r) => String(r.userId) === String(user._id))
      : null;
    if (userReaction) {
      const emoji = userReaction.emoji;
      if (lastMsg.attachments && lastMsg.attachments.length > 0) {
        const attachment = lastMsg.attachments[0];
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment);
        const preview = isImage ? "📷 Photo" : "📄 Document";
        return `You reacted ${emoji} to ${preview}`;
      } else {
        const content = lastMsg.content || "";
        const truncated =
          content.length > 30 ? content.substring(0, 30) + "..." : content;
        return `You reacted ${emoji} to "${truncated}"`;
      }
    }
    return lastMsg.content || "";
  };

  // Function to open reactions modal
  const openReactionsModal = async (messageId) => {
    try {
      const token = localStorage.getItem("token");
      const resp = await axios.get(
        `${baseURL}/api/messages/info/${messageId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReactionsModalData(resp.data.messageInfo);
      setReactionsModalFor(messageId);
    } catch (e) {
      console.error("Failed to fetch reactions:", e);
      toast.error("Failed to load reactions");
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      setOpenMessageMenuFor(null);
      setOpenHeaderMenu(false);
      setActiveReactionFor(null);
      setShowEmojiPicker(false);
      setShowSidebarMenu(false);
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (showUnblockSuccess) {
      const timer = setTimeout(() => setShowUnblockSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showUnblockSuccess]);

  if (loading && connections.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } lg:flex w-full lg:w-80 flex-col bg-white border-r border-gray-200 ${
          chatSelectionMode ? "bg-green-50" : ""
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setChatSelectionMode((v) => !v)}
                className={`p-2 rounded-full hover:bg-gray-200 ${
                  chatSelectionMode ? "bg-green-100 text-green-600" : ""
                }`}
                title="Select chats"
              >
                <FiCheckSquare />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {connections.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">💬</div>
              <p>No conversations yet</p>
            </div>
          ) : (
            connections
              .filter(
                (conn) =>
                  (conn.user?.name || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  (conn.user?.username || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
              )
              .map((connection) => (
                <motion.div
                  key={connection._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedUser?._id === connection.user?._id
                      ? "bg-green-50 border-l-4 border-l-green-500"
                      : ""
                  } ${
                    chatSelectionMode && selectedChatIds.has(connection._id)
                      ? "bg-green-100"
                      : ""
                  }`}
                  onClick={() => {
                    if (chatSelectionMode) {
                      toggleChatSelection(connection._id);
                    } else {
                      setSelectedUser(connection.user);
                      setShowSidebar(false);
                      // Optimistically clear unread count for this conversation
                      if (connection.threadId) {
                        setUnreadByConversationId((prev) => ({
                          ...prev,
                          [connection.threadId]: 0,
                        }));
                      }
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {chatSelectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedChatIds.has(connection._id)}
                        onChange={() => toggleChatSelection(connection._id)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                    )}
                    <div className="relative">
                      <img
                        src={
                          connection.user?.avatarUrl
                            ? getAvatarUrl(connection.user.avatarUrl)
                            : "/default-avatar.png"
                        }
                        alt={connection.user?.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {connection.user?.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {connection.user?.name}
                        </h3>
                        {connection.lastMessageTime && (
                          <span className="text-xs text-gray-500">
                            {formatTime(connection.lastMessageTime)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {getLastMessagePreview(connection)}
                        </p>

                        {/* Unread badge */}
                        {(() => {
                          const threadId = connection.threadId;
                          const count = threadId
                            ? unreadByConversationId[threadId] || 0
                            : 0;
                          const hide =
                            selectedUser?._id === connection.user?._id ||
                            count <= 0;

                          if (hide) return null;

                          return (
                            <motion.span
                              initial={{ scale: 1 }}
                              animate={{ scale: count > 0 ? 1 : 0 }}
                              transition={{ duration: 0.3 }}
                              className="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center font-bold"
                              style={{
                                background:
                                  "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                                boxShadow:
                                  "0 3px 10px rgba(37, 211, 102, 0.5), 0 0 0 3px rgba(255, 255, 255, 1)",
                              }}
                            >
                              {count > 99 ? "99+" : count}
                            </motion.span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
          )}
        </div>

        {/* Bulk Actions Bar */}
        {chatSelectionMode && selectedChatIds.size > 0 && (
          <div className="p-4 bg-white border-t-2 border-green-500 flex flex-col gap-4 z-100 shadow-lg">
            <div className="text-sm font-semibold text-green-700">
              {selectedChatIds.size} selected
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleBulkDeleteChats}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold"
              >
                Delete
              </button>
              <button
                onClick={handleBulkBlockUsers}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-semibold"
              >
                Block
              </button>
              <button
                onClick={handleBulkReportUsers}
                className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-semibold"
              >
                Report
              </button>
              <button
                onClick={() => {
                  setSelectedChatIds(new Set());
                  setChatSelectionMode(false);
                }}
                className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div
        className={`${showSidebar ? "hidden" : "flex"} lg:flex flex-1 flex-col`}
      >
        {selectedUser ? (
          <>
            {/* Chat Header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden p-2 rounded-full hover:bg-gray-200"
                  onClick={() => setShowSidebar(true)}
                >
                  <FiArrowLeft />
                </button>

                <img
                  src={
                    selectedUser.avatarUrl
                      ? getAvatarUrl(selectedUser.avatarUrl)
                      : "/default-avatar.png"
                  }
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div>
                  <button
                    onClick={() => setShowRightPanel(true)}
                    className="font-semibold text-gray-900 hover:underline text-left"
                    title="View contact info"
                  >
                    {selectedUser.name}
                  </button>
                  <p className="text-sm text-gray-500">
                    {isTyping && typingUser ? (
                      <span className="text-green-600 italic">typing...</span>
                    ) : selectedUser.isOnline ? (
                      "online"
                    ) : (
                      `last seen ${formatLastSeen(selectedUser.lastSeen)}`
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectionMode(!selectionMode)}
                  className={`p-2 rounded-full hover:bg-gray-200 ${
                    selectionMode ? "bg-green-100 text-green-600" : ""
                  }`}
                >
                  <FiCheckSquare />
                </button>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenHeaderMenu(!openHeaderMenu);
                    }}
                    className="p-2 rounded-full hover:bg-gray-200"
                  >
                    <FiMoreVertical />
                  </button>

                  {openHeaderMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          setShowMessageInfo(true);
                          setOpenHeaderMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FiInfo /> Contact info
                      </button>
                      <button
                        onClick={() => {
                          setSelectionMode(!selectionMode);
                          setOpenHeaderMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FiCheckSquare /> Select messages
                      </button>
                      <button
                        onClick={() => {
                          handleBlock(!blockedUsers.has(selectedUser._id));
                          setOpenHeaderMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-red-600"
                      >
                        <FiUserX />{" "}
                        {blockedUsers.has(selectedUser._id)
                          ? "Unblock"
                          : "Block"}
                      </button>
                      <button
                        onClick={() => {
                          handleReport();
                          setOpenHeaderMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-red-600"
                      >
                        <FiFlag /> Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f3f4f6' fill-opacity='0.3'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-lg">No messages yet</p>
                  <p className="text-sm">
                    Send a message to start the conversation
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((message, index) => {
                    const isMine = message.senderId === user._id;
                    const showDateSeparator =
                      index === 0 ||
                      new Date(messages[index - 1].timestamp).toDateString() !==
                        new Date(message.timestamp).toDateString();

                    return (
                      <div key={message.id}>
                        {/* Date separator */}
                        {showDateSeparator && (
                          <div className="flex justify-center my-4">
                            <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                              {new Date(message.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {/* Message */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`flex ${
                            isMine ? "justify-end" : "justify-start"
                          } group`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md relative ${
                              isMine ? "order-2" : "order-1"
                            }`}
                          >
                            {/* Selection checkbox */}
                            {selectionMode && (
                              <div
                                className={`absolute -top-2 ${
                                  isMine ? "-left-8" : "-right-8"
                                } z-10`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMessageIds.has(message.id)}
                                  onChange={() =>
                                    toggleMessageSelection(message.id)
                                  }
                                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                />
                              </div>
                            )}

                            {/* Reply context */}
                            {message.replyTo && (
                              <div
                                className={`mb-1 p-2 rounded-lg border-l-4 ${
                                  isMine
                                    ? "bg-green-50 border-green-500"
                                    : "bg-gray-50 border-gray-400"
                                }`}
                              >
                                <div className="text-xs text-gray-600 mb-1">
                                  Replying to{" "}
                                  {isMine ? selectedUser.name : "You"}
                                </div>
                                <div className="text-sm text-gray-800 truncate">
                                  {messages.find(
                                    (m) => m.id === message.replyTo.id
                                  )?.content || "Message"}
                                </div>
                              </div>
                            )}

                            {/* Message bubble */}
                            <div
                              className={`relative px-4 py-2 rounded-2xl ${
                                isMine
                                  ? "bg-green-500 text-white rounded-br-sm"
                                  : "bg-white text-gray-900 rounded-bl-sm border border-gray-200"
                              } shadow-sm`}
                            >
                              {/* Message content */}
                              {message.content &&
                                renderMessageContent(message.content)}

                              {/* Attachments */}
                              {message.attachments &&
                                message.attachments.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {message.attachments.map(
                                      (attachment, idx) => {
                                        const isImage =
                                          /\.(jpg|jpeg|png|gif|webp)$/i.test(
                                            attachment
                                          );
                                        const filename = attachment
                                          .split("/")
                                          .pop();

                                        if (isImage) {
                                          return (
                                            <div key={idx} className="relative">
                                              <img
                                                src={attachment}
                                                alt="attachment"
                                                className="max-w-full h-auto rounded-lg cursor-pointer"
                                                onClick={() =>
                                                  setLightboxSrc(attachment)
                                                }
                                              />
                                              <a
                                                href={attachment}
                                                download
                                                className="absolute top-2 right-2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:scale-110 transition-transform"
                                              >
                                                <FiDownload size={16} />
                                              </a>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div
                                            key={idx}
                                            className="p-2 bg-gray-100 rounded-lg flex items-center justify-between"
                                          >
                                            <a
                                              href={attachment}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline flex items-center gap-2"
                                            >
                                              <FiPaperclip />
                                              {filename || "Attachment"}
                                            </a>
                                            <a
                                              href={attachment}
                                              download
                                              className="ml-3 text-gray-700 hover:text-gray-900 px-2 py-1 border rounded hover:bg-gray-200"
                                            >
                                              <FiDownload className="inline-block" />
                                            </a>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                )}

                              {/* Message time and status */}
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                  isMine ? "text-green-100" : "text-gray-500"
                                }`}
                              >
                                <span>{formatTime(message.timestamp)}</span>
                                {getMessageStatusIcon(message.status, isMine)}
                              </div>

                              {/* Reactions */}
                              {(() => {
                                const groups = Array.isArray(message.reactions)
                                  ? message.reactions.reduce((acc, r) => {
                                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                      return acc;
                                    }, {})
                                  : {};
                                const entries = Object.entries(groups);
                                if (entries.length === 0) return null;
                                return (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openReactionsModal(message.id)
                                    }
                                    className={`absolute -bottom-2 ${
                                      isMine ? "right-2" : "left-2"
                                    } flex gap-1 bg-white/90 rounded-full border border-gray-200 px-1 py-[1px] shadow-sm`}
                                  >
                                    {entries.map(([emoji, count]) => (
                                      <span
                                        key={emoji}
                                        className="text-sm px-1"
                                      >
                                        {emoji} {count}
                                      </span>
                                    ))}
                                  </button>
                                );
                              })()}
                            </div>

                            {/* Message actions (hover) */}
                            <div
                              className={`absolute top-0 ${
                                isMine ? "-left-20" : "-right-20"
                              } opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}
                            >
                              {/* React button */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveReactionFor(
                                      activeReactionFor === message.id
                                        ? null
                                        : message.id
                                    );
                                  }}
                                  className="p-1 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                                >
                                  <HiOutlineEmojiHappy
                                    className="text-gray-600"
                                    size={16}
                                  />
                                </button>

                                {/* Quick reactions */}
                                {activeReactionFor === message.id && (
                                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1 z-20">
                                    {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(
                                      (emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => {
                                            handleReact(message.id, emoji);
                                            setActiveReactionFor(null);
                                          }}
                                          className="p-1 hover:bg-gray-100 rounded text-lg"
                                        >
                                          {emoji}
                                        </button>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* More options */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMessageMenuFor(
                                      openMessageMenuFor === message.id
                                        ? null
                                        : message.id
                                    );
                                  }}
                                  className="p-1 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                                >
                                  <BsThreeDotsVertical
                                    className="text-gray-600"
                                    size={14}
                                  />
                                </button>

                                {/* Message menu */}
                                {openMessageMenuFor === message.id && (
                                  <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                                    <button
                                      onClick={() => {
                                        setReplyTo({ id: message.id });
                                        setOpenMessageMenuFor(null);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <BsReply /> Reply
                                    </button>
                                    <button
                                      onClick={() => {
                                        setForwardSource(message);
                                        setShowForwardDialog(true);
                                        setOpenMessageMenuFor(null);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <BsForward /> Forward
                                    </button>
                                    <button
                                      onClick={() => {
                                        toggleStar(message.id);
                                        setOpenMessageMenuFor(null);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      {starredMessages.has(message.id) ? (
                                        <BsStarFill className="text-yellow-500" />
                                      ) : (
                                        <BsStar />
                                      )}
                                      {starredMessages.has(message.id)
                                        ? "Unstar"
                                        : "Star"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(
                                          message.content || ""
                                        );
                                        setOpenMessageMenuFor(null);
                                        toast.success("Message copied");
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <FiCopy /> Copy
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMessageInfo(message);
                                        setShowMessageInfo(true);
                                        setOpenMessageMenuFor(null);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <FiInfo /> Info
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDeleteSingle(message.id, "me");
                                        setOpenMessageMenuFor(null);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                    >
                                      <FiTrash2 /> Delete for me
                                    </button>
                                    {isMine && (
                                      <button
                                        onClick={() => {
                                          handleDeleteSingle(
                                            message.id,
                                            "everyone"
                                          );
                                          setOpenMessageMenuFor(null);
                                        }}
                                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                      >
                                        <FiTrash2 /> Delete for everyone
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Selection mode actions */}
            {selectionMode && selectedMessageIds.size > 0 && (
              <div className="p-4 bg-green-50 border-t border-green-200 flex items-center justify-between">
                <div className="text-green-800 font-medium">
                  {selectedMessageIds.size} selected
                </div>
                <div className="flex items-center gap-2 relative">
                  <button
                    onClick={() => handleBulkDelete("me")}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    Delete for me
                  </button>
                  <button
                    onClick={() => handleBulkDelete("everyone")}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Delete for everyone
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMessageIds(new Set());
                      setSelectionMode(false);
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              {showUnblockSuccess && (
                <div className="p-3 bg-green-50 border-t border-green-200 text-center text-sm text-green-700 mb-4">
                  You unblocked this contact
                </div>
              )}
              {blockedUsers.has(selectedUser._id) ? (
                <div className="p-6 text-center bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-700 mb-2">
                    You blocked this contact.
                  </p>
                  <button
                    onClick={() => setShowUnblockDialog(true)}
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    Select to unblock
                  </button>
                </div>
              ) : (
                <>
                  {/* Image preview */}
                  {imagePreview && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Reply preview */}
                  {replyTo && (
                    <div className="mb-3 p-3 bg-gray-50 border-l-4 border-green-500 rounded-lg flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-green-600 mb-1">
                          Replying to {selectedUser.name}
                        </div>
                        <div className="text-sm text-gray-700 truncate">
                          {messages.find((m) => m.id === replyTo.id)?.content ||
                            "Message"}
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <FiX />
                      </button>
                    </div>
                  )}

                  {/* Input form */}
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2"
                  >
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder="Type a message"
                        className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />

                      {/* Input actions */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                        >
                          <FiPaperclip size={18} />
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEmojiPicker(!showEmojiPicker);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                          >
                            <BsEmojiSmile size={18} />
                          </button>

                          {/* Emoji picker */}
                          {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 z-50">
                              <Picker
                                onEmojiClick={(emojiData) => {
                                  setNewMessage(
                                    (prev) => prev + emojiData.emoji
                                  );
                                }}
                                skinTonesDisabled
                                searchDisabled
                                previewConfig={{ showPreview: false }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* File input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </div>

                    {/* Send button */}
                    <button
                      type="submit"
                      disabled={!newMessage.trim() && !selectedImage}
                      className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiSend size={18} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </>
        ) : (
          /* Welcome screen */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                WhatsApp Web
              </h2>
              <p className="text-gray-600 max-w-md">
                Send and receive messages without keeping your phone online. Use
                WhatsApp on up to 4 linked devices and 1 phone at the same time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Right side panel: contact info + media/links/docs + actions */}
      {selectedUser && showRightPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold">Contact info</div>
            <button
              onClick={() => setShowRightPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX />
            </button>
          </div>
          <div className="p-4 flex items-center gap-3 border-b">
            <img
              src={
                selectedUser.avatarUrl
                  ? getAvatarUrl(selectedUser.avatarUrl)
                  : "/default-avatar.png"
              }
              alt={selectedUser.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <div className="font-medium">{selectedUser.name}</div>
              <div className="text-sm text-gray-500">
                @{selectedUser.username}
              </div>
            </div>
          </div>
          <div className="px-4 pt-2 flex gap-2">
            {[
              { key: "media", label: "Media" },
              { key: "docs", label: "Docs" },
              { key: "links", label: "Links" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setRightPanelTab(t.key)}
                className={`px-3 py-1 rounded-full text-sm ${
                  rightPanelTab === t.key
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {rightPanelTab === "media" && (
              <div className="grid grid-cols-3 gap-2">
                {sharedMedia
                  .filter((m) => m.type !== "link")
                  .map((m) => (
                    <img
                      key={m.id + String(m.url)}
                      src={m.url}
                      alt=""
                      className="w-full h-24 object-cover rounded"
                    />
                  ))}
              </div>
            )}
            {rightPanelTab === "docs" && (
              <div className="space-y-2">
                {sharedMedia
                  .filter((m) => m.type === "document")
                  .map((m) => (
                    <a
                      key={m.id + String(m.url)}
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-2 bg-gray-50 rounded border hover:bg-gray-100"
                    >
                      Document
                    </a>
                  ))}
              </div>
            )}
            {rightPanelTab === "links" && (
              <div className="space-y-2">
                {sharedMedia
                  .filter((m) => m.type === "link")
                  .map((m) => (
                    <a
                      key={m.id + String(m.url)}
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-2 bg-gray-50 rounded border hover:bg-gray-100 truncate"
                    >
                      {m.url}
                    </a>
                  ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t flex gap-2">
            {blockedUsers.has(selectedUser._id) ? (
              <button
                onClick={() => setShowUnblockDialog(true)}
                className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white"
              >
                Unblock
              </button>
            ) : (
              <button
                onClick={() => handleBlock(true)}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white"
              >
                Block
              </button>
            )}
            <button
              onClick={handleReport}
              className="px-3 py-2 rounded-lg bg-orange-500 text-white"
            >
              Report
            </button>
          </div>
        </div>
      )}

      {/* Forward Dialog */}
      {showForwardDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Forward message</h3>
            </div>

            <div className="max-h-80 overflow-y-auto p-4">
              {connections.map((connection) => (
                <label
                  key={connection._id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={forwardSelected.has(connection._id)}
                    onChange={(e) => {
                      setForwardSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          next.add(connection._id);
                        } else {
                          next.delete(connection._id);
                        }
                        return next;
                      });
                    }}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <img
                    src={
                      connection.user?.avatarUrl
                        ? getAvatarUrl(connection.user.avatarUrl)
                        : "/default-avatar.png"
                    }
                    alt={connection.user?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium">{connection.user?.name}</div>
                    <div className="text-sm text-gray-500">
                      @{connection.user?.username}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowForwardDialog(false);
                  setForwardSelected(new Set());
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Forward to selected users
                  for (const userId of forwardSelected) {
                    try {
                      const formData = new FormData();
                      formData.append("content", forwardSource.content || "");
                      const token = localStorage.getItem("token");
                      await axios.post(
                        `${baseURL}/api/messages/${userId}`,
                        formData,
                        {
                          headers: {
                            "Content-Type": "multipart/form-data",
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );
                    } catch (e) {
                      console.error("Failed to forward message", e);
                    }
                  }
                  toast.success("Message forwarded");
                  setShowForwardDialog(false);
                  setForwardSelected(new Set());
                }}
                disabled={forwardSelected.size === 0}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                Forward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Info Dialog */}
      {showMessageInfo && messageInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Message info</h3>
              <button
                onClick={() => setShowMessageInfo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Message</div>
                  <div>{messageInfo.content || "Media message"}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="text-gray-400" size={16} />
                  <div>
                    <div className="text-sm">Sent</div>
                    <div className="text-xs text-gray-500">
                      {new Date(messageInfo.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {messageInfo.status === "delivered" ||
                messageInfo.status === "seen" ? (
                  <div className="flex items-center gap-3">
                    <CheckCheck className="text-gray-400" size={16} />
                    <div>
                      <div className="text-sm">Delivered</div>
                      <div className="text-xs text-gray-500">
                        {new Date(messageInfo.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : null}

                {messageInfo.status === "seen" ? (
                  <div className="flex items-center gap-3">
                    <CheckCheck className="text-blue-500" size={16} />
                    <div>
                      <div className="text-sm">Read</div>
                      <div className="text-xs text-gray-500">
                        {new Date(messageInfo.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reactions Modal */}
      {reactionsModalFor && reactionsModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Reactions</h3>
              <button
                onClick={() => {
                  setReactionsModalFor(null);
                  setReactionsModalData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX />
              </button>
            </div>

            <div className="p-4">
              {/* Tab bar */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() =>
                    setReactionsModalData({
                      ...reactionsModalData,
                      activeTab: "all",
                    })
                  }
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    reactionsModalData.activeTab === "all" ||
                    !reactionsModalData.activeTab
                      ? "bg-green-100 text-green-700 border-b-2 border-green-500"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  All {reactionsModalData.reactions?.length || 0}
                </button>
                {Object.entries(
                  (reactionsModalData.reactions || []).reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() =>
                      setReactionsModalData({
                        ...reactionsModalData,
                        activeTab: emoji,
                      })
                    }
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      reactionsModalData.activeTab === emoji
                        ? "bg-green-100 text-green-700 border-b-2 border-green-500"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {emoji} {count}
                  </button>
                ))}
              </div>

              {/* User list */}
              <div className="max-h-80 overflow-y-auto space-y-2">
                {(reactionsModalData.reactions || [])
                  .filter((r) =>
                    reactionsModalData.activeTab === "all" ||
                    !reactionsModalData.activeTab
                      ? true
                      : r.emoji === reactionsModalData.activeTab
                  )
                  .map((r, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(
                            r.userId?.avatarUrl || r.userId?.avatar
                          )}
                          alt={r.userId?.name || "User"}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="text-sm">
                          {r.userId?.name || r.userId?.username || "User"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{r.emoji}</span>
                        {String(r.userId?._id) === String(user._id) && (
                          <button
                            onClick={() => handleReact(reactionsModalFor, null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Tap to remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Confirmation Dialog */}
      {showUnblockDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Unblock {selectedUser.name}?
            </h3>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  handleBlock(false);
                  setShowUnblockDialog(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Unblock
              </button>
              <button
                onClick={() => setShowUnblockDialog(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
