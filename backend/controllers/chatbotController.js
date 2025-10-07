
const axios = require('axios');
require('dotenv').config();

// NOTE: This controller does not depend on database models, but some
// environments previously imported models here using ESM (import ... from '../models/Event').
// To avoid ERR_MODULE_NOT_FOUND on Node >=20 ESM resolver, we explicitly avoid ESM imports
// and optionally load models with CommonJS require including the .js extension.
// If these models are not needed they won't be used; if present, requiring with extension
// guarantees resolution on Windows paths as well.
try { require('../models/Event.js'); } catch (_) {}
try { require('../models/Alumni.js'); } catch (_) {}

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

exports.chatbotReply = async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await getAIResponse(message);
    res.json({ reply });
  } catch (err) {
    res.json({ reply: 'Sorry, I could not process your request. Please try again.' });
  }
};
