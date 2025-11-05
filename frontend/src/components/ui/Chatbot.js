import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FiMessageCircle, FiSend, FiX, FiUser, FiCalendar, FiHelpCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

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
    { sender: 'bot', text: 'Hi! Ask me about events, networking, or profile tips! 👋' }
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

  // --- Fetch Events with AI Summary ---
  const fetchEvents = async () => {
    setLoading(true);
    addMessage('user', 'Show me upcoming events');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/chatbot',
        { message: 'What events are coming up?' },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      
      if (response.data?.reply) {
        addMessage('bot', response.data.reply);
      } else {
        addMessage('bot', 'No upcoming events found. Check back soon!');
      }
    } catch (err) {
      console.error('Events fetch error:', err);
      addMessage('bot', 'Unable to fetch events right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers ---
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // --- FAQ Helper ---
  const FAQS = [
    { q: 'How can I register for an event?', a: 'Go to Events → Click Register on any event you\'re interested in.' },
    { q: 'How do I post in the forum?', a: 'Visit Forum → Create Post button → Write and publish.' },
    { q: 'How do I update my profile?', a: 'Open Profile → Edit button → Update your information → Save.' },
    { q: 'How to connect with alumni?', a: 'Search for alumni → Visit their profile → Send connection request.' },
    { q: 'How to improve my profile?', a: 'Add skills, experience, bio, and keep it updated regularly.' },
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
  const analyzeProfile = async () => {
    setLoading(true);
    addMessage('bot', 'Analyzing your profile...');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/chatbot',
        { message: 'analyze my profile' },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      
      if (response.data?.reply) {
        addMessage('bot', response.data.reply);
      } else {
        addMessage('bot', 'Please update your profile to get personalized suggestions.');
      }
    } catch (err) {
      console.error('Profile analysis error:', err);
      addMessage('bot', 'Please update your profile to get better suggestions.');
    } finally {
      setLoading(false);
    }
  };

  // --- Send message to AI backend ---
  const sendToAI = async (message) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/chatbot',
        { message },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      
      if (response.data?.reply) {
        addMessage('bot', response.data.reply);
      } else {
        addMessage('bot', 'I didn\'t quite understand that. Try asking about events, networking, or profile tips!');
      }
    } catch (err) {
      console.error('AI response error:', err);
      addMessage('bot', 'I\'m having trouble right now. Please try again or ask about events, forums, or networking!');
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

    // Check for quick commands first
    if (lowerCaseText === '/events' || lowerCaseText === 'events') {
      await fetchEvents();
      return;
    }
    
    if (lowerCaseText === '/analyze' || lowerCaseText === 'analyze') {
      await analyzeProfile();
      return;
    }
    
    if (lowerCaseText === '/faq' || lowerCaseText === 'faq') {
      await showFaqButtons();
      return;
    }

    // Profile-related queries
    if (
      lowerCaseText.includes('analyze') && lowerCaseText.includes('profile') ||
      lowerCaseText.includes('profile analysis') ||
      lowerCaseText.includes('analyze my profile')
    ) {
      await analyzeProfile();
      return;
    }

    // Skill suggestions
    if (
      lowerCaseText.includes('skill') &&
      (lowerCaseText.includes('suggest') || 
       lowerCaseText.includes('recommend') || 
       lowerCaseText.includes('add') ||
       lowerCaseText.includes('what'))
    ) {
      await sendToAI(text);
      return;
    }

    // Profile improvement
    if (
      lowerCaseText.includes('improve') && lowerCaseText.includes('profile') ||
      lowerCaseText.includes('profile tips') ||
      lowerCaseText.includes('better profile')
    ) {
      await sendToAI(text);
      return;
    }

    // Event queries
    if (lowerCaseText.includes('event')) {
      await sendToAI(text);
      return;
    }

    // Networking queries
    if (
      lowerCaseText.includes('network') ||
      lowerCaseText.includes('connect') ||
      lowerCaseText.includes('connection')
    ) {
      await sendToAI(text);
      return;
    }

    // Forum queries
    if (lowerCaseText.includes('forum') || lowerCaseText.includes('discussion')) {
      await sendToAI(text);
      return;
    }

    // FAQ handling
    if (
      lowerCaseText.includes('how do i') ||
      lowerCaseText.includes('how to') ||
      lowerCaseText.includes('how can i')
    ) {
      // Check if it matches any FAQ
      const match = FAQS.find(item => 
        lowerCaseText.includes(item.q.toLowerCase().split(' ').slice(0, 3).join(' '))
      );
      if (match) {
        setLoading(true);
        await sleep(250);
        addMessage('bot', match.a);
        setLoading(false);
        return;
      }
    }

    // For everything else, send to AI
    await sendToAI(text);
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
                    <div className={`px-4 py-3 rounded-2xl shadow-sm max-w-[85%] break-words whitespace-pre-line leading-relaxed text-sm ${
                      msg.sender === 'user' 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}>
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
