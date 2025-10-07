import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import { FiMessageCircle, FiSend, FiX, FiUser, FiCalendar, FiHelpCircle, FiChevronDown, FiArrowRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

// --- Helper Functions for Rendering Cards ---

const renderEventCard = (event) => (
  <Link to={`/events/${event._id}`} className="block bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-indigo-100">
    <div className="font-semibold text-indigo-700">{event.title}</div>
    <div className="text-sm text-gray-600">{new Date(event.startAt).toLocaleDateString()}</div>
    <p className="text-xs text-gray-500 mt-1">{event.description.substring(0, 50)}...</p>
  </Link>
);

const quickActions = [
  { label: 'FAQ Helper', value: 'faq', icon: <FiHelpCircle /> },
  { label: 'Event Guide', value: 'events', icon: <FiCalendar /> },
  { label: 'Profile Analyzer', value: 'analyze', icon: <FiUser /> },
];

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '👋 Hi! I am your AlumniConnect AI Assistant. How can I help you today?' }
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
    addMessage('bot', '🎉 Fetching upcoming events...');
    setLoading(true);
    try {
      const { data } = await axios.get('/api/events');
      if (data.length > 0) {
        addMessage('bot', 'Here are some upcoming events:', {
          type: 'events',
          items: data.slice(0, 3)
        });
      } else {
        addMessage('bot', "No upcoming events found right now.");
      }
    } catch (err) {
      addMessage('bot', 'Sorry, I had trouble fetching events.');
    }
    setLoading(false);
  };

  const fetchFAQ = async () => {
    addMessage('bot', '💡 Getting helpful info...');
    setLoading(true);
    try {
      const res = await axios.post('/api/chatbot', { message: 'faq' });
      addMessage('bot', res.data.reply);
    } catch (err) {
      addMessage('bot', 'Sorry, I had trouble fetching FAQs.');
    }
    setLoading(false);
  };

  const analyzeProfile = async () => {
    addMessage('bot', '🔍 Analyzing your profile...');
    setLoading(true);
    try {
      const res = await axios.post('/api/chatbot', { message: 'analyze my profile' });
      addMessage('bot', res.data.reply);
    } catch (err) {
      addMessage('bot', 'Sorry, I had trouble analyzing your profile.');
    }
    setLoading(false);
  };

  const handleGenericAIQuery = async (text) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/chatbot', { message: text });
      addMessage('bot', res.data.reply);
    } catch (err) {
      addMessage('bot', 'Sorry, something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // --- Intelligent Keyword Detection ---

  const handleUserMessage = async (text) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setInput('');

    const lowerCaseText = text.toLowerCase();

    if (lowerCaseText.includes('event') || lowerCaseText.includes('upcoming')) {
      await fetchEvents();
    } else if (lowerCaseText.includes('faq') || lowerCaseText.includes('help')) {
      await fetchFAQ();
    } else if (lowerCaseText.includes('analyze') || lowerCaseText.includes('profile') || lowerCaseText.includes('improve')) {
      await analyzeProfile();
    } else {
      await handleGenericAIQuery(text);
    }
  };

  const handleQuickAction = (action) => {
    if (action === 'faq') {
      handleUserMessage('faq');
    } else if (action === 'events') {
      handleUserMessage('events');
    } else if (action === 'analyze') {
      handleUserMessage('analyze my profile');
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