const axios = require("axios");
require("dotenv").config();

const Event = require("../models/Event");
const Alumni = require("../models/Alumni");
const User = require("../models/User");
const Student = require("../models/Student");
const Skill = require("../models/Skill");
const Post = require("../models/Post");
const ForumPost = require("../models/ForumPost");

// External AI (optional; safe fallbacks included)
// NOTE: This controller does not depend on database models, but some
// environments previously imported models here using ESM (import ... from '../models/Event').
// To avoid ERR_MODULE_NOT_FOUND on Node >=20 ESM resolver, we explicitly avoid ESM imports
// and optionally load models with CommonJS require including the .js extension.
// If these models are not needed they won't be used; if present, requiring with extension
// guarantees resolution on Windows paths as well.
try {
  require("../models/Event.js");
} catch (_) {}
try {
  require("../models/Alumni.js");
} catch (_) {}

// Build platform context for AI
function buildPlatformContext() {
  return `You are AlumniConnect Assistant - a helpful chatbot.

STRICT FORMATTING RULES:
- NEVER use asterisks (*), underscores (_), or any markdown
- NEVER use ** for bold or * for emphasis  
- NEVER use bullet points or numbered lists
- Write ONLY plain text in natural sentences
- Maximum 2-3 sentences, under 40 words total
- Be casual and friendly like texting

You help with:
- Events and workshops
- Networking and connections
- Profile building
- Forum discussions

Respond naturally and briefly. If you don't know, say "Try checking the Events or Profile page!"

For unrelated topics: "I only help with AlumniConnect features. What can I help you with?"`;
}

async function getAIResponse(message, contextData = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return "I can help with platform features, events, networking, and profile improvement. What would you like to know?";
  }

  try {
    const messages = [
      {
        role: "system",
        content: buildPlatformContext(),
      },
    ];

    // Add context if provided
    if (contextData) {
      messages.push({
        role: "system",
        content: `Platform Context: ${contextData}`,
      });
    }

    messages.push({ role: "user", content: message });

    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3-8b-instruct",
        messages,
        temperature: 0.7,
        max_tokens: 60,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      }
    );
    const content =
      res?.data?.choices?.[0]?.message?.content ||
      "I can help with platform features. Ask me about events, networking, or profile tips!";
    
    // Remove any markdown formatting that might slip through
    const cleanContent = content
      .replace(/\*\*/g, '')  // Remove bold **
      .replace(/\*/g, '')    // Remove emphasis *
      .replace(/\n\n/g, ' ') // Replace double newlines with space
      .replace(/- /g, '')    // Remove bullet points
      .replace(/\d+\. /g, '') // Remove numbered lists
      .trim();
    
    return cleanContent;
  } catch (err) {
    console.error("AI response error:", err.message);
    return "I can help with platform features like networking, events, and your profile. What would you like to know?";
  }
}

// Short, message-style FAQs
function getFAQs() {
  return [
    {
      q: "How can I register for an event?",
      a: "Go to Events → Click Register.",
    },
    { q: "How do I post in the forum?", a: "Visit Forum → Create Post." },
    { q: "How can I contact alumni support?", a: "Email alumni@college.edu." },
    { q: "How do I update my profile?", a: "Open Profile → Edit → Save." },
    { q: "How can I reset my password?", a: "Click Forgot Password on login." },
    {
      q: "How do I find alumni mentorship?",
      a: "Check Mentorship under Dashboard.",
    },
    {
      q: "How can I strengthen my resume?",
      a: "Add certifications and achievements.",
    },
  ];
}

function formatFAQList() {
  const faqs = getFAQs();
  // Return a short set, each on its own line
  return faqs.map((f) => `${f.q} → ${f.a}`).join("\n");
}

async function buildDetailedProfileData(userId) {
  if (!userId) {
    return null;
  }

  try {
    const user = await User.findById(userId)
      .select('-password')
      .populate('connections', 'name role')
      .lean();

    if (!user) return null;

    // Get role-specific data
    let roleSpecificData = null;
    if (user.role === 'alumni') {
      roleSpecificData = await Alumni.findOne({ email: user.email })
        .select('-password')
        .lean();
    } else if (user.role === 'student') {
      roleSpecificData = await Student.findOne({ email: user.email })
        .select('-password')
        .lean();
    }

    // Get user's activity stats
    const postCount = await Post.countDocuments({ user: userId });
    const forumPostCount = await ForumPost.countDocuments({ author: userId });

    return {
      user,
      roleSpecificData,
      stats: {
        postCount,
        forumPostCount,
        connectionCount: user.connections?.length || 0,
      },
    };
  } catch (err) {
    console.error('Error fetching profile data:', err);
    return null;
  }
}

async function analyzeProfileWithAI(userId) {
  const profileData = await buildDetailedProfileData(userId);

  if (!profileData) {
    return "Please log in to get personalized profile analysis and suggestions.";
  }

  const { user, roleSpecificData, stats } = profileData;

  // Build profile summary for AI
  const profileSummary = `
Analyze this ${user.role}'s profile briefly:
- Skills: ${user.skills?.length || 0} (${user.skills?.slice(0, 3).join(', ') || 'none'})
- Connections: ${stats.connectionCount}
- Posts: ${stats.postCount}
- Bio: ${user.bio ? 'Yes' : 'No'}
- Completeness: ${calculateProfileCompleteness(user, roleSpecificData)}%
`;

  const roleSpecificInfo = buildRoleSpecificSummary(user.role, roleSpecificData);

  const analysisPrompt = `${profileSummary}${roleSpecificInfo}

Give ONE specific tip to improve their profile in 2 simple sentences. Use plain text only - absolutely no asterisks, no bold, no bullets. Write like you're giving friendly advice in a text message. Max 35 words.`;

  return await getAIResponse(analysisPrompt);
}

function calculateProfileCompleteness(user, roleData) {
  let score = 0;
  let total = 10;

  if (user.name) score++;
  if (user.bio) score++;
  if (user.avatarUrl) score++;
  if (user.location) score++;
  if (user.skills?.length > 0) score++;
  if (user.skills?.length >= 5) score++;
  if (user.department) score++;
  if (user.company || user.position) score++;
  if (user.socials?.linkedin || user.socials?.github) score++;
  
  if (roleData) {
    if (user.role === 'alumni') {
      if (roleData.mentorship_interests?.length > 0) score++;
    } else if (user.role === 'student') {
      if (roleData.careerInterests?.length > 0) score++;
    }
  } else {
    total = 9; // Reduce total if no role-specific data
  }

  return Math.round((score / total) * 100);
}

function buildRoleSpecificSummary(role, roleData) {
  if (!roleData) return '';

  if (role === 'alumni') {
    return `
Alumni-Specific Info:
- Current Job: ${roleData.current_job_title || 'Not specified'}
- Industry: ${roleData.industry || 'Not specified'}
- Mentorship Interests: ${roleData.mentorship_interests?.join(', ') || 'None'}
- Certifications: ${roleData.certifications?.length || 0}
- Available for Mentorship: ${roleData.availability || 'Not set'}
`;
  }

  if (role === 'student') {
    return `
Student-Specific Info:
- Year: ${roleData.year || 'Not specified'}
- Career Interests: ${roleData.careerInterests?.join(', ') || 'None'}
- Activities: ${roleData.activities?.join(', ') || 'None'}
- Open to Mentorship: ${roleData.mentorshipOpen ? 'Yes' : 'No'}
`;
  }

  return '';
}

async function buildProfileSummary(userId) {
  // Kept for backward compatibility, but now uses AI
  return await analyzeProfileWithAI(userId);
}

async function buildEventsSummary(userId = null) {
  try {
    const now = new Date();
    const upcoming = await Event.find({ date: { $gte: now } })
      .sort({ date: 1 })
      .limit(5)
      .lean();

    if (!upcoming || upcoming.length === 0) {
      return await getAIResponse(
        "Tell user there are no upcoming events. Encourage them to check back soon. Keep it to 1-2 sentences."
      );
    }

    const eventsList = upcoming
      .map((e, idx) => {
        const day = new Date(e.date).toLocaleDateString();
        const time = new Date(e.date).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `${idx + 1}. ${e.title} - ${day} at ${time}${e.location ? ` (${e.location})` : ''}`;
      })
      .join('\n');

    const contextPrompt = `Events coming up:
${eventsList}

Tell about these events in 2 plain sentences. No asterisks, no formatting. Max 40 words.`;

    return await getAIResponse(contextPrompt);
  } catch (err) {
    console.error('Error fetching events:', err);
    return "I can help you find upcoming events. Please try again or check the Events page directly.";
  }
}

// Build dynamic platform context
async function getPlatformStats() {
  try {
    const [userCount, eventCount, postCount] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Post.countDocuments(),
    ]);

    return `Current platform activity: ${userCount} users, ${eventCount} events, ${postCount} posts shared.`;
  } catch (err) {
    return '';
  }
}

// MAIN: exported handler
async function chatbotReply(req, res) {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.json({ reply: "Hi! Ask me about events, networking, or your profile. What can I help with?" });
    }

    const lower = message.toLowerCase();
    const userId = req.user?._id || null;

    // Profile analysis with AI
    if (
      lower.includes("analyze") &&
      (lower.includes("profile") || lower.includes("my profile"))
    ) {
      if (!userId) {
        return res.json({
          reply: "Please log in to get personalized profile analysis and improvement suggestions.",
        });
      }
      const analysis = await analyzeProfileWithAI(userId);
      return res.json({ reply: analysis });
    }

    // Profile improvement suggestions
    if (
      (lower.includes("improve") && lower.includes("profile")) ||
      lower.includes("profile tips") ||
      lower.includes("profile suggestion")
    ) {
      if (!userId) {
        const genericTips = await getAIResponse(
          "Give 2 quick tips for a strong profile on an alumni platform. Keep it under 40 words."
        );
        return res.json({ reply: genericTips });
      }
      const analysis = await analyzeProfileWithAI(userId);
      return res.json({ reply: analysis });
    }

    // Skills suggestions
    if (
      lower.includes("skill") &&
      (lower.includes("add") ||
        lower.includes("suggest") ||
        lower.includes("recommend") ||
        lower.includes("what"))
    ) {
      if (!userId) {
        return res.json({
          reply: await getAIResponse(
            "Tell the user to log in to get personalized skill recommendations based on their profile and career goals."
          ),
        });
      }

      const profileData = await buildDetailedProfileData(userId);
      if (profileData) {
        const { user, roleSpecificData } = profileData;
        const skillPrompt = `User is ${user.role} with skills: ${
          user.skills?.join(', ') || 'none'
        }. Industry: ${
          user.industry || user.company || 'not set'
        }. Suggest 2-3 relevant skills to add. Keep response under 50 words.`;

        const suggestions = await getAIResponse(skillPrompt);
        return res.json({ reply: suggestions });
      }
    }

    // Events query
    if (lower.includes("event")) {
      const summary = await buildEventsSummary(userId);
      return res.json({ reply: summary });
    }

    // Networking advice
    if (
      lower.includes("network") ||
      lower.includes("connect") ||
      lower.includes("connection")
    ) {
      const platformStats = await getPlatformStats();
      const networkingPrompt = `User asking about networking. ${platformStats} Give 2 quick networking tips for AlumniConnect. Max 50 words.`;
      const advice = await getAIResponse(networkingPrompt);
      return res.json({ reply: advice });
    }

    // Forum help
    if (lower.includes("forum") || lower.includes("discussion")) {
      const forumHelp = await getAIResponse(
        "Explain how to use the forum on AlumniConnect in 2 sentences. Be simple."
      );
      return res.json({ reply: forumHelp });
    }

    // FAQ
    if (lower.includes("faq") || lower.includes("help")) {
      return res.json({ reply: formatFAQList() });
    }

    // General platform questions - AI with context
    const platformStats = await getPlatformStats();
    const contextualResponse = await getAIResponse(message, platformStats);
    return res.json({ reply: contextualResponse });
  } catch (err) {
    console.error("Chatbot error:", err);
    return res.status(500).json({
      reply: "I'm having trouble right now. Please try asking about events, profile tips, or networking advice!",
    });
  }
}

module.exports = { chatbotReply };
