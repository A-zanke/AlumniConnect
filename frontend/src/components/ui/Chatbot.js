import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FiMessageCircle, FiSend, FiX, FiUser, FiCalendar, FiHelpCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { userAPI } from '../utils/api';

// --- Helper Functions for Rendering Cards ---

const renderEventCard = (event) => (
  <Link to={`/events/${event._id}`} className="block bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-indigo-100">
    <div className="font-semibold text-indigo-700">{event.title}</div>
    <div className="text-sm text-gray-600">{new Date(event.date).toLocaleDateString()}</div>
    <p className="text-xs text-gray-500 mt-1">{event.description.substring(0, 50)}...</p>
  </Link>
);

// Note: Event rendering kept intact as requested

const quickActions = [
  { label: 'Event Guide', value: 'events', icon: <FiCalendar /> },
  { label: 'FAQ Helper', value: 'faq', icon: <FiHelpCircle /> },
  { label: 'Profile Analyzer', value: 'analyze', icon: <FiUser /> },
];

// --- FAQ knowledge base (concise, message-style) ---
const FAQ_KNOWLEDGE = [
  {
    q: 'How can I register for an event?',
    a: 'Go to Events → click Register.',
    triggers: ['register', 'sign up', 'rsvp', 'event register']
  },
  {
    q: 'How do I update my profile?',
    a: 'Open Profile → Edit → Save changes.',
    triggers: ['update profile', 'edit profile', 'change profile', 'profile edit']
  },
  {
    q: 'How can I contact alumni support?',
    a: 'Email: alumni@college.edu',
    triggers: ['contact', 'support', 'help email', 'alumni support']
  },
  {
    q: 'How to reset password?',
    a: "Click 'Forgot Password' on the login page.",
    triggers: ['reset password', 'forgot password', 'change password']
  },
  {
    q: 'Where can I find mentorship programs?',
    a: 'Check Mentorship under Dashboard.',
    triggers: ['mentorship', 'mentor program', 'find mentor']
  },
  {
    q: 'How to view event details?',
    a: 'Open Events → tap an event card.',
    triggers: ['event details', 'view event', 'see event']
  },
  {
    q: 'How to message an alumni?',
    a: 'Open Network → find profile → click Message.',
    triggers: ['message alumni', 'text alumni', 'contact alumni']
  },
  {
    q: 'Where are my RSVPs?',
    a: 'Go to Events → My Events.',
    triggers: ['my events', 'rsvps', 'registered events']
  },
  {
    q: 'How to report an issue?',
    a: 'Use Help in Settings or email alumni@college.edu.',
    triggers: ['report issue', 'bug', 'problem']
  },
  {
    q: 'How to change notifications?',
    a: 'Settings → Notifications → Update preferences.',
    triggers: ['notifications', 'mute', 'notification settings']
  },
];

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! I can help with events, FAQs, or profile analysis.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, loading]);


  const addMessage = (sender, text, component = null) => {
    setMessages(msgs => [...msgs, { sender, text, component }]);
  };
  // --- API Fetching Functions ---

  const fetchEvents = async () => {
    // Event Guide kept as-is (no logic changes)
    addMessage('bot', 'Sure, fetching relevant events for you...');
    setLoading(true);
    try {
      const { data } = await axios.get('/api/events', { params: { department: user?.department } });
      if (data.length > 0) {
        addMessage('bot', 'Here are some upcoming events you might be interested in:', {
          type: 'events',
          items: data.slice(0, 3)
        });
      } else {
        addMessage('bot', "No updates found right now.");
      }
    } catch (err) {
      addMessage('bot', 'Sorry, I had trouble fetching events.');
    }
    setLoading(false);
  };

  // --- FAQ Helper ---
  const findFaqAnswer = (text) => {
    const t = text.toLowerCase();
    const item = FAQ_KNOWLEDGE.find(({ triggers }) =>
      triggers.some((kw) => t.includes(kw))
    );
    return item ? item.a : null;
  };

  const showTopFaqs = async () => {
    setLoading(true);
    // Short pause to show typing animation
    await new Promise((r) => setTimeout(r, 350));
    const top = FAQ_KNOWLEDGE.slice(0, 6);
    addMessage('bot', 'Quick answers:');
    top.forEach(({ q, a }) => {
      addMessage('bot', `${q} → ${a}`);
    });
    setLoading(false);
  };

  // --- Profile Analyzer ---
  const analyzeProfile = async () => {
    addMessage('bot', 'Analyzing your profile...');
    setLoading(true);
    try {
      const res = await userAPI.getProfile();
      const profile = res?.data || {};
      const skills = Array.isArray(profile.skills) ? profile.skills : [];
      const department = (profile.department || profile.specialization || '').toString().toLowerCase();

      const suggestions = [];

      // Skill improvement suggestion
      const isDataRelated = /(data|it|computer|cs|ai|analytics|software)/.test(department);
      if (isDataRelated) {
        suggestions.push('Improve your data analysis skills (Power BI, SQL).');
      } else {
        suggestions.push('Add in-demand skills to your profile (e.g., Git, Excel).');
      }

      // Projects/internship suggestion
      suggestions.push('Add your latest internship or project to your profile.');

      // Networking/events suggestion
      suggestions.push('Consider joining an alumni event to grow your network.');

      if (suggestions.length === 0 || (!profile || (skills.length === 0 && !department))) {
        addMessage('bot', 'Please update your profile to get better suggestions.');
      } else {
        addMessage('bot', `• ${suggestions[0]}\n• ${suggestions[1]}\n• ${suggestions[2]}`);
      }
    } catch (e) {
      addMessage('bot', 'Please update your profile to get better suggestions.');
    }
    setLoading(false);
  };

  const fetchMentors = async () => {
    addMessage('bot', 'Finding some mentors who could be a great fit...');
    setLoading(true);
    try {
      // Assuming an endpoint that provides recommendations
      const { data } = await axios.get('/api/mentorship/recommendations');
      if (data.length > 0) {
        addMessage('bot', 'Here are some recommended mentors for you:', {
          type: 'mentors',
          items: data.slice(0, 3)
        });
      } else {
        addMessage('bot', "I couldn't find any mentor recommendations at the moment.");
      }
    } catch (err) {
      addMessage('bot', 'Sorry, I had trouble finding mentors.');
    }
    setLoading(false);
  };

  const fetchForumPosts = async () => {
    addMessage('bot', 'Let me check the latest forum discussions...');
    setLoading(true);
    try {
      const { data } = await axios.get('/api/posts'); // Assuming this is the forum posts endpoint
      if (data.posts.length > 0) {
        addMessage('bot', 'Here are some of the latest posts from the forum:', {
          type: 'forum',
          items: data.posts.slice(0, 3)
        });
      } else {
        addMessage('bot', 'The forum seems quiet right now. Why not start a discussion?');
      }
    } catch (err) {
      addMessage('bot', 'Sorry, I had trouble fetching forum posts.');
    }
    setLoading(false);
  };

  const handleGenericQuery = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    addMessage('bot', 'I can help with Events, FAQs, or profile analysis.');
    setLoading(false);
  };

  // --- Intelligent Keyword Detection ---

  const handleUserMessage = async (text) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setInput('');

    const lowerCaseText = text.toLowerCase();

    // Direct keyword routes
    if (lowerCaseText.includes('event')) {
      await fetchEvents();
      return;
    }

    if (lowerCaseText.includes('analyze') || lowerCaseText.includes('analyse') ||
        (lowerCaseText.includes('improve') && lowerCaseText.includes('profile')) ||
        lowerCaseText.includes('analyze my profile')) {
      await analyzeProfile();
      return;
    }

    // FAQ direct question matching
    const maybeAnswer = findFaqAnswer(lowerCaseText);
    if (maybeAnswer) {
      addMessage('bot', maybeAnswer);
      return;
    }

    if (lowerCaseText.includes('faq') || lowerCaseText.includes('help')) {
      await showTopFaqs();
      return;
    }

    // Fallback
    await handleGenericQuery();
  };

  const handleQuickAction = async (action) => {
    if (action === 'events') {
      addMessage('user', 'Show me upcoming events.');
      await fetchEvents();
    } else if (action === 'faq') {
      addMessage('user', 'Show FAQs');
      await showTopFaqs();
    } else if (action === 'analyze') {
      addMessage('user', 'Analyze my profile.');
      await analyzeProfile();
    }
  };

  return (
    <>
      {/* Floating Chatbot Button */}
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
      >
        <button
          className="bg-gradient-to-r from-indigo-500 to-orange-500 text-white rounded-full shadow-lg p-4 flex items-center justify-center animate-bounce"
          onClick={() => setOpen(true)}
          aria-label="Open Chatbot"
        >
          <FiMessageCircle size={28} />
        </button>
      </motion.div>
      {/* Chatbot Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/30 flex items-end justify-end z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-8 flex flex-col h-[70vh]"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-2 font-bold text-lg text-indigo-700">
                  <FiMessageCircle /> AlumniConnect AI
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-red-500">
                  <FiX size={22} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-br from-white to-slate-50">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    className={`mb-4 flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <div className={`px-4 py-2 rounded-xl shadow-sm max-w-sm ${msg.sender === 'user' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'}`}>
                      {msg.text}
                    </div>
                    {msg.component && (
                      <div className="mt-2 w-full max-w-sm space-y-2">
                        {msg.component.type === 'events' && msg.component.items.map(renderEventCard)}
                      </div>
                    )}
                  </motion.div>
                ))}
                {loading && (
                  <div className="mb-3 flex justify-start">
                    <div className="px-4 py-2 rounded-xl shadow bg-orange-100 text-orange-800 animate-pulse">Thinking...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="px-6 py-4 border-t bg-white flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap mb-2">
                  {quickActions.map(a => (
                    <button
                      key={a.value}
                      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-indigo-200 to-orange-200 text-indigo-800 rounded-full text-xs font-semibold hover:scale-105 transition"
                      onClick={() => handleQuickAction(a.value)}
                    >
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={e => { e.preventDefault(); handleUserMessage(input); }}
                >
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="Type your message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-indigo-500 to-orange-500 text-white rounded-xl px-4 py-2 font-bold shadow hover:scale-105 transition"
                    disabled={loading || !input.trim()}
                  >
                    <FiSend size={20} />
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
