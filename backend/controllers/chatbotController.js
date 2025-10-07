
const axios = require('axios');
require('dotenv').config();

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
