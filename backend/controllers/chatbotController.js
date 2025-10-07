const axios = require('axios');
require('dotenv').config();

const Event = require('../models/Event');
const Alumni = require('../models/Alumni');
const User = require('../models/User');
const Skill = require('../models/Skill');

// External AI (optional; safe fallbacks included)
async function getAIResponse(message) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Safe, short fallback if no key
    return 'I can help with FAQs, events, or profiles.';
  }

  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3-8b-instruct',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert alumni assistant for a college portal. Answer helpfully and briefly.',
          },
          { role: 'user', content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      }
    );
    const content =
      res?.data?.choices?.[0]?.message?.content ||
      'I can help with FAQs, events, or profiles.';
    return content.trim();
  } catch (err) {
    // Non-fatal: return a friendly fallback
    return 'I can help with FAQs, events, or profiles.';
  }
}

// Short, message-style FAQs
function getFAQs() {
  return [
    { q: 'How can I register for an event?', a: 'Go to Events → Click Register.' },
    { q: 'How do I post in the forum?', a: 'Visit Forum → Create Post.' },
    { q: 'How can I contact alumni support?', a: 'Email alumni@college.edu.' },
    { q: 'How do I update my profile?', a: 'Open Profile → Edit → Save.' },
    { q: 'How can I reset my password?', a: 'Click Forgot Password on login.' },
    { q: 'How do I find alumni mentorship?', a: 'Check Mentorship under Dashboard.' },
    { q: 'How can I strengthen my resume?', a: 'Add certifications and achievements.' },
  ];
}

function formatFAQList() {
  const faqs = getFAQs();
  // Return a short set, each on its own line
  return faqs.map((f) => `${f.q} → ${f.a}`).join('\n');
}

async function buildProfileSummary(userId) {
  // Not all chatbot routes are authenticated; guard null user
  if (!userId) {
    return [
      'Please update your profile to get better suggestions.',
      'You can edit Profile → Add skills, projects, and goals.',
    ].join('\n');
  }

  // Try to read basic user + any known attachments (student/alumni models)
  const user = await User.findById(userId).select(
    'name skills specialization current_job_title'
  );
  if (!user) {
    return 'Please update your profile to get better suggestions.';
  }

  const skills = Array.isArray(user.skills) ? user.skills : [];
  const skillCount = skills.length;

  const goal =
    user.specialization || user.current_job_title || 'Not set';

  // Very short, chat-style lines
  return [
    `You’ve added ${skillCount} skill(s).`,
    `Goal: ${goal}.`,
    'You could highlight certifications and internships.',
  ].join('\n');
}

// EVENTS (optional quick summary)
async function buildEventsSummary() {
  const upcoming = await Event.find({}).sort({ date: 1 }).limit(3);
  if (!upcoming || upcoming.length === 0) {
    return 'No updates found right now.';
  }
  // One-liners
  return upcoming
    .map((e) => {
      const day = new Date(e.date).toLocaleDateString();
      return `📅 ${e.title} — ${day}`;
    })
    .join('\n');
}

// MAIN: exported handler
async function chatbotReply(req, res) {
  try {
    const message = String(req.body?.message || '').trim();

    if (!message) {
      return res.json({ reply: 'Please type your question.' });
    }

    const lower = message.toLowerCase();

    // Simple keyword routing
    if (lower.startsWith('/faq') || lower.includes('faq')) {
      return res.json({ reply: formatFAQList() });
    }

    if (
      lower.includes('analyze my profile') ||
      (lower.includes('analyze') && lower.includes('profile')) ||
      lower.includes('how can i improve my profile')
    ) {
      const userId = req.user?._id || null; // route may be unauthenticated
      const summary = await buildProfileSummary(userId);
      return res.json({ reply: summary });
    }

    if (lower.includes('event')) {
      const summary = await buildEventsSummary();
      return res.json({ reply: summary });
    }

    // Fallback to short AI or generic message
    const ai = await getAIResponse(message);
    return res.json({ reply: ai });
  } catch (err) {
    console.error('Chatbot error:', err);
    return res
      .status(500)
      .json({ reply: 'Sorry, I could not process your request.' });
  }
}

module.exports = { chatbotReply };