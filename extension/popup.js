const API_BASE_URL = 'https://zhiban.vercel.app/api/chat';

let conversationHistory = [];

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loadingIndicator = document.getElementById('loading');

async function getApiUrl() {
  const result = await chrome.storage.sync.get(['apiUrl']);
  return result.apiUrl || API_BASE_URL;
}

function addMessage(content, role, messageDiv = null) {
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
  } else {
    const contentDiv = messageDiv.querySelector('.message-content');
    if (contentDiv) {
      contentDiv.textContent = content;
    }
  }
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return messageDiv;
}

function showLoading() {
  loadingIndicator.style.display = 'flex';
  sendBtn.disabled = true;
  messageInput.disabled = true;
}

function hideLoading() {
  loadingIndicator.style.display = 'none';
  sendBtn.disabled = false;
  messageInput.disabled = false;
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  messagesContainer.appendChild(errorDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

async function sendMessage(message) {
  if (!message.trim()) return;

  addMessage(message, 'user');
  conversationHistory.push({ role: 'user', content: message });
  
  messageInput.value = '';
  showLoading();

  const aiMessageDiv = addMessage('', 'ai');
  let aiMessageContent = '';

  try {
    const apiUrl = await getApiUrl();
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        history: conversationHistory.slice(0, -1)
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || '請求失敗' };
      }
      throw new Error(errorData.error || '請求失敗');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              aiMessageContent += data.content;
              addMessage(aiMessageContent, 'ai', aiMessageDiv);
            }
            if (data.done) {
              conversationHistory.push({ role: 'assistant', content: aiMessageContent });
              break;
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
    showError(`錯誤: ${error.message}`);
    if (aiMessageDiv && aiMessageDiv.parentNode) {
      aiMessageDiv.remove();
    }
  } finally {
    hideLoading();
    messageInput.focus();
  }
}

sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message) {
    sendMessage(message);
  }
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
      sendMessage(message);
    }
  }
});

messageInput.focus();

