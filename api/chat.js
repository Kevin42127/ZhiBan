import { Groq } from 'groq-sdk';

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history = [], language = 'zh-TW' } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY is not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const groq = new Groq({
      apiKey: apiKey,
    });

    let systemPromptContent = '';
    if (language === 'zh-TW') {
      systemPromptContent = '請使用繁體中文回應。所有回應必須使用繁體中文，不得使用其他語言。回應格式必須是純文字，不要使用 Markdown 格式、代碼塊、粗體、斜體等任何格式化符號，只輸出純文字內容。';
    } else {
      systemPromptContent = 'Please respond in English. All responses must be in English only, do not use other languages. Response format must be plain text only, do not use Markdown formatting, code blocks, bold, italic, or any other formatting symbols. Output only plain text content.';
    }

    const systemPrompt = {
      role: 'system',
      content: systemPromptContent
    };

    const messages = [
      systemPrompt,
      ...(Array.isArray(history) ? history.map(msg => ({
        role: msg.role || 'user',
        content: msg.content || ''
      })) : []),
      {
        role: 'user',
        content: message
      }
    ];

    let chatCompletion;
    try {
      chatCompletion = await groq.chat.completions.create({
        messages: messages,
        model: "openai/gpt-oss-120b",
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: true,
        reasoning_effort: "medium",
        stop: null
      });
    } catch (modelError) {
      console.error('Model error, trying alternative:', modelError.message);
      chatCompletion = await groq.chat.completions.create({
        messages: messages,
        model: "llama-3.1-70b-versatile",
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: true,
        stop: null
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';
    try {
      for await (const chunk of chatCompletion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true, fullContent: fullContent })}\n\n`);
      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: 'Stream error',
          details: streamError.message 
        });
      }
      res.end();
    }
  } catch (error) {
    console.error('Error in handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      });
    }
    res.end();
  }
}

