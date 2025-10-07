const axios = require('axios');
require('dotenv').config();
const Event = require('../models/Event');
const Alumni = require('../models/Alumni');
const User = require('../models/User');
const Skill = require('../models/Skill'); // Assuming you have a Skill model

const userProfile = {
  id: 123,
  name: "Ashish Zanke",
  department: "Information Technology",
  batch: "2022"
};

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
          { role: 'system', content: 'You are an expert alumni assistant for a college portal. Answer helpfully and concisely.' },
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
    // Fetch FAQs from the database
    const faqs = [
        { question: "How can I register for an event?", answer: "Go to the Events page -> click 'Register'." },
        { question: "How do I update my profile?", answer: "Navigate to your profile page and click the 'Edit Profile' button." },
        { question: "How do I post in the forum?", answer: "Go to the Forum page -> click 'Create Post'." },
        { question: "How do I contact an alumni mentor?", answer: "Go to the Mentorship page -> click 'Connect'." },
        { question: "I forgot my password, what do I do?", answer: "Go to the 'Forgot Password' page and enter your email." }
    ];
    if (faqs && faqs.length > 0) {
      const formattedFAQs = faqs.map((faq, index) => `${index + 1}. Q: ${faq.question}\nA: ${faq.answer}`);
      return formattedFAQs.join('\n');
    } else {
      return "No FAQs found.";
    }
  } catch (error) {
    console.error('FAQ API error:', error);
    return "Sorry, I couldn't retrieve FAQs right now.";
  }
};

const handleAlumni = async () => {
  try {
    // Fetch alumni from the database based on user's department
    const alumni = await Alumni.find({ department: userProfile.department }).limit(5);
    if (alumni && alumni.length > 0) {
      const formattedAlumni = alumni.map((alumnus, index) => `${index + 1}. ${alumnus.name} - ${alumnus.position} at ${alumnus.company}\nProfile: /profile/${alumnus._id}`);
      return formattedAlumni.join('\n');
    } else {
      return "No alumni recommendations available right now.";
    }
  } catch (error) {
    console.error('Alumni API error:', error);
    return "Sorry, I couldn't retrieve alumni recommendations right now.";
  }
};

const handleMentorship = async () => {
  try {
    // Fetch mentors from the database based on user's department
    const mentors = await User.find({ department: userProfile.department, role: 'mentor' }).limit(5);
    if (mentors && mentors.length > 0) {
      const formattedMentors = mentors.map((mentor, index) => `${index + 1}. ${mentor.name} - ${mentor.expertise_area} at ${mentor.company}\nConnect: /connect/${mentor._id}`);
      return formattedMentors.join('\n');
    } else {
      return "No mentors available right now. Check back later!";
    }
  } catch (error) {
    console.error('Mentorship API error:', error);
    return "Sorry, I couldn't retrieve mentors right now.";
  }
};

const handleProfile = async () => {
  try {
    // Fetch user profile from the database
    const user = await User.findById(userProfile.id);
    if (user) {
      return `Name: ${user.name}\nDepartment: ${user.department}\nBatch: ${user.batch}\nView Full Profile: /profile`;
    } else {
      return "Couldn't find your profile details.";
    }
  } catch (error) {
    console.error('Profile API error:', error);
    return "Sorry, I couldn't retrieve your profile right now.";
  }
};

const handleSkills = async () => {
  try {
    // Fetch skill tips from the database based on user's department
    const skills = await Skill.find({ department: userProfile.department }).limit(5);

    let reply;
    if (message.toLowerCase().includes('faq')) {
      reply = await handleFAQ();
    } else if (message.toLowerCase().includes('alumni')) {
      reply = await handleAlumni();
    } else if (message.toLowerCase().includes('mentorship')) {
      reply = await handleMentorship();
    } else if (message.toLowerCase().includes('profile')) {
      reply = await handleProfile();
    } else if (message.toLowerCase().includes('skills')) {
      reply = await handleSkills();
    } else {
      reply = await getAIResponse(message);
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ reply: 'Sorry, I could not process your request. Please try again.' });
  }
};
