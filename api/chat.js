const Groq = require('groq-sdk');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return res.status(500).json({ error: 'GROQ API key not configured' });
  }

  try {
    const groq = new Groq({
      apiKey: groqApiKey,
    });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: '你是一個友善且專業的 AI 助理，請用繁體中文回答問題。',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 1,
      max_completion_tokens: 2048,
      top_p: 1,
      stream: false,
      reasoning_effort: 'medium',
      stop: null,
    });

    const aiResponse =
      (completion.choices &&
        completion.choices[0] &&
        completion.choices[0].message &&
        completion.choices[0].message.content) ||
      '無法取得回應';

    return res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error('Error calling GROQ API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

