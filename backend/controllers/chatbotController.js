const axios = require('axios');
require('dotenv').config();
const Event = require('../models/Event');
const Alumni = require('../models/Alumni');
const User = require('../models/User');

// Short, message-style FAQ responses
const faqData = [
  {
    question: "How can I register for an event?",
    answer: "Go to Events → Click Register button."
  },
  {
    question: "How do I update my profile?",
    answer: "Open Profile → Edit → Save changes."
  },
  {
    question: "How can I contact alumni support?",
    answer: "Email: alumni@college.edu"
  },
  {
    question: "How to reset password?",
    answer: "Click 'Forgot Password' on login page."
  },
  {
    question: "Where can I find mentorship programs?",
    answer: "Check Mentorship tab under Dashboard."
  },
  {
    question: "How do I post in the forum?",
    answer: "Go to Forum → Click 'Create Post'."
  },
  {
    question: "How to connect with other alumni?",
    answer: "Use Connections tab to find and connect."
  },
  {
    question: "Where can I see my notifications?",
    answer: "Check the bell icon in the top navigation."
  }
];

async function getAIResponse(message) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OpenRouter API key not set. Check your .env file and restart the server.');
    return 'AI service temporarily unavailable.';
  }
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3-8b-instruct',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful alumni assistant. Keep responses short (1-2 sentences max). Be concise and direct.' 
          },
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
      return 'AI did not return a valid answer.';
    }
  } catch (err) {
    console.error('OpenRouter API error:', err.response ? err.response.data : err.message);
    return 'AI service temporarily unavailable.';
  }
}

const handleFAQ = async () => {
  try {
    const randomFAQs = faqData.sort(() => 0.5 - Math.random()).slice(0, 3);
    return randomFAQs;
  } catch (error) {
    console.error('FAQ API error:', error);
    return [];
  }
};

const handleProfileAnalysis = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return "Please update your profile to get better suggestions.";
    }

    const suggestions = [];
    
    // Check if skills are missing or limited
    if (!user.skills || user.skills.length < 3) {
      suggestions.push("Add more skills to your profile (aim for 5+ relevant skills).");
    }
    
    // Check if bio is missing
    if (!user.bio || user.bio.length < 50) {
      suggestions.push("Complete your bio section with professional summary.");
    }
    
    // Check if social links are missing
    if (!user.socials?.linkedin) {
      suggestions.push("Add your LinkedIn profile for better networking.");
    }
    
    // Check if company/position is missing for alumni
    if (user.role === 'alumni' && (!user.company || !user.position)) {
      suggestions.push("Add your current company and position details.");
    }
    
    // Check if graduation year is missing
    if (user.role === 'alumni' && !user.graduationYear) {
      suggestions.push("Add your graduation year to your profile.");
    }
    
    // If no specific issues found, provide general suggestions
    if (suggestions.length === 0) {
      suggestions.push("Your profile looks good! Consider adding recent projects.");
      suggestions.push("Share your achievements and certifications.");
      suggestions.push("Update your profile picture for better visibility.");
    }

    return suggestions.slice(0, 3); // Return max 3 suggestions
  } catch (error) {
    console.error('Profile analysis error:', error);
    return ["Please update your profile to get better suggestions."];
  }
};

const chatbotReply = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id;

    if (!message) {
      return res.status(400).json({ reply: 'Please provide a message.' });
    }

    const lowerMessage = message.toLowerCase();

    let reply;

    // Handle FAQ requests
    if (lowerMessage.includes('faq') || lowerMessage.includes('help') || lowerMessage.includes('question')) {
      const faqs = await handleFAQ();
      reply = {
        type: 'faq',
        data: faqs
      };
    }
    // Handle profile analysis requests
    else if (lowerMessage.includes('analyze') || lowerMessage.includes('profile') || lowerMessage.includes('improve') || lowerMessage.includes('suggest')) {
      if (!userId) {
        reply = "Please log in to analyze your profile.";
      } else {
        const suggestions = await handleProfileAnalysis(userId);
        reply = {
          type: 'profile_analysis',
          data: suggestions
        };
      }
    }
    // Handle event requests (keep existing functionality)
    else if (lowerMessage.includes('event')) {
      reply = "Fetching events for you...";
    }
    // Default to AI response for other queries
    else {
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