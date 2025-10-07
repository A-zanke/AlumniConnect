const axios = require('axios');
require('dotenv').config();
const Event = require('../models/Event');
const Alumni = require('../models/Alumni');
const User = require('../models/User');
const Student = require('../models/Student');

async function getAIResponse(message) {
  // Use OpenRouter API for real AI answers
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OpenRouter API key not set. Check your .env file and restart the server.');
    return 'OpenRouter API key not set. Please contact admin.';
  }
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3-8b-instruct',
        messages: [
          { role: 'system', content: 'You are an expert alumni assistant for a college portal. Answer helpfully and concisely in 1-2 sentences maximum.' },
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
    return 'Sorry, the AI service is currently unavailable.';
  }
}

const handleFAQ = async () => {
  try {
    // Short, message-style FAQs
    const faqs = [
      { question: "How can I register for an event?", answer: "Go to Events → Click Register button." },
      { question: "How do I update my profile?", answer: "Open Profile → Edit → Save changes." },
      { question: "How can I contact alumni support?", answer: "Email: alumni@college.edu" },
      { question: "How to reset password?", answer: "Click 'Forgot Password' on login page." },
      { question: "Where can I find mentorship programs?", answer: "Check Mentorship tab under Dashboard." },
      { question: "How do I post in the forum?", answer: "Go to Forum → Click 'Create Post'." },
      { question: "How to connect with other alumni?", answer: "Visit their profile → Click 'Connect'." },
      { question: "Where can I see my connections?", answer: "Go to Dashboard → View Connections." }
    ];
    
    if (faqs && faqs.length > 0) {
      return faqs.map((faq, index) => `${index + 1}. Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n');
    } else {
      return "No FAQs found.";
    }
  } catch (error) {
    console.error('FAQ API error:', error);
    return "Sorry, I couldn't retrieve FAQs right now.";
  }
};

const handleProfileAnalysis = async (userId) => {
  try {
    // Fetch user profile data
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return "Please update your profile to get better suggestions.";
    }

    let profileData = {};
    let suggestions = [];

    if (user.role === 'student') {
      const studentData = await Student.findOne({ email: user.email });
      if (studentData) {
        profileData = {
          department: studentData.department,
          skills: studentData.skills || [],
          projects: studentData.projects || [],
          internships: studentData.internships || [],
          certifications: studentData.certifications || []
        };
      }
    } else if (user.role === 'alumni') {
      const alumniData = await Alumni.findOne({ email: user.email });
      if (alumniData) {
        profileData = {
          department: alumniData.department,
          skills: alumniData.skills || [],
          current_job_title: alumniData.current_job_title,
          company: alumniData.company,
          certifications: alumniData.certifications || []
        };
      }
    }

    // Generate profile suggestions based on data
    if (!profileData.skills || profileData.skills.length === 0) {
      suggestions.push("Add your technical skills to your profile.");
    } else if (profileData.department === 'Information Technology' || profileData.department === 'Computer Science') {
      suggestions.push("Improve your data analysis skills (Power BI, SQL).");
    }

    if (user.role === 'student') {
      if (!profileData.projects || profileData.projects.length === 0) {
        suggestions.push("Add your latest projects to showcase your work.");
      }
      if (!profileData.internships || profileData.internships.length === 0) {
        suggestions.push("Add your internship experience to your profile.");
      }
    }

    if (user.role === 'alumni') {
      if (!profileData.current_job_title || !profileData.company) {
        suggestions.push("Update your current job details.");
      }
    }

    if (suggestions.length === 0) {
      suggestions.push("Consider joining an alumni event to grow your network.");
      suggestions.push("Update your bio to make your profile more engaging.");
      suggestions.push("Add certifications to highlight your expertise.");
    }

    // Return top 3 suggestions
    return suggestions.slice(0, 3).map((suggestion, index) => `• ${suggestion}`).join('\n');

  } catch (error) {
    console.error('Profile analysis error:', error);
    return "Please update your profile to get better suggestions.";
  }
};

const chatbotReply = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user ? req.user._id : null;
    
    if (!message) {
      return res.status(400).json({ reply: 'Please provide a message.' });
    }

    const lowerMessage = message.toLowerCase();
    let reply;

    if (lowerMessage.includes('faq') || lowerMessage.includes('help')) {
      reply = await handleFAQ();
    } else if (lowerMessage.includes('analyze') && lowerMessage.includes('profile')) {
      if (!userId) {
        reply = "Please log in to analyze your profile.";
      } else {
        reply = await handleProfileAnalysis(userId);
      }
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