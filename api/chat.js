import { Groq } from 'groq-sdk';

const rateLimitStore = new Map();

const RATE_LIMITS = {
  per10Seconds: 3,
  perMinute: 20,
  per5Minutes: 50,
  perHour: 150,
  perDay: 2000,
  minInterval: 2000
};

function getClientId(req) {
  const clientApiKey = req.headers['x-api-key'] || req.body?.apiKey;
  return clientApiKey || req.headers['x-forwarded-for'] || 'unknown';
}

function checkRateLimit(clientId) {
  const now = Date.now();
  const key = `rate_limit_${clientId}`;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      requests: [],
      lastRequest: 0
    });
  }
  
  const record = rateLimitStore.get(key);
  const requests = record.requests.filter(time => now - time < 86400000);
  record.requests = requests;
  
  const recent10s = requests.filter(time => now - time < 10000).length;
  const recent1m = requests.filter(time => now - time < 60000).length;
  const recent5m = requests.filter(time => now - time < 300000).length;
  const recent1h = requests.filter(time => now - time < 3600000).length;
  const recent24h = requests.length;
  
  if (now - record.lastRequest < RATE_LIMITS.minInterval) {
    return {
      allowed: false,
      reason: '請求過於頻繁，請稍後再試',
      retryAfter: Math.ceil((RATE_LIMITS.minInterval - (now - record.lastRequest)) / 1000)
    };
  }
  
  if (recent10s >= RATE_LIMITS.per10Seconds) {
    const oldest = Math.min(...requests.filter(time => now - time < 10000));
    return {
      allowed: false,
      reason: '請求過於頻繁，請稍後再試',
      retryAfter: Math.ceil((10000 - (now - oldest)) / 1000)
    };
  }
  
  if (recent1m >= RATE_LIMITS.perMinute) {
    const oldest = Math.min(...requests.filter(time => now - time < 60000));
    return {
      allowed: false,
      reason: '每分鐘請求次數過多，請稍後再試',
      retryAfter: Math.ceil((60000 - (now - oldest)) / 1000)
    };
  }
  
  if (recent5m >= RATE_LIMITS.per5Minutes) {
    const oldest = Math.min(...requests.filter(time => now - time < 300000));
    return {
      allowed: false,
      reason: '短期內請求次數過多，請稍後再試',
      retryAfter: Math.ceil((300000 - (now - oldest)) / 1000)
    };
  }
  
  if (recent1h >= RATE_LIMITS.perHour) {
    const oldest = Math.min(...requests.filter(time => now - time < 3600000));
    return {
      allowed: false,
      reason: '每小時請求次數過多，請稍後再試',
      retryAfter: Math.ceil((3600000 - (now - oldest)) / 1000)
    };
  }
  
  if (recent24h >= RATE_LIMITS.perDay) {
    const oldest = Math.min(...requests);
    return {
      allowed: false,
      reason: '每日請求次數已達上限，請明天再試',
      retryAfter: Math.ceil((86400000 - (now - oldest)) / 1000)
    };
  }
  
  record.requests.push(now);
  record.lastRequest = now;
  
  if (rateLimitStore.size > 10000) {
    const oldestKey = Array.from(rateLimitStore.keys())[0];
    rateLimitStore.delete(oldestKey);
  }
  
  return { allowed: true };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientApiKey = req.headers['x-api-key'] || req.body?.apiKey;
    const serverApiKey = process.env.CLIENT_API_KEY;

    if (!serverApiKey) {
      console.error('CLIENT_API_KEY is not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!clientApiKey || clientApiKey !== serverApiKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    const clientId = getClientId(req);
    const rateLimitCheck = checkRateLimit(clientId);
    
    if (!rateLimitCheck.allowed) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      res.setHeader('Retry-After', rateLimitCheck.retryAfter || 60);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: rateLimitCheck.reason,
        retryAfter: rateLimitCheck.retryAfter
      });
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
      const isFirstMessage = !history || history.length === 0;
      if (isFirstMessage) {
        systemPromptContent = '你是智伴（ZhiBan），一個智能陪伴聊天助理。這是與用戶的首次對話，請簡單介紹自己，例如「我是智伴，你的智能陪伴聊天助理，很高興為你服務！有什麼我可以幫你的嗎？」。之後以自然、口語化的方式回應，用親切友善的語氣，就像朋友之間的對話一樣。回應要流暢自然，可以使用適當的標點符號和段落來讓內容更易讀。可以使用基本的項目符號（- 或 •）來組織列表內容，但不要使用 Markdown 格式、粗體、斜體或其他格式化符號。每個項目符號後要有空格，例如：「- 項目一」或「• 項目一」。';
      } else {
        systemPromptContent = '你是智伴（ZhiBan），一個智能陪伴聊天助理。以自然、口語化的方式回應，用親切友善的語氣，就像朋友之間的對話一樣。不需要明確提到身份，保持智伴的風格即可。回應要流暢自然，可以使用適當的標點符號和段落來讓內容更易讀。可以使用基本的項目符號（- 或 •）來組織列表內容，但不要使用 Markdown 格式、粗體、斜體或其他格式化符號。每個項目符號後要有空格，例如：「- 項目一」或「• 項目一」。';
      }
    } else {
      const isFirstMessage = !history || history.length === 0;
      if (isFirstMessage) {
        systemPromptContent = 'You are ZhiBan, an intelligent companion chat assistant. This is the first conversation with the user. Please briefly introduce yourself, for example: "I\'m ZhiBan, your intelligent companion chat assistant. How can I help you today?" Then respond in a natural, conversational way. Use a friendly and approachable tone, like talking to a friend. Make your responses fluent and natural, and feel free to use appropriate punctuation and paragraphs to make the content more readable. You can use basic bullet points (- or •) to organize list content, but do not use Markdown formatting, bold, italic, or any other formatting symbols. Each bullet point should be followed by a space, for example: "- Item one" or "• Item one".';
      } else {
        systemPromptContent = 'You are ZhiBan, an intelligent companion chat assistant. Respond in a natural, conversational way. Use a friendly and approachable tone, like talking to a friend. You don\'t need to explicitly mention your identity, just maintain ZhiBan\'s style. Make your responses fluent and natural, and feel free to use appropriate punctuation and paragraphs to make the content more readable. You can use basic bullet points (- or •) to organize list content, but do not use Markdown formatting, bold, italic, or any other formatting symbols. Each bullet point should be followed by a space, for example: "- Item one" or "• Item one".';
      }
    }

    const systemPrompt = {
      role: 'system',
      content: systemPromptContent
    };

    const messages = [
      systemPrompt,
      ...(Array.isArray(history) ? history.map(msg => {
        let role = msg.role || 'user';
        if (role === 'ai') {
          role = 'assistant';
        }
        return {
          role: role,
          content: msg.content || ''
        };
      }) : []),
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
        stop: null
      });
    } catch (modelError) {
      console.error('Model error, trying alternative:', modelError.message);
      try {
        chatCompletion = await groq.chat.completions.create({
          messages: messages,
          model: "llama-3.1-70b-versatile",
          temperature: 1,
          max_completion_tokens: 8192,
          top_p: 1,
          stream: true,
          stop: null
        });
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError.message);
        throw fallbackError;
      }
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
        if (chunk.choices && chunk.choices[0]) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
          }
        }
      }
      res.write(`data: ${JSON.stringify({ done: true, fullContent: fullContent })}\n\n`);
      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      
      if (streamError.status === 400 && streamError.error?.code === 'output_parse_failed') {
        if (!res.headersSent) {
          return res.status(500).json({ 
            error: '模型回應格式錯誤',
            message: 'AI 回應格式異常，請稍後再試或重新發送訊息',
            details: 'Parsing failed. The model generated output that could not be parsed.'
          });
        }
        res.end();
        return;
      }
      
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: 'Stream error',
          message: '處理回應時發生錯誤，請稍後再試',
          details: streamError.message || 'Unknown error'
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

