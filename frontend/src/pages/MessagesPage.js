import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "react-icons/fi";
import { BiCheckDouble } from "react-icons/bi";
import Picker from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";

// Custom CSS for route-scoped shell and dark theme visuals
const customScrollbarStyles = `
  :root { --navbar-height: var(--navbar-height, 80px); }
  .chat-shell { height: calc(100vh - var(--navbar-height)); width: 100vw; overflow-y: hidden; overflow-x: hidden; }
  .no-h-scroll { overflow-x: hidden; }
  .pane-left { width: clamp(280px, 28vw, 380px); overflow-x: hidden; }
  .pane-right { min-width: 0; position: relative; overflow-x: hidden; }
  .sticky-head { position: sticky; top: 0; z-index: 20; }
  .sticky-compose { position: sticky; bottom: 0; z-index: 20; }
  .z-navbar { z-index: 50; }
  .z-popover { z-index: 40; }
  .z-over { z-index: 30; }
  .z-under { z-index: 10; }
  .bubble { position: relative; border-radius: 18px; padding: 10px 12px; max-width: 65%; }
  .bubble-sent { background: linear-gradient(140deg, #2563eb, #9333ea); color: #ffffff; box-shadow: 0 6px 22px rgba(37, 99, 235, 0.22); }
  .bubble-received { background: rgba(255,255,255,0.06); color: #e6e8ee; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 8px 26px rgba(0,0,0,0.22); }
  .bubble:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,0,0,0.25); }
  .bubble .message-content { font-size: 15px; line-height: 1.5; font-weight: 500; }
  .message-content { white-space: pre-wrap; word-break: break-word; }
  .emoji-char { display: inline-block; font-variant-emoji: emoji; transform-origin: center; font-size: 1.35em; line-height: 1; }
  .emoji-char:hover { transform: scale(1.1); transition: transform 150ms cubic-bezier(.2,.7,.3,1.0); }
  .caret-trigger { opacity: 0; transition: opacity 140ms cubic-bezier(.2,.7,.3,1.0), transform 140ms cubic-bezier(.2,.7,.3,1.0); transform: translateY(-2px); }
  .group:hover .caret-trigger, .group:focus-within .caret-trigger, .caret-trigger:focus-visible { opacity: 1; transform: translateY(0); }
  .caret-button { width: 40px; height: 40px; border-radius: 9999px; display: grid; place-items: center; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 6px 20px rgba(0,0,0,0.35); color: #e6e8ee; }
  .caret-button:hover { background: rgba(255,255,255,0.14); }
  .emoji-trigger { width: 40px; height: 40px; border-radius: 9999px; display: grid; place-items: center; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 6px 20px rgba(0,0,0,0.35); color: #ffd166; }
  .emoji-trigger:hover { background: rgba(255,255,255,0.14); }
  .quick-menu { position: absolute; inset: auto auto 100% 0; transform: translateY(-8px); background: rgba(24,25,29,0.98); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 6px; display: flex; gap: 4px; box-shadow: 0 20px 60px rgba(0,0,0,0.45); }
  .quick-item { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; color: #e6e8ee; }
  .quick-item:hover { background: rgba(255,255,255,0.08); }
  .full-menu { position: absolute; min-width: 240px; background: #1f1f1f; color: #e6e8ee; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 6px; box-shadow: 0 20px 60px rgba(0,0,0,0.45); }
  .menu-item { width: 100%; text-align: left; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; }
  .menu-item:hover, .menu-item[aria-selected="true"] { background: rgba(255,255,255,0.08); }
  .menu-reactions { display: flex; gap: 8px; padding: 8px; border-top: 1px solid rgba(255,255,255,0.1); }
  .menu-reactions button { width: 34px; height: 34px; border-radius: 10px; background: transparent; color: #e6e8ee; border: 0; display: grid; place-items: center; }
  .menu-reactions button:hover { background: rgba(255,255,255,0.08); }
  .media-img { border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: min(60vw, 420px); height: auto; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.06); border-radius: 3px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 3px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }
  .custom-scrollbar { scroll-behavior: smooth; }
  .chat-body { position: relative; z-index: 999; overflow-y: auto; overflow-x: hidden; background: #0b0b0b; }
  .timestamp-below { display: block; font-size: 11px; line-height: 1; opacity: 0.8; letter-spacing: 0.01em; margin-top: 6px; }
  .reaction-popover { position: absolute; inset: auto auto 100% 0; transform: translateY(-8px); background: rgba(24,25,29,0.98); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 6px; display: flex; gap: 6px; box-shadow: 0 20px 60px rgba(0,0,0,0.45); z-index: 60; }
  .reaction-btn { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; font-size: 18px; }
  .reaction-btn:hover { background: rgba(255,255,255,0.08); }
  .date-separator { position: sticky; top: 12px; z-index: 5; display: inline-block; margin: 12px auto; padding: 6px 12px; border-radius: 9999px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #cbd5e1; font-size: 11px; letter-spacing: .02em; backdrop-filter: blur(6px); }
  /* Welcome panel visuals */
  .welcome-bg { background: linear-gradient(135deg, #e0f7fa 0%, #e8f0fe 35%, #f3e5f5 100%); }
  .welcome-card { background: rgba(255,255,255,0.72); border: 1px solid rgba(0,0,0,0.06); }
  @keyframes floaty { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
  .floaty { animation: floaty 6s ease-in-out infinite; }
`;

const MessagesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [unreadByConversationId, setUnreadByConversationId] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const updateMessageStatus = useCallback((messageId, status) => {
    if (!messageId || !status) return;
    setMessages((prev) =>
      prev.map((m) =>
        String(m.id) === String(messageId) ? { ...m, status } : m
      )
    );
  }, []);
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
  const messageMenuRef = useRef(null); // not relied upon for close, kept for anchor semantics
  const headerMenuRef = useRef(null);
  const reactionMenuRef = useRef(null);
  const emojiAreaRef = useRef(null);
  const [forwardSource, setForwardSource] = useState(null); // message to forward
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardSelected, setForwardSelected] = useState(new Set());

  const generateClientKey = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Accessible full menu portal state
  const [menuPortal, setMenuPortal] = useState({
    open: false,
    x: 0,
    y: 0,
    items: [],
    messageId: null,
    focusIndex: 0,
  });
  const menuPortalRef = useRef(null);

  // Hover quick menu state (per-bubble)
  const [hoverQuickFor, setHoverQuickFor] = useState(null);
  const lastFocusRef = useRef(null);

  // Load conversations + merge with connections (for names/avatars/presence)
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

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token");
      const s = io(SOCKET_URL, {
        auth: { token },
        withCredentials: true,
        transports: ["websocket"],
      });

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
      // New message event contract
      s.on(
        "message:new",
        ({ conversationId, messageId, senderId, body, createdAt }) => {
          const isCurrent =
            selectedUser && String(senderId) === String(selectedUser._id);
          // if current thread open and focused in this tab
          const tabFocused = document.visibilityState === "visible";
          if (isCurrent && tabFocused) {
            // append live, mark read later via debounce
            setMessages((prev) => [
              ...prev,
              {
                id: messageId,
                senderId,
                recipientId: user._id,
                content: body,
                attachments: [],
                timestamp: createdAt,
              },
            ]);
            // do not increment unread locally
            // issue markRead signal
            if (s) s.emit("messages:markRead", { conversationId });
            return;
          }
          // else, increment unread for that conversation
          setUnreadByConversationId((prev) => {
            const next = { ...prev };
            next[conversationId] = Math.min(
              1000,
              (prev[conversationId] || 0) + 1
            );
            return next;
          });
          // Suppress pop-ups/toasts per requirement
        }
      );

      s.on("unread:snapshot", (rows) => {
        const map = {};
        (rows || []).forEach((r) => {
          map[r.conversationId] = r.count || 0;
        });
        setUnreadByConversationId(map);
      });

      s.on("unread:update", ({ conversationId, newCount }) => {
        setUnreadByConversationId((prev) => ({
          ...prev,
          [conversationId]: newCount,
        }));
      });

      // ACK for optimistic sends: map clientKey -> real id
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
      s.on("messageAck", handleAck);

      // Message delivery and seen status updates (both colon and camel event names)
      const handleDelivered = (payload = {}) => {
        const id = payload.messageId || payload.id;
        if (id) updateMessageStatus(id, "delivered");
      };
      const handleSeen = (payload = {}) => {
        const id = payload.messageId || payload.id;
        if (id) updateMessageStatus(id, "seen");
      };
      s.on("message:sent", (p) => handleAck(p));
      s.on("messageSent", (p) => {
        handleAck(p);
      });
      s.on("message:delivered", handleDelivered);
      s.on("messageDelivered", handleDelivered);
      s.on("message:seen", handleSeen);
      s.on("messageSeen", handleSeen);

      // Fallback: read receipts provide a timestamp up to which messages are read
      s.on("messages:readReceipt", ({ conversationId, readerId, readUpTo }) => {
        if (!selectedUser || String(readerId) !== String(selectedUser._id))
          return;
        const cutoff = new Date(readUpTo).getTime();
        setMessages((prev) =>
          prev.map((m) => {
            const isMine = String(m.senderId) === String(user._id);
            const isToSelected =
              String(m.recipientId) === String(selectedUser._id);
            const sentAt = new Date(m.timestamp).getTime();
            if (isMine && isToSelected && sentAt <= cutoff) {
              return { ...m, status: "seen" };
            }
            return m;
          })
        );
      });

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
        } else if (
          payload?.chatCleared &&
          payload?.userId === selectedUser?._id
        ) {
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
  }, [user, selectedUser, isTypingTimeout, connections]);

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
      // Initialize without toasts; statuses will update via socket events
      const normalized = (Array.isArray(data) ? data : []).map((m) => ({
        ...m,
      }));
      setMessages(normalized);
      // also fetch shared media previews
      try {
        const token = localStorage.getItem("token");
        const resp = await axios.get(
          `${baseURL}/api/messages/media/${selectedUser._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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

  // Remove theme toggle per request (keep class intact)

  // Global click-outside & key listeners for menus
  useEffect(() => {
    const handler = (e) => {
      // Close message dropdown on any outside click; menu stops propagation
      if (openMessageMenuFor) setOpenMessageMenuFor(null);
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setOpenHeaderMenu(false);
      }
      if (
        reactionMenuRef.current &&
        !reactionMenuRef.current.contains(e.target)
      ) {
        setActiveReactionFor(null);
      }
      // Close emoji picker only when clicking outside the emoji area
      const clickedInsideEmojiArea =
        emojiAreaRef.current && emojiAreaRef.current.contains(e.target);
      if (!clickedInsideEmojiArea && showEmojiPicker) setShowEmojiPicker(false);
      if (menuPortal.open) setMenuPortal((s) => ({ ...s, open: false }));
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (menuPortal.open) setMenuPortal((s) => ({ ...s, open: false }));
        setOpenHeaderMenu(false);
        setActiveReactionFor(null);
      }
      if (menuPortal.open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setMenuPortal((s) => {
          const len = (s.items || []).length;
          const next =
            e.key === "ArrowDown"
              ? (s.focusIndex + 1) % len
              : (s.focusIndex - 1 + len) % len;
          return { ...s, focusIndex: next };
        });
      }
      if (menuPortal.open && e.key === "Enter") {
        const item = menuPortal.items[menuPortal.focusIndex];
        if (item && typeof item.onSelect === "function") {
          item.onSelect();
          setMenuPortal((s) => ({ ...s, open: false }));
        }
      }
    };
    document.addEventListener("click", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [showEmojiPicker, openMessageMenuFor, menuPortal.open]);

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

      // Optimistic UI for text-only message using clientKey
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
        // Clear input immediately for text-only messages
        setNewMessage("");
        setReplyTo(null);
      }

      // Always send via HTTP to persist and handle attachments
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
      const messageData = resp.data;

      if (!clientKey) {
        const idStr = messageData?.id ? String(messageData.id) : null;
        if (!idStr || !seenIdsRef.current.has(idStr)) {
          if (idStr) seenIdsRef.current.add(idStr);
          setMessages((prev) => [...prev, { ...messageData, status: "sent" }]);
        }
        // Clear input and image after successful send for non-text messages
        setNewMessage("");
        setSelectedImage(null);
        setImagePreview(null);
        setReplyTo(null);
      } else {
        // For text-only, clear image if any (though unlikely)
        setSelectedImage(null);
        setImagePreview(null);
      }

      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      // Silent failure per requirement
      console.error("Error sending message:", error);
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
        socket.emit("stop_typing", {
          userId: user._id,
          recipientId: selectedUser._id,
        });
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
        prev.map((m) =>
          m.id === id ? { ...m, reactions: resp.data.reactions } : m
        )
      );
    } catch (e) {
      toast.error("Failed to react");
    }
  };

  const handleForwardTo = async (targetUserId) => {
    try {
      if (!forwardSource || !targetUserId) return;
      const formData = new FormData();
      formData.append("content", forwardSource.content || "");
      const token = localStorage.getItem("token");
      const resp = await axios.post(
        `${baseURL}/api/messages/${targetUserId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const dto = resp?.data;
      if (
        selectedUser?._id &&
        String(targetUserId) === String(selectedUser._id)
      ) {
        const idStr = dto?.id ? String(dto.id) : null;
        if (!idStr || !seenIdsRef.current.has(idStr)) {
          if (idStr) seenIdsRef.current.add(idStr);
          setMessages((prev) => [...prev, { ...dto, status: "sent" }]);
        }
      }
    } catch (e) {
      // Silent failure per requirement
      console.error("Failed to forward message", e);
    } finally {
      setShowForwardDialog(false);
      setForwardSource(null);
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
      await axios.delete(
        `${baseURL}/api/messages/chat/${selectedUser._id}?for=${scope}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages([]);
      setShowMenu(false);
    } catch (e) {
      toast.error("Failed to delete chat");
    }
  };

  const findMessageById = (id) =>
    messages.find((m) => String(m.id) === String(id));

  const renderHighlighted = (text) => {
    if (!chatSearchQuery) return [text];
    try {
      const parts = text.split(
        new RegExp(
          `(${chatSearchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`,
          "ig"
        )
      );
      return parts.map((part, i) =>
        part.toLowerCase() === chatSearchQuery.toLowerCase() ? (
          <mark
            key={`mk-${i}`}
            className="bg-yellow-300/20 text-yellow-200 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={`tx-${i}`}>{part}</span>
        )
      );
    } catch {
      return [text];
    }
  };

  const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
  const renderMessageContent = (text) => {
    const highlighted = renderHighlighted(text);
    const wrapEmoji = (node, idxBase) => {
      if (typeof node !== "string") return node;
      const out = [];
      let buf = "";
      for (let i = 0; i < node.length; i++) {
        const ch = node[i];
        if (EMOJI_REGEX.test(ch)) {
          if (buf) {
            out.push(<span key={`t-${idxBase}-${i}`}>{buf}</span>);
            buf = "";
          }
          out.push(
            <span
              key={`e-${idxBase}-${i}`}
              className="emoji-char select-none"
              aria-hidden="false"
            >
              {ch}
            </span>
          );
        } else {
          buf += ch;
        }
      }
      if (buf) out.push(<span key={`t-end-${idxBase}`}>{buf}</span>);
      return out;
    };
    return highlighted.flatMap((n, i) => wrapEmoji(n, i));
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
      <div className="flex justify-center items-center min-h-screen bg-[#0b0f15]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-center mt-8">{error}</div>;
  }

  return (
    <div className="no-h-scroll bg-[#0b0f15] text-slate-100">
      <style>{customScrollbarStyles}</style>
      <div className="chat-shell">
        <div className="w-screen h-full flex">
          {/* Left Pane */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${
              showSidebar ? "flex" : "hidden"
            } lg:flex pane-left flex-col border-r border-white/10 bg-[#0d1117]`}
          >
            {/* Always show the chat list; welcome will appear on right until a chat is clicked */}
            <>
                {/* Sticky search */}
                <div className="sticky-head px-4 py-3 bg-[#0d1117]/95 backdrop-blur border-b border-white/10">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search conversations"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 text-slate-100 rounded-xl border border-white/10 focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {connections.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <div className="text-6xl mb-3">💬</div>
                      <p className="text-base font-medium">No connections yet</p>
                      <p className="text-xs mt-1">
                        Connect with people to start conversations
                      </p>
                    </div>
                  ) : (
                    <div className="py-2">
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
                          <motion.button
                            key={connection._id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.3) }}
                            onClick={() => {
                              setSelectedUser(connection.user);
                              setShowSidebar(false);
                              if (connection.threadId && socket) {
                                socket.emit("messages:markRead", {
                                  conversationId: connection.threadId,
                                });
                              }
                            }}
                            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                              selectedUser?._id === connection.user?._id
                                ? "bg-indigo-600/20"
                                : ""
                            }`}
                          >
                            <div className="relative shrink-0">
                              <img
                                src={
                                  connection.user?.avatarUrl
                                    ? getAvatarUrl(connection.user.avatarUrl)
                                    : "/default-avatar.png"
                                }
                                alt={connection.user?.name}
                                className="h-11 w-11 rounded-full object-cover ring-2 ring-white/10"
                              />
                              {connection.user?.isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0d1117] rounded-full" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold truncate">
                                  {connection.user?.name}
                                </p>
                                {connection.lastMessageTime && (
                                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                    {new Date(
                                      connection.lastMessageTime
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate">
                                @{connection.user?.username}
                              </p>
                              <p className="text-xs text-slate-400/80 truncate">
                                {connection.lastMessage || ""}
                              </p>
                            </div>
                            {/* Unread badge */}
                            {(() => {
                              const threadId = connection.threadId;
                              const base =
                                typeof connection.unreadCount === "number"
                                  ? connection.unreadCount
                                  : 0;
                              const count = threadId
                                ? unreadByConversationId[threadId] ?? base
                                : base;
                              const hide =
                                selectedUser?._id === connection.user?._id;
                              return !hide && count > 0 ? (
                                <span
                                  className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-semibold shadow-lg"
                                  aria-label={`${count} unread messages`}
                                  title={`${count} unread`}
                                >
                                  {count > 999 ? "999+" : count}
                                </span>
                              ) : null;
                            })()}
                          </motion.button>
                        ))}
                    </div>
                  )}
                </div>
              </>
          </motion.aside>

          {/* Right Pane */}
          <section
            className={`${
              showSidebar ? "hidden" : "flex"
            } lg:flex pane-right flex-col flex-1 min-w-0`}
          >
            {selectedUser ? (
              <>
                {/* Header */}
                <div className="sticky-head flex items-center justify-between px-4 py-3 bg-[#0b0f15]/95 backdrop-blur border-b border-white/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      className="lg:hidden p-2 rounded-full hover:bg-white/10"
                      onClick={() => setShowSidebar(true)}
                      aria-label="Back to conversations"
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
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {selectedUser.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {presenceData[selectedUser._id]?.isOnline ??
                        selectedUser.isOnline
                          ? "Online"
                          : `Last seen ${formatLastSeen(
                              presenceData[selectedUser._id]?.lastSeen ??
                                selectedUser.lastSeen
                            )}`}
                      </p>
                      {isTyping && typingUser && (
                        <div className="text-[11px] text-indigo-400 italic flex items-center gap-1">
                          <span className="inline-flex gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                          </span>
                          typing
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center relative">
                      <FiSearch className="absolute left-3 text-slate-400" />
                      <input
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Search in chat"
                        className="pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 focus:ring-2 focus:ring-indigo-500/70"
                      />
                    </div>
                    <div className="relative" ref={headerMenuRef}>
                      <button
                        onClick={() => setOpenHeaderMenu((v) => !v)}
                        className="p-2 rounded-full hover:bg-white/10"
                        aria-haspopup="menu"
                        aria-expanded={openHeaderMenu}
                        aria-label="Conversation options"
                      >
                        <FiMoreVertical className="text-slate-300" />
                      </button>
                      {openHeaderMenu && (
                        <div className="absolute left-50 mt-5 w-64 bg-[#1f1f1f] border border-white/10 shadow-2xl rounded-xl z-[200] p-1">
                          <button
                            onClick={() => setSelectionMode((v) => !v)}
                            className="menu-item"
                          >
                            {selectionMode
                              ? "Cancel selection"
                              : "Select messages"}
                          </button>
                          <button
                            onClick={() => handleBlockToggle(true)}
                            className="menu-item"
                          >
                            Block user
                          </button>
                          <button onClick={handleReport} className="menu-item">
                            Report user
                          </button>
                          <div className="menu-reactions">
                            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emo) => (
                              <button
                                key={emo}
                                onClick={() => {
                                  if (selectedMessageIds.size > 0) {
                                    const first = [...selectedMessageIds][0];
                                    handleReact(first, emo);
                                  }
                                }}
                                aria-label={`React ${emo}`}
                              >
                                {emo}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages body */}
                <div
                  ref={messageContainerRef}
                  className="chat-body flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-5"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                      <div className="text-7xl mb-4">✨</div>
                      <p className="text-xl font-semibold mb-1">
                        No messages yet
                      </p>
                      <p className="text-sm opacity-80">
                        Say hi to {selectedUser.name} and start a stunning new
                        chat.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {messages.map((message, index) => {
                          const isMine = message.senderId === user._id;
                          // Date separators
                          const currentDate = new Date(message.timestamp);
                          const prev = messages[index - 1];
                          const showDateSeparator =
                            !prev ||
                            new Date(prev.timestamp).toDateString() !==
                              currentDate.toDateString();
                          return (
                            <div key={message.id || index}>
                              {showDateSeparator && (
                                <div className="w-full flex justify-center my-2">
                                  <span className="date-separator">
                                    {(() => {
                                      const today = new Date();
                                      const yest = new Date();
                                      yest.setDate(today.getDate() - 1);
                                      if (
                                        currentDate.toDateString() ===
                                        today.toDateString()
                                      )
                                        return "Today";
                                      if (
                                        currentDate.toDateString() ===
                                        yest.toDateString()
                                      )
                                        return "Yesterday";
                                      return currentDate.toLocaleDateString();
                                    })()}
                                  </span>
                                </div>
                              )}
                              <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{
                                  duration: 0.16,
                                  ease: [0.2, 0.7, 0.3, 1],
                                }}
                                className={`group relative flex ${
                                  isMine ? "justify-end" : "justify-start"
                                }`}
                                onMouseEnter={() =>
                                  setHoverQuickFor(message.id)
                                }
                                onMouseLeave={() =>
                                  setHoverQuickFor((v) =>
                                    v === message.id ? null : v
                                  )
                                }
                              >
                                <div
                                  className={`max-w-[72%] ${
                                    isMine ? "order-2" : "order-1"
                                  }`}
                                >
                                  <div
                                    className={`bubble ${
                                      isMine ? "bubble-sent" : "bubble-received"
                                    } smooth-transition`}
                                  >
                                    {selectionMode && (
                                      <div
                                        className={
                                          isMine
                                            ? "text-indigo-100 mb-1"
                                            : "text-slate-400 mb-1"
                                        }
                                      >
                                        <label className="inline-flex items-center gap-2 text-xs">
                                          <input
                                            type="checkbox"
                                            className="accent-indigo-500"
                                            checked={selectedMessageIds.has(
                                              message.id
                                            )}
                                            onChange={() =>
                                              toggleMessageSelection(message.id)
                                            }
                                          />{" "}
                                          Select
                                        </label>
                                      </div>
                                    )}
                                    {message.replyTo?.id && (
                                      <div
                                        className={`${
                                          isMine ? "bg-white/10" : "bg-white/5"
                                        } rounded-xl mb-2 p-2 border border-white/10`}
                                      >
                                        <div className="text-[11px] opacity-70 mb-1">
                                          Replying to
                                        </div>
                                        <div className="text-xs line-clamp-2">
                                          {findMessageById(message.replyTo.id)
                                            ?.content || "Media"}
                                        </div>
                                      </div>
                                    )}
                                    {message.content && (
                                      <div className="message-content">
                                        {renderMessageContent(message.content)}
                                      </div>
                                    )}
                                    {message.attachments &&
                                      message.attachments.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                          {message.attachments.map(
                                            (attachment, idx) =>
                                              attachment.startsWith(
                                                "/forum/"
                                              ) ? (
                                                <a
                                                  key={idx}
                                                  href={attachment}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    window.location.href =
                                                      attachment;
                                                  }}
                                                  className="block p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                                                >
                                                  <div className="text-sm font-semibold text-slate-100">
                                                    Forum Post
                                                  </div>
                                                  <div className="text-xs text-slate-300">
                                                    Tap to open the original
                                                    post
                                                  </div>
                                                </a>
                                              ) : (
                                                <img
                                                  key={idx}
                                                  src={attachment}
                                                  alt="attachment"
                                                  onClick={() =>
                                                    setLightboxSrc(attachment)
                                                  }
                                                  className="media-img cursor-zoom-in hover:opacity-90 transition"
                                                />
                                              )
                                          )}
                                        </div>
                                      )}
                                    {/* Timestamp below bubble */}
                                    <div
                                      className={`timestamp-below ${
                                        isMine
                                          ? "text-indigo-100/70 text-right"
                                          : "text-slate-300/70 text-left"
                                      }`}
                                    >
                                      <span>
                                        {new Date(
                                          message.timestamp
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                      {isMine && (
                                        <span className="inline-flex items-center ml-1 align-middle">
                                          {message.status === "sent" && (
                                            <FiCheck size={14} color="#888" />
                                          )}
                                          {message.status === "delivered" && (
                                            <BiCheckDouble
                                              size={14}
                                              color="#888"
                                            />
                                          )}
                                          {message.status === "seen" && (
                                            <BiCheckDouble
                                              size={14}
                                              color="#0A84FF"
                                            />
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Hover emoji trigger outside bubble */}
                                {hoverQuickFor === message.id && (
                                  <div
                                    className={`absolute ${
                                      isMine
                                        ? "right-0 -mr-10"
                                        : "left-0 -ml-10"
                                    } top-1/2 -translate-y-1/2`}
                                  >
                                    <button
                                      className="emoji-trigger"
                                      title="React"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveReactionFor(
                                          activeReactionFor === message.id
                                            ? null
                                            : message.id
                                        );
                                      }}
                                      aria-haspopup="true"
                                      aria-expanded={
                                        activeReactionFor === message.id
                                      }
                                    >
                                      😊
                                    </button>
                                    {activeReactionFor === message.id && (
                                      <div
                                        className={`reaction-popover ${
                                          isMine ? "right-0" : "left-0"
                                        }`}
                                        role="menu"
                                        aria-label="Reactions"
                                      >
                                        {[
                                          "👍",
                                          "❤️",
                                          "😂",
                                          "😮",
                                          "😢",
                                          "👏",
                                        ].map((emo) => (
                                          <button
                                            key={emo}
                                            className="reaction-btn"
                                            onClick={() => {
                                              handleReact(message.id, emo);
                                              setActiveReactionFor(null);
                                            }}
                                          >
                                            {emo}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Caret trigger beside bubble - dropdown in front of message */}
                                <div
                                  className={`caret-trigger absolute ${
                                    isMine ? "right-0 -mr-10" : "left-0 -ml-10"
                                  } top-[calc(50%+46px)]`}
                                >
                                  <div className="relative">
                                    <button
                                      className="caret-button focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                      aria-haspopup="menu"
                                      aria-expanded={
                                        menuPortal.open &&
                                        menuPortal.messageId === message.id
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        lastFocusRef.current = e.currentTarget;
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        const baseItems = [
                                          {
                                            label: "Reply",
                                            icon: <FiCornerUpLeft />,
                                            onSelect: () =>
                                              setReplyTo({ id: message.id }),
                                          },
                                          {
                                            label: "Copy",
                                            icon: <FiCopy />,
                                            onSelect: () =>
                                              navigator.clipboard.writeText(
                                                message.content || ""
                                              ),
                                          },
                                          {
                                            label: "Forward",
                                            icon: <FiShare2 />,
                                            onSelect: () => {
                                              setForwardSource(message);
                                              setShowForwardDialog(true);
                                            },
                                          },
                                          {
                                            label: "Star / Pin",
                                            icon: <FiStar />,
                                            onSelect: () =>
                                              toast.success("Starred"),
                                          },
                                          {
                                            label: "Delete for me",
                                            icon: <FiTrash2 />,
                                            onSelect: () =>
                                              handleDeleteSingle(
                                                message.id,
                                                "me"
                                              ),
                                          },
                                          {
                                            label: selectionMode
                                              ? "Cancel select"
                                              : "Select",
                                            icon: <FiCheckSquare />,
                                            onSelect: () =>
                                              setSelectionMode((v) => !v),
                                          },
                                          {
                                            label: "Report",
                                            icon: <FiFlag />,
                                            onSelect: () => handleReport(),
                                          },
                                          {
                                            label: "Info",
                                            icon: <FiInfo />,
                                            onSelect: () =>
                                              toast.info("Info coming soon"),
                                          },
                                        ];
                                        const x = Math.min(
                                          window.innerWidth - 260,
                                          Math.max(
                                            8,
                                            rect.left - 200 + rect.width / 2
                                          )
                                        );
                                        const y = Math.min(
                                          window.innerHeight - 12,
                                          Math.max(12, rect.bottom + 8)
                                        );
                                        setMenuPortal({
                                          open: true,
                                          x,
                                          y,
                                          items: baseItems,
                                          messageId: message.id,
                                          focusIndex: 0,
                                        });
                                      }}
                                    >
                                      <FiChevronDown />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                      </AnimatePresence>
                      <div style={{ height: "72px" }} />
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div
                  className="sticky-compose px-4 py-3 bg-[#0b0f15]/95 backdrop-blur border-t border-white/10"
                  style={{
                    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 12px)`,
                  }}
                >
                  {imagePreview && (
                    <div className="mb-3 relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-28 object-cover rounded-xl ring-1 ring-white/15"
                        style={{ maxWidth: "min(60vw, 420px)" }}
                      />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 grid place-items-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {replyTo?.id && (
                    <div className="mb-2 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start justify-between">
                      <div>
                        <div className="text-[11px] font-semibold text-indigo-300 mb-1">
                          Replying to
                        </div>
                        <div className="text-xs text-indigo-200/90 line-clamp-2">
                          {findMessageById(replyTo.id)?.content || "Media"}
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="text-indigo-300 hover:text-indigo-200"
                      >
                        <FiX />
                      </button>
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      handleSendMessage(e);
                    }}
                    className="flex items-end gap-3"
                  >
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            handleSendMessage(e);
                          }
                        }}
                        placeholder="Type a message"
                        className="w-full px-4 py-3 pr-12 bg-white/5 text-slate-100 rounded-xl border border-white/10 focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-300"
                        >
                          <FiImage />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmojiPicker((v) => !v);
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-300"
                        >
                          <FiSmile />
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      {showEmojiPicker && (
                        <div
                          className="absolute bottom-full right-0 mb-2 z-popover"
                          ref={emojiAreaRef}
                        >
                          <Picker
                            onEmojiClick={(emojiData) => {
                              const emoji = emojiData?.emoji || "";
                              setNewMessage((prev) => prev + emoji);
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
                      className="px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 focus-visible:ring-2 focus-visible:ring-indigo-500/70 disabled:opacity-50"
                    >
                      <FiSend />
                    </button>
                  </form>
                  {selectionMode && (
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                      <div>Selected: {selectedMessageIds.size}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBulkDelete("me")}
                          className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                        >
                          Delete for me
                        </button>
                        <button
                          onClick={() => handleBulkDelete("everyone")}
                          className="px-3 py-2 rounded-lg border border-white/10 text-red-400 hover:bg-red-500/10"
                        >
                          Delete for everyone
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full w-full welcome-bg flex items-center justify-center">
                <div className="welcome-card rounded-3xl shadow-2xl p-8 md:p-10 max-w-2xl w-[92%] text-center" style={{ fontFamily: 'Inter, Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji' }}>
                  <div className="mx-auto mb-6 floaty" aria-hidden="true">
                    {/* Simple alumni-themed vector: open book + chat bubbles + handshake */}
                    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                      {/* Book */}
                      <rect x="24" y="40" width="52" height="72" rx="8" fill="#BBDEFB" stroke="#90CAF9"/>
                      <rect x="84" y="40" width="52" height="72" rx="8" fill="#E1BEE7" stroke="#CE93D8"/>
                      <line x1="80" y1="40" x2="80" y2="112" stroke="#9CA3AF" strokeWidth="2"/>
                      {/* Pages */}
                      <path d="M28 48C40 44 60 44 72 48" stroke="#64B5F6" strokeWidth="2"/>
                      <path d="M88 48C100 44 120 44 132 48" stroke="#BA68C8" strokeWidth="2"/>
                      {/* Chat bubbles */}
                      <rect x="18" y="18" width="38" height="22" rx="8" fill="#A7F3D0" stroke="#34D399"/>
                      <path d="M30 40 L28 46 L36 41" fill="#A7F3D0"/>
                      <rect x="104" y="14" width="38" height="22" rx="8" fill="#BFDBFE" stroke="#60A5FA"/>
                      <path d="M122 36 L120 42 L128 37" fill="#BFDBFE"/>
                      {/* Handshake */}
                      <path d="M58 112 C68 100 92 100 102 112" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round"/>
                      <circle cx="60" cy="114" r="6" fill="#FDE68A" stroke="#F59E0B"/>
                      <circle cx="100" cy="114" r="6" fill="#FDE68A" stroke="#F59E0B"/>
                    </svg>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold mb-3 text-blue-800">Welcome to MIT’s AlumniConnect!</h2>
                  <p className="text-lg md:text-xl text-slate-700">Let’s stay connected. Enjoy real-time conversations and networking.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/80 z-popover flex items-center justify-center"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="media"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
          />
        </div>
      )}
      {/* Forward dialog */}
      {showForwardDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-popover"
          onClick={() => setShowForwardDialog(false)}
        >
          <div
            className="bg-[#0f1320] text-slate-100 rounded-2xl shadow-2xl w-full max-w-md p-4 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold mb-3">Forward message</div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-white/10">
              {connections.map((c) => (
                <label
                  key={c._id}
                  className="w-full p-3 hover:bg-white/5 flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={forwardSelected.has(c._id)}
                    onChange={(e) => {
                      setForwardSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(c._id);
                        else next.delete(c._id);
                        return next;
                      });
                    }}
                  />
                  <img
                    src={
                      c.user?.avatarUrl
                        ? getAvatarUrl(c.user.avatarUrl)
                        : "/default-avatar.png"
                    }
                    alt="avatar"
                    className="h-8 w-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{c.user?.name}</div>
                    <div className="text-xs text-slate-400">
                      @{c.user?.username}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-between">
              <button
                onClick={() => {
                  setForwardSelected(new Set());
                  setShowForwardDialog(false);
                }}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const ids = Array.from(forwardSelected);
                  for (const id of ids) {
                    await handleForwardTo(id);
                  }
                  setForwardSelected(new Set());
                  setShowForwardDialog(false);
                }}
                disabled={forwardSelected.size === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 disabled:opacity-50"
              >
                Forward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full menu portal */}
      {menuPortal.open &&
        createPortal(
          <div
            ref={menuPortalRef}
            className="full-menu z-popover"
            role="menu"
            aria-label="Message actions"
            style={{ left: menuPortal.x, top: menuPortal.y }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                setMenuPortal((s) => ({
                  ...s,
                  focusIndex:
                    (s.focusIndex + (e.shiftKey ? -1 : 1) + s.items.length) %
                    s.items.length,
                }));
              }
            }}
          >
            {menuPortal.items.map((it, idx) => (
              <button
                key={it.label}
                className="menu-item"
                role="menuitem"
                aria-selected={menuPortal.focusIndex === idx}
                autoFocus={menuPortal.focusIndex === idx}
                onMouseEnter={() =>
                  setMenuPortal((s) => ({ ...s, focusIndex: idx }))
                }
                onClick={() => {
                  it.onSelect();
                  setMenuPortal((s) => ({ ...s, open: false }));
                  setTimeout(() => lastFocusRef.current?.focus(), 0);
                }}
              >
                <span className="opacity-90">{it.icon}</span>
                <span className="text-sm">{it.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default MessagesPage;
