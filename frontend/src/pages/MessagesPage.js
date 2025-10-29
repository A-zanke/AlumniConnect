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
import { Link, useNavigate } from "react-router-dom";
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
  FiExternalLink,
  FiClock,
  FiEye,
  FiUsers,
  FiSettings,
  FiDownload,
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
import MediaDownloadOverlay from "../components/ui/MediaDownloadOverlay";

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  // Attachment selection (WhatsApp-like)
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFileField, setSelectedFileField] = useState("image");
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
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
  const [sharedLinks, setSharedLinks] = useState([]);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("media");
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerSearchKeyword, setHeaderSearchKeyword] = useState("");
  const [headerSearchFrom, setHeaderSearchFrom] = useState("");
  const [headerSearchTo, setHeaderSearchTo] = useState("");
  const [headerSearchResults, setHeaderSearchResults] = useState([]);
  const headerSearchRef = useRef(null);
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
  const [uploadProgress, setUploadProgress] = useState({}); // id -> 0..100
  const [mediaLoaded, setMediaLoaded] = useState({}); // url -> boolean
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [downloadedMedia, setDownloadedMedia] = useState(() => {
    // Load downloaded media from localStorage
    try {
      const saved = localStorage.getItem('downloadedMedia');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }); // url -> boolean (for receiver)
  const [downloadProgress, setDownloadProgress] = useState({}); // url -> 0..100

  const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || baseURL;

  // Media URL helpers for rendering and text auto-preview
  const isImageUrl = (u = "") =>
    /\.(jpg|jpeg|png|gif|webp|bmp|tiff)(\?.*)?$/i.test(u);
  const isVideoUrl = (u = "") => /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(u);
  const isAudioUrl = (u = "") =>
    /\.(mp3|wav|ogg|m4a|aac|flac|opus|wma)(\?.*)?$/i.test(u);
  const isDocUrl = (u = "") =>
    /\.(pdf|doc|docx|txt|xlsx|xls|ppt|pptx|zip|rar|7z)(\?.*)?$/i.test(u);
  const getMediaTypeFromUrl = (u = "") =>
    isImageUrl(u)
      ? "image"
      : isVideoUrl(u)
      ? "video"
      : isAudioUrl(u)
      ? "audio"
      : isDocUrl(u)
      ? "document"
      : null;
  const extractUrls = (text = "") => {
    try {
      return text.match(/https?:\/\/\S+/g) || [];
    } catch {
      return [];
    }
  };
  const isOnlyUrlText = (text = "") => {
    const urls = extractUrls(text);
    const stripped = text.replace(urls[0] || "", "").trim();
    return urls.length === 1 && stripped === "";
  };
  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${
      sizes[i]
    }`;
  };
  const resolveMediaUrl = (u = "") =>
    u && u.startsWith("/uploads") ? `${baseURL}${u}` : u;

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

  // Handle media download with progress tracking
  const handleMediaDownload = async (url) => {
    if (downloadedMedia[url]) return; // Already downloaded
    
    try {
      setDownloadProgress((prev) => ({ ...prev, [url]: 0 }));
      
      // Don't use withCredentials for Cloudinary URLs to avoid CORS issues
      const response = await axios.get(url, {
        responseType: 'blob',
        withCredentials: false, // Important: avoid CORS issues with Cloudinary
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setDownloadProgress((prev) => ({ ...prev, [url]: percentCompleted }));
        },
      });
      
      // Mark as downloaded and save to localStorage
      const updatedDownloaded = { ...downloadedMedia, [url]: true };
      setDownloadedMedia(updatedDownloaded);
      
      // Persist to localStorage
      try {
        localStorage.setItem('downloadedMedia', JSON.stringify(updatedDownloaded));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
      
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
      toast.error('Failed to load media');
    }
  };

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

  // Fetch initial block list so history stays visible but input is disabled
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const token = localStorage.getItem("token");
        const resp = await axios.get(`${baseURL}/api/messages/blocks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blocked = (resp?.data?.blocked || []).map((u) => String(u._id));
        setBlockedUsers(new Set(blocked));
      } catch (e) {
        // ignore silently
      }
    };
    if (user) fetchBlocks();
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
        ({
          conversationId,
          messageId,
          senderId,
          body,
          attachments = [],
          createdAt,
          isForwarded,
          forwardedFrom,
        }) => {
          // Deduplicate message events by messageId
          if (messageId && seenIdsRef.current.has(String(messageId))) return;
          if (messageId) seenIdsRef.current.add(String(messageId));

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
                attachments: Array.isArray(attachments) ? attachments : [],
                timestamp: createdAt,
                status: "delivered",
                isForwarded,
                forwardedFrom,
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

      // Deletions (align with backend event names)
      // Single message delete
      s.on("message:deleted", (payload = {}) => {
        const { messageId, scope, placeholder } = payload;
        if (!messageId) return;
        if (scope === "everyone") {
          // Show placeholder on both sides
          setMessages((prev) =>
            prev.map((m) =>
              String(m.id) === String(messageId)
                ? {
                    ...m,
                    content: "This message was deleted",
                    attachments: [],
                    messageType: "text",
                  }
                : m
            )
          );
        } else {
          // Deleted for me only – remove from my view
          setMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId)));
        }
      });

      // Bulk delete messages
      s.on("messages:bulkDeleted", (payload = {}) => {
        const { messageIds = [], scope } = payload;
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;
        const ids = new Set(messageIds.map(String));
        if (scope === "everyone") {
          // Convert to placeholders
          setMessages((prev) =>
            prev.map((m) =>
              ids.has(String(m.id))
                ? {
                    ...m,
                    content: "This message was deleted",
                    attachments: [],
                    messageType: "text",
                  }
                : m
            )
          );
        } else {
          // Remove only for me
          setMessages((prev) => prev.filter((m) => !ids.has(String(m.id))));
        }
      });

      // Entire chat deleted
      s.on("chat:deleted", (payload = {}) => {
        const { userId, scope } = payload;
        const current = selectedUserRef.current;
        if (!current || String(userId) !== String(current._id)) return;
        // For both scopes, my UI should clear; on reload server enforces correct visibility
        setMessages([]);
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

  // Compute first unread index and count (messages addressed to me and not read)
  const firstUnreadIndex = React.useMemo(() => {
    return messages.findIndex(
      (m) => String(m.recipientId) === String(user?._id) && m.isRead === false
    );
  }, [messages, user]);
  const unreadCount = React.useMemo(() => {
    return messages.reduce(
      (acc, m) => acc + (String(m.recipientId) === String(user?._id) && m.isRead === false ? 1 : 0),
      0
    );
  }, [messages, user]);

  useEffect(() => {
    // Prefer auto-scroll to the first unread message if present; otherwise to bottom
    if (firstUnreadIndex > 0) {
      const id = messages[firstUnreadIndex]?.id;
      if (id) {
        setTimeout(() => {
          const el = document.querySelector(`[data-mid="${id}"]`);
          if (el && messageContainerRef.current) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 50);
        return;
      }
    }
    scrollToBottom();
  }, [messages, scrollToBottom, firstUnreadIndex]);

  // Toggle jump-to-bottom arrow when scrolled up
  useEffect(() => {
    const el = messageContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      setShowJumpToBottom(!nearBottom);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [messageContainerRef.current]);

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
        setSharedMedia(Array.isArray(resp?.data?.media) ? resp.data.media : []);
        setSharedLinks(Array.isArray(resp?.data?.links) ? resp.data.links : []);
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

    const hasAnyMedia =
      selectedImages.length > 0 ||
      selectedVideos.length > 0 ||
      selectedDocs.length > 0 ||
      !!selectedImage;
    if ((!newMessage.trim() && !hasAnyMedia) || !selectedUser) return;

    const token = localStorage.getItem("token");
    const textContent = newMessage.trim();
    
    // Reset form immediately to clear input area
    const savedReplyTo = replyTo;
    setNewMessage("");
    setSelectedImage(null);
    setImagePreview(null);
    const imagesToSend = [...selectedImages];
    const videosToSend = [...selectedVideos];
    const docsToSend = [...selectedDocs];
    setSelectedImages([]);
    setSelectedVideos([]);
    setSelectedDocs([]);
    setReplyTo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    try {
      // WhatsApp-style: Send text message first if there's text with media
      if (textContent && hasAnyMedia) {
        const textFormData = new FormData();
        textFormData.append("content", textContent);
        const clientKey = generateClientKey();
        textFormData.append("clientKey", clientKey);
        
        if (savedReplyTo?.id) {
          textFormData.append("replyToId", savedReplyTo.id);
        }
        
        // Create optimistic text message
        const optimisticText = {
          id: clientKey,
          senderId: user._id,
          recipientId: selectedUser._id,
          content: textContent,
          attachments: [],
          timestamp: new Date().toISOString(),
          status: "sending",
        };
        setMessages((prev) => [...prev, optimisticText]);
        
        // Send text message
        await axios.post(
          `${baseURL}/api/messages/${selectedUser._id}`,
          textFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      
      // Collect all media files
      const allMediaFiles = [
        ...imagesToSend.slice(0, 5).map(f => ({ file: f, type: 'image' })),
        ...videosToSend.slice(0, 5).map(f => ({ file: f, type: 'video' })),
        ...docsToSend.slice(0, 3).map(f => ({ file: f, type: 'document' })),
      ];
      
      // Send each media file as a separate message
      for (const mediaItem of allMediaFiles) {
        const formData = new FormData();
        formData.append("content", ""); // Empty content for media-only messages
        formData.append(mediaItem.type, mediaItem.file);
        
        const clientKey = generateClientKey();
        formData.append("clientKey", clientKey);
        
        // Create optimistic message for this media
        const localUrl = URL.createObjectURL(mediaItem.file);
        const optimisticMedia = {
          id: clientKey,
          senderId: user._id,
          recipientId: selectedUser._id,
          content: "",
          attachments: [{
            url: localUrl,
            type: mediaItem.type,
            name: mediaItem.file.name,
          }],
          timestamp: new Date().toISOString(),
          status: "sending",
          uploading: true,
        };
        setMessages((prev) => [...prev, optimisticMedia]);
        
        // Send media message
        await axios.post(
          `${baseURL}/api/messages/${selectedUser._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            onUploadProgress: (evt) => {
              const percent = Math.round((evt.loaded * 100) / (evt.total || 1));
              setUploadProgress((prev) => ({ ...prev, [clientKey]: percent }));
            },
          }
        );
      }
      
      // Handle text-only message
      if (textContent && !hasAnyMedia) {
        const clientKey = generateClientKey();
        const optimistic = {
          id: clientKey,
          senderId: user._id,
          recipientId: selectedUser._id,
          content: textContent,
          attachments: [],
          timestamp: new Date().toISOString(),
          status: "sent",
          replyTo: savedReplyTo,
        };
        setMessages((prev) => [...prev, optimistic]);
        
        if (socket) {
          const socketAttachments = [];
          if (savedReplyTo?.id) socketAttachments.push(`reply:${savedReplyTo.id}`);
          socket.emit("chat:send", {
            to: selectedUser._id,
            content: textContent,
            clientKey,
            attachments: socketAttachments,
          });
        }
      }
      
      setTimeout(scrollToBottom, 50);
      
      // Refresh messages after all uploads
      setTimeout(() => {
        fetchMessagesData();
      }, 1000);
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      // Reset file input to avoid stuck state after background upload success
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      const to =
        selectedUser?._id ||
        messages.find((m) => String(m.id) === String(messageId))?.recipientId;
      const resp = await axios.post(
        `${baseURL}/api/messages/react`,
        { messageId: String(messageId), emoji, to },
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
    }
  };

  const handleDeleteSingle = async (id, scope = "me") => {
    try {
      if (scope === "everyone") {
        const m = messages.find((mm) => String(mm.id) === String(id));
        if (!m || String(m.senderId) !== String(user._id)) {
          toast.error("Only your messages can be deleted for everyone");
          return;
        }
      }
      const token = localStorage.getItem("token");
      // Use dedicated single-message delete route to avoid colliding with deleteChat (/:userId)
      await axios.delete(`${baseURL}/api/messages/id/${id}?for=${scope}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update UI instantly: if delete for everyone and it's my message, replace with placeholder like WhatsApp
      if (scope === "everyone") {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(id)
              ? {
                  ...m,
                  content: "This message was deleted",
                  attachments: [],
                  messageType: "text",
                }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (e) {
      toast.error("Failed to delete message");
    }
  };

  // Delete entire chat for current user like WhatsApp
  const handleDeleteEntireChat = async () => {
    if (!selectedUser) return;
    if (!window.confirm("Delete this chat for you? This can't be undone."))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${baseURL}/api/messages/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages([]);
      setConnections((prev) =>
        prev.map((c) =>
          c.user?._id === selectedUser._id
            ? { ...c, lastMessage: "", lastMessageTime: null }
            : c
        )
      );
      toast.success("Chat deleted");
    } catch (e) {
      toast.error("Failed to delete chat");
    }
  };

  const handleBulkDelete = async (scope = "me") => {
    try {
      const ids = Array.from(selectedMessageIds);
      if (ids.length === 0) return;
      if (scope === "everyone") {
        // Ensure only my messages are in the selection for delete-everyone
        const invalid = ids.some((id) => {
          const m = messages.find((mm) => String(mm.id) === String(id));
          return !m || String(m.senderId) !== String(user._id);
        });
        if (invalid) {
          toast.error("Only your messages can be deleted for everyone");
          return;
        }
      }
      const token = localStorage.getItem("token");
      await axios.delete(`${baseURL}/api/messages/bulk-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { messageIds: ids, for: scope },
      });
      if (scope === "everyone") {
        // Replace selected with placeholders
        const idSet = new Set(ids.map(String));
        setMessages((prev) =>
          prev.map((m) =>
            idSet.has(String(m.id))
              ? { ...m, content: "This message was deleted", attachments: [], messageType: "text" }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
      }
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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const img = [];
    const vid = [];
    const docs = [];
    for (const f of files) {
      if (f.type?.startsWith("image/")) img.push(f);
      else if (f.type?.startsWith("video/")) vid.push(f);
      else docs.push(f);
    }
    setSelectedImages((prev) => prev.concat(img).slice(0, 5));
    setSelectedVideos((prev) => prev.concat(vid).slice(0, 5));
    setSelectedDocs((prev) => prev.concat(docs).slice(0, 3));
    // Keep a single primary preview if an image exists
    const previewSrc = img[0]
      ? URL.createObjectURL(img[0])
      : vid[0]
      ? URL.createObjectURL(vid[0])
      : null;
    if (previewSrc) setImagePreview(previewSrc);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedImages([]);
    setSelectedVideos([]);
    setSelectedDocs([]);
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
      if (
        !window.confirm("Delete all selected chats and their history for you?")
      )
        return;
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

  const formatDateLabel = (timestamp) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, now)) return "Today";
    if (isSameDay(d, yesterday)) return "Yesterday";
    return d.toLocaleDateString();
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
        return <Check size={16} className="text-white opacity-80" />;
      case "delivered":
        return <CheckCheck size={16} className="text-white" />;
      case "seen":
        return <CheckCheck size={16} className="text-white" />;
      default:
        return <Clock size={16} className="text-white opacity-80" />;
    }
  };

  // Render message content with emoji support and shared posts
  const renderMessageContent = (message) => {
    if (!message) return null;
    
    // Handle shared post
    if (message.metadata?.sharedPost) {
      const { postId, preview, imageUrl } = message.metadata.sharedPost;
      return (
        <div 
          className="shared-post-container border rounded-lg overflow-hidden cursor-pointer max-w-xs bg-white dark:bg-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/posts/${postId}`);
          }}
        >
          {imageUrl && (
            <div className="w-full h-40 overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Shared post" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
              {preview || 'Shared post'}
            </p>
            <div className="mt-2 text-xs text-blue-500 dark:text-blue-400">
              View post →
            </div>
          </div>
        </div>
      );
    }

    const text = message.content || '';
    if (!text) return null;

    // Simple emoji detection
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const isEmojiOnly = text.replace(emojiRegex, "").trim() === "";

    if (isEmojiOnly) {
      return <div className="text-4xl py-2">{text}</div>;
    }

    // Hide bare media URLs; we'll render dedicated preview below
    const urls = extractUrls(text);
    if (urls.length === 1 && getMediaTypeFromUrl(urls[0])) {
      return null;
    }

    // Render clickable hyperlinks in blue, like WhatsApp
    const parts = text.split(/(https?:\/\/\S+)/g);
    return (
      <div className="whitespace-pre-wrap break-words">
        {parts.map((part, idx) => {
          if (/^https?:\/\//i.test(part)) {
            // Skip if this is a shared post image URL that we already processed
            if (message.metadata?.sharedPost?.imageUrl === part) return null;
            
            return (
              <a
                key={idx}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
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

  // Close menus on outside click (keep header search open if clicking inside it)
  useEffect(() => {
    const handler = (e) => {
      setOpenMessageMenuFor(null);
      setOpenHeaderMenu(false);
      const insideHeaderSearch = headerSearchRef.current && headerSearchRef.current.contains(e.target);
      if (!insideHeaderSearch) setShowHeaderSearch(false);
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
            {showJumpToBottom && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute right-6 bottom-28 bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-green-600"
                title="Jump to latest"
              >
                <FiChevronDown />
              </button>
            )}
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
                    <div className="relative z-50">
                      <img
                        src={
                          connection.user?.avatarUrl
                            ? getAvatarUrl(connection.user.avatarUrl)
                            : "/default-avatar.png"
                        }
                        alt={connection.user?.name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => (e.target.src = "/default-avatar.png")}
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
                        <div className="min-w-0">
                          <p className="text-sm text-gray-600 truncate">
                            {getLastMessagePreview(connection)}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            @{connection.user?.username}
                          </p>
                        </div>

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
                Delete chats
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
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
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
                    onDoubleClick={() =>
                      navigate(
                        selectedUser.username
                          ? `/profile/${selectedUser.username}`
                          : `/profile/id/${selectedUser._id}`
                      )
                    }
                    className="font-semibold text-gray-900 hover:underline text-left"
                    title="View profile"
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
                {/* Header search toggler */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHeaderSearch((v) => !v);
                      setOpenHeaderMenu(false);
                    }}
                    className="p-2 rounded-full hover:bg-gray-200"
                    title="Search in chat"
                  >
                    <FiSearch />
                  </button>

                  {showHeaderSearch && (
                    <div ref={headerSearchRef} className="absolute right-0 mt-2 w-[320px] bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={headerSearchKeyword}
                          onChange={(e) => setHeaderSearchKeyword(e.target.value)}
                          placeholder="Search messages"
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={headerSearchFrom}
                            onChange={(e) => setHeaderSearchFrom(e.target.value)}
                            className="px-3 py-2 border rounded-md"
                          />
                          <input
                            type="date"
                            value={headerSearchTo}
                            onChange={(e) => setHeaderSearchTo(e.target.value)}
                            className="px-3 py-2 border rounded-md"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem("token");
                                const params = new URLSearchParams();
                                params.set("query", headerSearchKeyword || "");
                                if (selectedUser?._id) params.set("userId", selectedUser._id);
                                if (headerSearchFrom) params.set("dateFrom", headerSearchFrom);
                                if (headerSearchTo) params.set("dateTo", headerSearchTo);
                                const resp = await axios.get(`${baseURL}/api/messages/search?${params.toString()}`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                const results = Array.isArray(resp?.data?.messages) ? resp.data.messages : [];
                                setHeaderSearchResults(results);
                              } catch (e) {
                                toast.error("Search failed");
                              }
                            }}
                            className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                          >
                            Search
                          </button>
                          <button
                            onClick={() => {
                              setHeaderSearchKeyword("");
                              setHeaderSearchFrom("");
                              setHeaderSearchTo("");
                              setHeaderSearchResults([]);
                            }}
                            className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                          >
                            Reset
                          </button>
                        </div>

                        {headerSearchResults.length > 0 && (
                          <div className="max-h-64 overflow-y-auto mt-2 divide-y">
                            {headerSearchResults.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  setShowHeaderSearch(false);
                                  const el = document.querySelector(`[data-mid="${m.id}"]`);
                                  if (el && messageContainerRef.current) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                  } else {
                                    toast.info("Message not in current window. Scroll or load history.");
                                  }
                                }}
                                className="w-full text-left py-2 hover:bg-gray-50"
                              >
                                <div className="text-sm text-gray-800 truncate">{m.content || (m.attachments?.length ? "Media message" : "Message")}</div>
                                <div className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleString()}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                        onClick={() =>
                          navigate(
                            selectedUser.username
                              ? `/profile/${selectedUser.username}`
                              : `/profile/id/${selectedUser._id}`
                          )
                        }
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FiUsers /> View profile
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
                          handleDeleteEntireChat();
                          setOpenHeaderMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-red-600"
                      >
                        <FiTrash2 /> Clear Chat
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

              {/* Pinned message header */}
              {pinnedMessages.size > 0 && (
                <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-3">
                  <span className="text-yellow-600">📌</span>
                  {(() => {
                    const firstId = Array.from(pinnedMessages)[0];
                    const pmIndex = messages.findIndex(
                      (m) => String(m.id) === String(firstId)
                    );
                    const pm = messages[pmIndex];
                    const preview =
                      pm?.content ||
                      (pm?.attachments?.length ? "Media" : "Pinned");
                    return (
                      <button
                        onClick={() => {
                          const el = document.querySelector(
                            `[data-mid="${firstId}"]`
                          );
                          if (el && messageContainerRef.current) {
                            el.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }
                        }}
                        className="flex-1 text-left truncate text-sm text-gray-800 hover:underline"
                      >
                        {preview}
                      </button>
                    );
                  })()}
                  <button
                    onClick={async () => {
                      const id = Array.from(pinnedMessages)[0];
                      try {
                        const token = localStorage.getItem("token");
                        await axios.post(
                          `${baseURL}/api/messages/pin`,
                          { messageId: id, pin: false },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                      } catch {}
                      setPinnedMessages(new Set());
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Unpin
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-indigo-50 via-sky-50 to-blue-50"
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
                          <div className="flex justify-center my-4 sticky top-2 z-10">
                            <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full shadow">
                              {formatDateLabel(message.timestamp)}
                            </span>
                          </div>
                        )}
                        {/* Unread separator */}
                        {index === firstUnreadIndex && unreadCount > 0 && (
                          <div className="flex justify-center my-3">
                            <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full shadow">
                              {unreadCount === 1 ? "1 unread message" : `${unreadCount} unread messages`}
                            </span>
                          </div>
                        )}

                        {/* Message */}
                        <motion.div
                          key={message.uniqueKey || message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`flex ${
                            isMine ? "justify-end" : "justify-start"
                          } group`}
                          data-mid={message.id}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md relative ${
                              isMine ? "order-2" : "order-1"
                            }`}
                          >
                            {/* System banner (block/unblock history) */}
                            {message.isSystem && (
                              <div className="mb-2 text-center text-xs text-gray-500">
                                {message.content}
                              </div>
                            )}
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
                              className={`relative px-4 py-2 rounded-2xl shadow-sm ${
                                isMine
                                  ? "bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-br-sm bubble--mine"
                                  : "bg-white text-gray-900 rounded-bl-sm border border-gray-200 bubble--other"
                              }`}
                            >
                              {/* Forwarded label - WhatsApp style (only for actually forwarded messages) */}
                              {(message.isForwarded === true && message.forwardedFrom && message.forwardedFrom.originalSender) && (
                                <div className={`text-xs mb-2 flex items-center gap-1 italic ${isMine ? "text-white/80" : "text-gray-600"}`}>
                                  <FiCornerUpLeft className="inline-block" size={12} />
                                  <span>
                                    {message.forwardedFrom?.forwardCount > 5 
                                      ? "Forwarded many times" 
                                      : "Forwarded"}
                                  </span>
                                </div>
                              )}

                              {/* Message content */}
                              {message.content &&
                                renderMessageContent(message.content)}

                              {/* Attachments */}
                              {/* Attachments + implicit media URL in text (only for true media URLs) */}
                              {(() => {
                                const implicitMedia = (extractUrls(message.content) || []).filter((u) => !!getMediaTypeFromUrl(u));
                                const allAttachments = (message.attachments && message.attachments.length > 0)
                                  ? message.attachments
                                  : implicitMedia;
                                if (!allAttachments || allAttachments.length === 0) return null;
                                // Group multiple images into a grid like WhatsApp
                                const parsed = allAttachments
                                  .map((attachment) => {
                                    // Handle both string URLs and object attachments
                                    if (typeof attachment === 'object' && attachment?.url) {
                                      // Object attachment (from optimistic message)
                                      return {
                                        url: attachment.url,
                                        type: attachment.type,
                                        name: attachment.name,
                                      };
                                    }
                                    // String URL
                                    const url = typeof attachment === 'string' ? attachment : attachment?.url;
                                    const t = getMediaTypeFromUrl(url || '');
                                    // Only treat recognized media types as attachments; plain http links are not attachments
                                    if (!t) return null;
                                    return { url, type: t };
                                  })
                                  .filter((a) => !!a && !!a.url);
                                if (parsed.length === 0) return null;
                                const images = parsed.filter((a) => a.type === 'image');
                                const nonImages = parsed.filter((a) => a.type !== 'image');
                                return (
                                  <div className="mt-2 space-y-3">
                                    {images.length > 0 && (
                                      <div className={`grid gap-1 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : images.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                        {images.map((att, idx) => {
                                          const mediaUrl = resolveMediaUrl(att.url);
                                          const isDownloaded = downloadedMedia[mediaUrl] || isMine;
                                          const isDownloading = downloadProgress[mediaUrl] !== undefined;
                                          
                                          return (
                                            <div key={`img-${idx}`} className="relative group overflow-hidden rounded-lg" style={{ maxWidth: images.length === 1 ? '300px' : '100%' }}>
                                              <img
                                                src={mediaUrl}
                                                alt="attachment"
                                                className={`w-full object-cover rounded-lg cursor-pointer transition-all ${
                                                  !isMine && !isDownloaded ? 'blur-md' : ''
                                                }`}
                                                style={{ height: images.length === 1 ? 'auto' : '200px', maxHeight: images.length === 1 ? '400px' : '200px' }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!message.uploading && isDownloaded) {
                                                    setLightboxSrc(mediaUrl);
                                                  }
                                                }}
                                                onLoad={() => setMediaLoaded((prev) => ({ ...prev, [att.url]: true }))}
                                              />
                                              
                                              {/* Upload Progress (for sender) */}
                                              {message.uploading && (
                                                <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center">
                                                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mb-2"></div>
                                                  {uploadProgress[message.id] !== undefined && (
                                                    <div className="text-white text-sm font-semibold">
                                                      {uploadProgress[message.id]}%
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              
                                              {/* Download Button (for receiver) */}
                                              {!isMine && !isDownloaded && !message.uploading && (
                                                <div className="absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-center">
                                                  {isDownloading ? (
                                                    <>
                                                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mb-2"></div>
                                                      <div className="text-white text-sm font-semibold">
                                                        {downloadProgress[mediaUrl]}%
                                                      </div>
                                                    </>
                                                  ) : (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMediaDownload(mediaUrl);
                                                      }}
                                                      className="p-3 bg-white/90 rounded-full hover:bg-white transition-colors"
                                                      title="Download to view"
                                                    >
                                                      <FiDownload size={24} className="text-gray-700" />
                                                    </button>
                                                  )}
                                                </div>
                                              )}
                                              
                                              {/* Download to device button (always visible on hover for downloaded images) */}
                                              {isDownloaded && !message.uploading && (
                                                <a
                                                  href={mediaUrl}
                                                  download={`image-${idx}.jpg`}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                  title="Download to device"
                                                >
                                                  <FiDownload size={16} className="text-white" />
                                                </a>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {nonImages.map((att, idx) => {
                                      const lower = att.url.toLowerCase();
                                      const isVideo = /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/.test(lower);
                                      const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac|opus|wma)(\?.*)?$/.test(lower);
                                      const isDoc = !isVideo && !isAudio;
                                      if (isVideo) {
                                        return (
                                          <div key={`vid-${idx}`} className="relative rounded-lg overflow-hidden" style={{ maxWidth: '400px' }}>
                                            <video controls className="w-full rounded-lg" style={{ maxHeight: '300px' }}>
                                              <source src={resolveMediaUrl(att.url)} />
                                            </video>
                                            {message.uploading && (
                                              <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center pointer-events-none">
                                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mb-2"></div>
                                                {uploadProgress[message.id] !== undefined && (
                                                  <div className="text-white text-sm font-semibold">
                                                    {uploadProgress[message.id]}%
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                      if (isAudio) {
                                        return (
                                          <audio key={`aud-${idx}`} controls className="w-full">
                                            <source src={resolveMediaUrl(att.url)} />
                                          </audio>
                                        );
                                      }
                                      // Document tile - WhatsApp style
                                      const fileName = att.name || att.url.split('/').pop() || 'Document';
                                      const fileExt = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                                      return (
                                        <div key={`doc-${idx}`} className="relative" style={{ maxWidth: '350px' }}>
                                          <div className={`flex items-center gap-3 p-3 rounded-lg border shadow-sm ${
                                            isMine 
                                              ? 'bg-white/20 border-white/30' 
                                              : 'bg-white border-gray-200'
                                          }`}>
                                            {/* File Icon */}
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                                              isMine ? 'bg-white/30' : 'bg-blue-100'
                                            }`}>
                                              <div className={`text-xs font-bold ${
                                                isMine ? 'text-white' : 'text-blue-600'
                                              }`}>
                                                {fileExt}
                                              </div>
                                            </div>
                                            
                                            {/* File Info */}
                                            <div className="flex-1 min-w-0">
                                              <div className={`text-sm font-medium truncate ${
                                                isMine ? 'text-white' : 'text-gray-900'
                                              }`}>
                                                {fileName}
                                              </div>
                                              <div className={`text-xs ${
                                                isMine ? 'text-white/70' : 'text-gray-500'
                                              }`}>
                                                {message.uploading ? 'Uploading...' : 'Document'}
                                              </div>
                                            </div>
                                            
                                            {/* Download/Upload Status */}
                                            {message.uploading ? (
                                              <div className="flex items-center gap-2">
                                                <div className={`animate-spin rounded-full h-5 w-5 border-2 ${
                                                  isMine ? 'border-white/50 border-t-white' : 'border-gray-300 border-t-gray-600'
                                                }`}></div>
                                                {uploadProgress[message.id] !== undefined && (
                                                  <span className={`text-xs font-semibold ${
                                                    isMine ? 'text-white' : 'text-gray-600'
                                                  }`}>
                                                    {uploadProgress[message.id]}%
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1">
                                                {/* Open button */}
                                                <a
                                                  href={resolveMediaUrl(att.url)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                                                    isMine 
                                                      ? 'hover:bg-white/20 text-white' 
                                                      : 'hover:bg-gray-100 text-gray-600'
                                                  }`}
                                                  title="Open document"
                                                >
                                                  <FiExternalLink size={18} />
                                                </a>
                                                {/* Download button */}
                                                <a
                                                  href={resolveMediaUrl(att.url)}
                                                  download={fileName}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                                                    isMine 
                                                      ? 'hover:bg-white/20 text-white' 
                                                      : 'hover:bg-gray-100 text-gray-600'
                                                  }`}
                                                  title="Download to device"
                                                >
                                                  <FiDownload size={18} />
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              
                              {/* end attachments */}

                              {/* Message time and status */}
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 text-xs ${isMine ? "text-white/90" : "text-gray-500"}`}
                              >
                                <span>{formatTime(message.timestamp)}</span>
                                <span className="opacity-90">
                                  {getMessageStatusIcon(message.status, isMine)}
                                </span>
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
                                    } flex gap-1 bg-white/90 text-gray-800 rounded-full border border-gray-200 px-1 py-[1px] shadow-sm font-medium`}
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
                              } opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-50 message-actions-menu`}
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
                                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[180px] max-w-[240px] message-menu-dropdown">
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
                                      onClick={async () => {
                                        const isPinned = pinnedMessages.has(
                                          message.id
                                        );
                                        try {
                                          const token =
                                            localStorage.getItem("token");
                                          await axios.post(
                                            `${baseURL}/api/messages/pin`,
                                            {
                                              messageId: message.id,
                                              pin: !isPinned,
                                            },
                                            {
                                              headers: {
                                                Authorization: `Bearer ${token}`,
                                              },
                                            }
                                          );
                                          setPinnedMessages((prev) => {
                                            const next = new Set(prev);
                                            if (isPinned)
                                              next.delete(message.id);
                                            else {
                                              next.clear();
                                              next.add(message.id);
                                            }
                                            return next;
                                          });
                                        } catch {}
                                        setOpenMessageMenuFor(null);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      {pinnedMessages.has(message.id) ? (
                                        <>📌 Unpin</>
                                      ) : (
                                        <>📌 Pin</>
                                      )}
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
                  {(() => {
                    const allMine = Array.from(selectedMessageIds).every(
                      (id) => {
                        const m = messages.find(
                          (mm) => String(mm.id) === String(id)
                        );
                        return m && String(m.senderId) === String(user._id);
                      }
                    );
                    if (!allMine) return null;
                    return (
                      <button
                        onClick={() => handleBulkDelete("everyone")}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Delete for everyone
                      </button>
                    );
                  })()}
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
                  {/* Attachment preview chips (WhatsApp-like) */}
                  {(selectedImages.length > 0 ||
                    selectedVideos.length > 0 ||
                    selectedDocs.length > 0) && (
                    <div className="mb-3">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {selectedImages.slice(0, 5).map((f, idx) => (
                          <div key={`img-${idx}`} className="relative group">
                            <img
                              src={URL.createObjectURL(f)}
                              alt="preview"
                              className="w-full h-24 object-cover rounded"
                            />
                            <button
                              title="Remove"
                              onClick={() =>
                                setSelectedImages((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-90"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {selectedVideos.slice(0, 5).map((f, idx) => (
                          <div key={`vid-${idx}`} className="relative">
                            <video
                              src={URL.createObjectURL(f)}
                              className="w-full h-24 object-cover rounded"
                            />
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="w-10 h-10 bg-black/40 rounded-full text-white flex items-center justify-center">
                                ▶
                              </span>
                            </span>
                            <button
                              title="Remove"
                              onClick={() =>
                                setSelectedVideos((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-90"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {selectedDocs.slice(0, 3).map((f, idx) => (
                          <div
                            key={`doc-${idx}`}
                            className="relative p-2 bg-gray-50 border rounded flex flex-col text-xs"
                          >
                            <div className="font-medium truncate">{f.name}</div>
                            <div className="text-gray-500">
                              {formatBytes(f.size)}
                            </div>
                            <button
                              title="Remove"
                              onClick={() =>
                                setSelectedDocs((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-90"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-right">
                        <button
                          onClick={removeImage}
                          className="text-sm text-red-600"
                        >
                          Clear all
                        </button>
                      </div>
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
                          title="Attach"
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
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
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
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-sky-50 to-blue-50">
            <div className="text-center px-6">
              <div className="relative mx-auto mb-6 w-28 h-28">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 animate-pulse opacity-20"></div>
                <div className="absolute inset-3 rounded-full bg-white shadow-xl flex items-center justify-center text-4xl">🎓</div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">AlumniConnect Chat</h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Connect with peers and mentors from MIT Aurangabad. Share memories, opportunities, and guidance across batches.
              </p>
              <div className="mt-4 text-sm text-gray-500">Start by selecting a chat from the left panel.</div>
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
          <button
            onClick={() => {
              const link = document.createElement("a");
              link.href = lightboxSrc;
              link.download = "image";
              link.click();
            }}
            className="absolute top-2 right-2 bg-gray-100 text-gray-600 p-2 rounded-full hover:bg-gray-200"
          >
            <FiDownload size={18} />
          </button>
        </div>
      )}

      {/* Right side panel: contact info + media/links/docs + actions */}
      {selectedUser && showRightPanel && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex justify-end"
          onClick={() => setShowRightPanel(false)}
        >
          <div
            className="h-full w-full sm:w-[380px] bg-white border-l border-gray-200 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Chat details</div>
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
                onClick={() =>
                  selectedUser.avatarUrl && setLightboxSrc(getAvatarUrl(selectedUser.avatarUrl))
                }
              />
              <div>
                <div className="font-medium">{selectedUser.name}</div>
                <div className="text-sm text-gray-500">
                  @{selectedUser.username}
                </div>
                <div className="mt-1">
                  <Link
                    to={
                      selectedUser.username
                        ? `/profile/${selectedUser.username}`
                        : `/profile/id/${selectedUser._id}`
                    }
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    View profile
                  </Link>
                </div>
              </div>
            </div>
            <div className="px-4 pt-2 flex gap-2">
              {[
                { key: "media", label: "Media", count: sharedMedia.filter((m) => m.type === "image" || m.type === "video").length },
                { key: "docs", label: "Docs", count: sharedMedia.filter((m) => m.type === "document" || m.type === "audio").length },
                { key: "links", label: "Links", count: sharedLinks.length },
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
                  {t.label} {t.count > 0 && `(${t.count})`}
                </button>
              ))}
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {rightPanelTab === "media" && (
                <div className="grid grid-cols-3 gap-2">
                  {sharedMedia
                    .filter((m) => m.type === "image" || m.type === "video")
                    .map((m) => (
                      <button
                        key={m.id + String(m.url)}
                        className="block relative group"
                        onClick={() => {
                          setShowRightPanel(false);
                          const el = document.querySelector(`[data-mid="${m.id}"]`);
                          if (el && messageContainerRef.current) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        title={m.isMine ? "You sent this" : `${selectedUser?.name} sent this`}
                      >
                        <img src={m.url} alt="" className="w-full h-24 object-cover rounded" />
                        {/* Indicator badge */}
                        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${m.isMine ? 'bg-green-500' : 'bg-blue-500'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                      </button>
                    ))}
                </div>
              )}
              {rightPanelTab === "docs" && (
                <div className="space-y-2">
                  {sharedMedia
                    .filter((m) => m.type === "document" || m.type === "audio")
                    .map((m) => (
                      <button
                        key={m.id + String(m.url)}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 text-left w-full"
                        onClick={() => {
                          setShowRightPanel(false);
                          const el = document.querySelector(`[data-mid="${m.id}"]`);
                          if (el && messageContainerRef.current) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        title={m.isMine ? "You sent this" : `${selectedUser?.name} sent this`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.isMine ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        <span className="truncate text-sm">{m.filename || m.url.split('/').pop() || 'Document'}</span>
                      </button>
                    ))}
                </div>
              )}
              {rightPanelTab === "links" && (
                <div className="space-y-2">
                  {sharedLinks.map((m) => (
                    <button
                      key={m.id + String(m.url)}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 text-left w-full"
                      onClick={() => {
                        setShowRightPanel(false);
                        const el = document.querySelector(`[data-mid=\"${m.id}\"]`);
                        if (el && messageContainerRef.current) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      title={m.isMine ? "You sent this" : `${selectedUser?.name} sent this`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.isMine ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                      <span className="truncate text-sm">{m.url}</span>
                    </button>
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
                  // Forward to selected users (text + media)
                  for (const userId of forwardSelected) {
                    try {
                      const formData = new FormData();
                      formData.append("content", forwardSource?.content || "");
                      if (forwardSource?.id) {
                        formData.append("forwardedFromId", forwardSource.id);
                      }
                      const atts = Array.isArray(forwardSource?.attachments)
                        ? forwardSource.attachments
                        : [];
                      // Include remote URLs in attachments so backend preserves them
                      if (atts.length > 0) {
                        atts.forEach((u) =>
                          formData.append("attachments[]", u)
                        );
                      }
                      const token = localStorage.getItem("token");
                      await axios.post(
                        `${baseURL}/api/messages/${userId}`,
                        formData,
                        { headers: { Authorization: `Bearer ${token}` } }
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
                {(reactionsModalData.reactions || []).map((group) => (
                  <button
                    key={group.emoji}
                    onClick={() =>
                      setReactionsModalData({
                        ...reactionsModalData,
                        activeTab: group.emoji,
                      })
                    }
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      reactionsModalData.activeTab === group.emoji
                        ? "bg-green-100 text-green-700 border-b-2 border-green-500"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {group.emoji} {group.count}
                  </button>
                ))}
              </div>

              {/* User list */}
              <div className="max-h-80 overflow-y-auto space-y-2">
                {(() => {
                  const flat = (reactionsModalData.reactions || []).flatMap(
                    (g) => g.users.map((u) => ({ user: u, emoji: g.emoji }))
                  );
                  const list = flat.filter((row) =>
                    reactionsModalData.activeTab === "all" ||
                    !reactionsModalData.activeTab
                      ? true
                      : row.emoji === reactionsModalData.activeTab
                  );
                  return list.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(row.user?.avatarUrl)}
                          alt={row.user?.name || row.user?.username || "User"}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="text-sm">
                          {row.user?.name || row.user?.username || "User"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{row.emoji}</span>
                        {String(row.user?._id) === String(user._id) && (
                          <button
                            onClick={() => handleReact(reactionsModalFor, null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Tap to remove
                          </button>
                        )}
                      </div>
                    </div>
                  ));
                })()}
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
