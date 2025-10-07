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
    { sender: 'bot', text: 'Hi there 👋! Need help with events, FAQs, or your profile?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const { user } = useAuth();
  const [awaiting, setAwaiting] = useState(null); // e.g., 'recommendations'
  const lastProfileRef = useRef(null);

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

  // --- Helpers ---
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // --- FAQ Helper ---
  const FAQS = [
    { q: 'How can I register for an event?', a: 'Go to Events → Click Register.' },
    { q: 'How do I post in the forum?', a: 'Visit Forum → Create Post.' },
    { q: 'How can I contact alumni support?', a: 'Email alumni@college.edu for support.' },
    { q: 'How do I update my profile?', a: 'Open Profile → Edit → Save.' },
    { q: 'How can I reset my password?', a: 'Click Forgot Password on login page.' },
    { q: 'How do I find alumni mentorship?', a: 'Check Mentorship tab under Dashboard.' },
    { q: 'How can I strengthen my resume?', a: 'Add certifications and achievements.' },
  ];

  const showFaqButtons = async () => {
    setLoading(true);
    await sleep(250);
    addMessage('bot', 'Pick a question:', { type: 'faq', items: FAQS });
    setLoading(false);
  };

  const handleFAQQuery = async (text) => {
    setLoading(true);
    try {
      await sleep(250);
      const normalized = text.toLowerCase();
      const match = FAQS.find(item => normalized.includes(item.q.toLowerCase()));
      if (match) {
        addMessage('bot', match.a);
      } else {
        // If no direct match, show buttons
        addMessage('bot', 'Here are quick FAQs:', { type: 'faq', items: FAQS });
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Profile Analyzer ---
  const generateProfileSuggestions = (profileData) => {
    const skills = Array.isArray(profileData.skills) ? profileData.skills : [];
    const department = (profileData.department && profileData.department.name) || profileData.department || '';
    const desiredRoles = profileData.desired_roles || [];
    const projects = profileData.projects || profileData.detailed_projects || [];
    const internships = profileData.internships || profileData.detailed_internships || [];

    const suggestions = [];
    if (!skills || skills.length < 3) {
      const skillHint = /it|computer|cs|software|information/i.test(String(department))
        ? 'Power BI and SQL'
        : 'Power BI and Excel';
      suggestions.push(`Add ${skillHint} to strengthen your profile.`);
    } else {
      suggestions.push('Highlight your top 3 skills.');
    }
    if ((!projects || projects.length === 0) && (!internships || internships.length === 0)) {
      suggestions.push('Add a recent internship or project.');
    } else {
      suggestions.push('Summarize outcomes of a recent project.');
    }
    if (!desiredRoles || desiredRoles.length === 0) {
      suggestions.push('Set your career goal in Profile → Edit.');
    } else {
      suggestions.push('Join an alumni event to grow your network.');
    }
    return suggestions.slice(0, 3);
  };

  const analyzeProfile = async () => {
    setLoading(true);
    addMessage('bot', 'Analyzing...');
    try {
      await sleep(350);
      let profileData = null;
      try {
        if (user?._id) {
          const res = await userAPI.getUserById(user._id);
          profileData = res?.data?.data || null;
        }
      } catch (_) {
        const res = await userAPI.getProfile();
        profileData = res?.data || null;
      }

      if (!profileData) {
        addMessage('bot', 'Please update your profile to get better suggestions.');
        return;
      }

      lastProfileRef.current = profileData;

      const skills = Array.isArray(profileData.skills) ? profileData.skills : [];
      const projects = profileData.projects || profileData.detailed_projects || [];
      const goal = (Array.isArray(profileData.desired_roles) && profileData.desired_roles[0])
        || profileData.specialization
        || profileData.current_job_title
        || 'Not set';

      addMessage('bot', `You’ve added ${projects?.length || 0} projects and ${skills?.length || 0} skills.`);
      addMessage('bot', `Goal: ${goal}.`);
      addMessage('bot', 'You could highlight certifications and internships.');
      addMessage('bot', 'Want improvement tips?');
      setAwaiting('recommendations');
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

    if (awaiting === 'recommendations') {
      if (/^(yes|yeah|yep|sure|ok|okay)\b/.test(lowerCaseText)) {
        const data = lastProfileRef.current;
        const recs = data ? generateProfileSuggestions(data) : [];
        if (recs.length === 0) {
          addMessage('bot', 'Please update your profile to get better suggestions.');
        } else {
          recs.forEach(r => addMessage('bot', `• ${r}`));
        }
      } else {
        addMessage('bot', 'Okay. Ask me anytime.');
      }
      setAwaiting(null);
      return;
    }

    // Casual conversation handling
    if (/\b(hi|hello|hey)\b/.test(lowerCaseText)) {
      addMessage('bot', 'Hi there! How can I help?');
      return;
    }
    if (lowerCaseText.includes('how are you')) {
      addMessage('bot', 'I’m doing great — how can I help?');
      return;
    }
    if (lowerCaseText.includes('what is this website') || lowerCaseText.includes('what’s this website')) {
      addMessage('bot', 'This platform connects alumni, students, and mentors.');
      return;
    }
    if (lowerCaseText.includes('who built you')) {
      addMessage('bot', 'I’m your Alumni Assistant — built to help you succeed!');
      return;
    }
    if (lowerCaseText.includes("what's your name") || lowerCaseText.includes('whats your name') || lowerCaseText.includes('your name')) {
      addMessage('bot', 'I’m your College AI Assistant 😊.');
      return;
    }
    if (lowerCaseText.includes('build a strong profile') || lowerCaseText.includes('how can i build a strong profile')) {
      addMessage('bot', 'Keep your skills, projects, and goals updated — consistency matters.');
      return;
    }

    if (lowerCaseText.includes('event') || lowerCaseText.startsWith('/events')) {
      await fetchEvents();
    } else if (
      lowerCaseText.includes('analyze my profile') ||
      (lowerCaseText.includes('analyze') && lowerCaseText.includes('profile')) ||
      lowerCaseText.includes('what can i improve') ||
      lowerCaseText.includes('how can i improve my profile') ||
      lowerCaseText.startsWith('/analyze')
    ) {
      await analyzeProfile();
    } else if (
      lowerCaseText.includes('faq') || lowerCaseText.startsWith('/faq') ||
      lowerCaseText.includes('how do i') ||
      lowerCaseText.includes('how to') ||
      lowerCaseText.includes('reset password') ||
      lowerCaseText.includes('update my profile') ||
      lowerCaseText.includes('register for an event')
    ) {
      if (lowerCaseText.includes('faq') || lowerCaseText.startsWith('/faq')) {
        await showFaqButtons();
      } else {
        await handleFAQQuery(text);
      }
    } else {
      addMessage('bot', 'Sorry, I didn’t catch that. Could you rephrase?');
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
                        {msg.component.type === 'faq' && (
                          <div className="grid grid-cols-1 gap-2">
                            {msg.component.items.map((item, idx) => (
                              <button
                                key={idx}
                                className="w-full text-left px-3 py-2 bg-white border border-indigo-100 rounded-lg hover:bg-indigo-50 text-indigo-700"
                                onClick={() => handleUserMessage(item.q)}
                              >
                                {item.q}
                              </button>
                            ))}
                          </div>
                        )}
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
