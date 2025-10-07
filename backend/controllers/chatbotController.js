const axios = require('axios');
require('dotenv').config();
const Event = require('../models/Event');
const Alumni = require('../models/Alumni');
const User = require('../models/User');

// Updated FAQ content - short and message-style
const faqData = [
  { question: "How can I register for an event?", answer: "Go to Events → Click Register button." },
  { question: "How do I update my profile?", answer: "Open Profile → Edit → Save changes." },
  { question: "How can I contact alumni support?", answer: "Email: alumni@college.edu" },
  { question: "How to reset password?", answer: "Click 'Forgot Password' on login page." },
  { question: "Where can I find mentorship programs?", answer: "Check Mentorship tab under Dashboard." },
  { question: "How do I post in the forum?", answer: "Go to Forum → Click 'Create Post'." },
  { question: "How to connect with other alumni?", answer: "Use the Connections tab to find and connect." },
  { question: "Where can I see my notifications?", answer: "Check the bell icon in the top navigation bar." }
];

async function getAIResponse(message) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OpenRouter API key not set. Check your .env file and restart the server.');
    return 'AI service is currently unavailable. Please try again later.';
  }
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3-8b-instruct',
        messages: [
          { role: 'system', content: 'You are a helpful alumni assistant. Keep responses short (1-2 sentences max) and professional.' },
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message && res.data.choices[0].message.content) {
      return res.data.choices[0].message.content;
    } else {
      console.error('OpenRouter API response missing expected content:', res.data);
      return 'I could not process that request. Please try again.';
    }
  } catch (err) {
    console.error('OpenRouter API error:', err.response ? err.response.data : err.message);
    return 'AI service is currently unavailable. Please try again later.';
  }
}

const handleFAQ = async () => {
  try {
    if (faqData && faqData.length > 0) {
      const randomFaq = faqData[Math.floor(Math.random() * faqData.length)];
      return `Q: ${randomFaq.question}\nA: ${randomFaq.answer}`;
    } else {
      return "No FAQs available right now.";
    }
  } catch (error) {
    console.error('FAQ API error:', error);
    return "Sorry, I couldn't retrieve FAQs right now.";
  }
};

const handleEvents = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return "Please log in to view events.";

    let filter = { status: 'active' };
    
    // Filter events based on user role and department
    if (user.role === 'student') {
      filter.target_roles = 'student';
      filter.target_student_combinations = {
        $elemMatch: { department: user.department, year: user.year }
      };
    } else if (user.role === 'teacher') {
      filter.target_roles = 'teacher';
      filter.target_teacher_departments = user.department;
    } else if (user.role === 'alumni') {
      filter.target_roles = 'alumni';
      filter.target_alumni_combinations = {
        $elemMatch: { department: user.department, graduation_year: user.graduationYear }
      };
    }

    const events = await Event.find(filter)
      .populate('organizer', 'name email role department year graduationYear')
      .sort({ startAt: 1 })
      .limit(3);

    if (events && events.length > 0) {
      const eventList = events.map((event, index) => 
        `${index + 1}. ${event.title} - ${new Date(event.startAt).toLocaleDateString()}`
      ).join('\n');
      return `Here are upcoming events:\n${eventList}`;
    } else {
      return "No upcoming events found for your profile.";
    }
  } catch (error) {
    console.error('Events API error:', error);
    return "Sorry, I couldn't fetch events right now.";
  }
};

const handleProfileAnalysis = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return "Please log in to analyze your profile.";

    const suggestions = [];
    
    // Check if profile is complete
    if (!user.bio || user.bio.length < 10) {
      suggestions.push("Add a detailed bio to your profile.");
    }
    
    if (!user.skills || user.skills.length < 3) {
      suggestions.push("Add more skills to showcase your expertise.");
    }
    
    if (!user.position || !user.company) {
      suggestions.push("Update your current job details.");
    }
    
    if (!user.socials || !user.socials.linkedin) {
      suggestions.push("Add your LinkedIn profile for better networking.");
    }

    // Add skill-specific recommendations based on department
    if (user.department === 'Information Technology') {
      suggestions.push("Consider learning Power BI or SQL for data analytics.");
    } else if (user.department === 'Computer Science') {
      suggestions.push("Explore cloud technologies like AWS or Azure.");
    } else if (user.department === 'Business') {
      suggestions.push("Develop project management skills (PMP, Agile).");
    }

    if (suggestions.length === 0) {
      return "Your profile looks great! Consider joining alumni events to grow your network.";
    }

    return suggestions.slice(0, 3).join('\n• ');
  } catch (error) {
    console.error('Profile analysis error:', error);
    return "Please update your profile to get better suggestions.";
  }
};

const chatbotReply = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id;

    if (!message || !message.trim()) {
      return res.json({ reply: "Please send a message." });
    }

    const lowerCaseMessage = message.toLowerCase();

    let reply;

    if (lowerCaseMessage.includes('faq') || lowerCaseMessage.includes('help')) {
      reply = await handleFAQ();
    } else if (lowerCaseMessage.includes('event') || lowerCaseMessage.includes('upcoming')) {
      reply = await handleEvents(userId);
    } else if (lowerCaseMessage.includes('analyze') || lowerCaseMessage.includes('profile') || lowerCaseMessage.includes('improve')) {
      reply = await handleProfileAnalysis(userId);
    } else {
      reply = await getAIResponse(message);
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ reply: 'Sorry, I could not process your request. Please try again.' });
  }
};

module.exports = {
  chatbotReply
};