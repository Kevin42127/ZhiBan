const API_BASE_URL = 'YOUR_VERCEL_API_URL/api/chat';

let conversationHistory = [];

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loadingIndicator = document.getElementById('loading');
const actionButtons = document.querySelectorAll('.action-btn');

async function getApiUrl() {
  const result = await chrome.storage.sync.get(['apiUrl']);
  return result.apiUrl || API_BASE_URL;
}

function addMessage(content, role) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
      const errorData = await response.json();
      throw new Error(errorData.error || '請求失敗');
    }

    const data = await response.json();
    const aiMessage = data.message || '無法取得回應';
    
    addMessage(aiMessage, 'ai');
    conversationHistory.push({ role: 'assistant', content: aiMessage });
  } catch (error) {
    console.error('Error:', error);
    showError(`錯誤: ${error.message}`);
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

actionButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    messageInput.value = prompt;
    messageInput.focus();
  });
});

messageInput.focus();

