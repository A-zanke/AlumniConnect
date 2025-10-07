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

// Minimal quick actions: Events, FAQ, Profile Analyzer
const quickActions = [
  { label: 'Event Guide', value: 'events', icon: <FiCalendar /> },
  { label: 'FAQ Helper', value: 'faq', icon: <FiHelpCircle /> },
  { label: 'Profile Analyzer', value: 'analyze', icon: <FiUser /> },
];

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! Ask about events, FAQs, or profile tips.' }
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
    addMessage('bot', 'Fetching upcoming events...');
    setLoading(true);
    try {
      const { data } = await axios.get('/api/events', { params: { department: user?.department } });
      if (data.length > 0) {
        addMessage('bot', 'Upcoming events — tap a card:', {
          type: 'events',
          items: data.slice(0, 3)
        });
      } else {
        addMessage('bot', 'No updates found right now.');
      }
    } catch (err) {
      addMessage('bot', 'No updates found right now.');
    }
    setLoading(false);
  };

  // --- FAQ Helper ---
  const FAQS = [
    { q: 'how can i register for an event', a: "Go to Events → Click Register button." },
    { q: 'how do i update my profile', a: "Open Profile → Edit → Save changes." },
    { q: 'how can i contact alumni support', a: "Email: alumni@college.edu" },
    { q: 'how to reset password', a: "Click ‘Forgot Password’ on login page." },
    { q: 'where can i find mentorship programs', a: "Check Mentorship tab under Dashboard." },
    { q: 'how do i post in the forum', a: "Go to Forum → Create Post." },
    { q: 'how can i change my email', a: "Profile → Edit email → Save." },
    { q: 'how do i delete my account', a: "Contact support to request deletion." },
  ];

  const handleFAQQuery = async (text) => {
    setLoading(true);
    try {
      const normalized = text.toLowerCase();
      const match = FAQS.find(item => normalized.includes(item.q));
      if (match) {
        addMessage('bot', match.a);
      } else {
        // Show curated quick answers (6 items) as short chat-style messages
        const curated = FAQS.slice(0, 6);
        curated.forEach(item => addMessage('bot', `${item.a}`));
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Profile Analyzer ---
  const analyzeProfile = async () => {
    setLoading(true);
    addMessage('bot', 'Analyzing...');
    try {
      let profileData = null;
      try {
        if (user?._id) {
          const res = await userAPI.getUserById(user._id);
          profileData = res?.data?.data || null;
        }
      } catch (_) {
        // Fallback to basic profile
        const res = await userAPI.getProfile();
        profileData = res?.data || null;
      }

      if (!profileData) {
        addMessage('bot', 'Please update your profile to get better suggestions.');
        return;
      }

      const skills = Array.isArray(profileData.skills) ? profileData.skills : [];
      const department = (profileData.department && profileData.department.name) || profileData.department || '';
      const desiredRoles = profileData.desired_roles || [];
      const projects = profileData.projects || profileData.detailed_projects || [];
      const internships = profileData.internships || profileData.detailed_internships || [];

      const suggestions = [];

      if (!skills || skills.length < 3) {
        const skillHint = /it|computer|cs|software|information/i.test(String(department))
          ? 'Power BI, SQL, Git'
          : 'Power BI, Excel, Communication';
        suggestions.push(`Improve your skills (e.g., ${skillHint}).`);
      } else {
        suggestions.push('Highlight your top 3 skills on your profile.');
      }

      if ((!projects || projects.length === 0) && (!internships || internships.length === 0)) {
        suggestions.push('Add your latest internship or project to your profile.');
      } else {
        suggestions.push('Summarize outcomes of a recent project/internship.');
      }

      if (!desiredRoles || desiredRoles.length === 0) {
        suggestions.push('Set your career goal in Profile → Edit.');
      } else {
        suggestions.push('Join an alumni event to grow your network.');
      }

      // Send 3 concise bullet-style messages
      suggestions.slice(0, 3).forEach(s => addMessage('bot', `• ${s}`));
    } catch (err) {
      addMessage('bot', 'Please update your profile to get better suggestions.');
    } finally {
      setLoading(false);
    }
  };

  // --- Intelligent Keyword Detection ---

  const handleUserMessage = async (text) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setInput('');

    const lowerCaseText = text.toLowerCase();

    if (lowerCaseText.includes('event') || lowerCaseText.startsWith('/events')) {
      await fetchEvents();
    } else if (
      lowerCaseText.includes('analyze my profile') ||
      (lowerCaseText.includes('analyze') && lowerCaseText.includes('profile')) ||
      lowerCaseText.includes('what can i improve') ||
      lowerCaseText.startsWith('/analyze')
    ) {
      await analyzeProfile();
    } else if (
      lowerCaseText.includes('faq') ||
      lowerCaseText.includes('how do i') ||
      lowerCaseText.includes('how to') ||
      lowerCaseText.includes('reset password') ||
      lowerCaseText.includes('update my profile') ||
      lowerCaseText.includes('register for an event') ||
      lowerCaseText.startsWith('/faq')
    ) {
      await handleFAQQuery(text);
    } else {
      addMessage('bot', 'I can help with events, FAQs, or profile tips.');
    }
  };

  const handleQuickAction = (action) => {
    handleUserMessage(`/${action}`);
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
                    <div className="px-4 py-2 rounded-xl shadow bg-orange-100 text-orange-800 animate-pulse">Typing...</div>
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
