const API_ENDPOINT_KEY = 'apiEndpoint';
const DEFAULT_API_ENDPOINT = 'https://your-app.vercel.app/api/chat';

const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const apiEndpointInput = document.getElementById('apiEndpoint');
const notification = document.getElementById('notification');

let isLoading = false;

async function init() {
  const endpoint = await getStoredEndpoint();
  if (endpoint) {
    apiEndpointInput.value = endpoint;
  } else {
    apiEndpointInput.value = DEFAULT_API_ENDPOINT;
  }
}

async function getStoredEndpoint() {
  const result = await chrome.storage.local.get([API_ENDPOINT_KEY]);
  return result[API_ENDPOINT_KEY] || DEFAULT_API_ENDPOINT;
}

function showNotification(message, duration = 3000) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, duration);
}

function addMessage(content, isUser) {
  const welcomeMessage = chatContainer.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'message-icon';
  iconDiv.innerHTML = `<span class="material-icons">${isUser ? 'person' : 'smart_toy'}</span>`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  if (isUser) {
    contentDiv.textContent = content;
  } else {
    if (content === 'loading') {
      contentDiv.innerHTML = '<div class="loading"></div>';
    } else {
      contentDiv.textContent = content;
    }
  }

  messageDiv.appendChild(iconDiv);
  messageDiv.appendChild(contentDiv);
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage() {
  if (isLoading) return;
  
  const message = messageInput.value.trim();
  if (!message) return;

  messageInput.value = '';
  sendBtn.disabled = true;
  isLoading = true;

  addMessage(message, true);
  addMessage('loading', false);

  try {
    const endpoint = await getStoredEndpoint();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    const lastMessage = chatContainer.querySelector('.message:last-child');
    if (lastMessage) {
      lastMessage.querySelector('.message-content').textContent = data.response || '抱歉，無法取得回應。';
    }
  } catch (error) {
    console.error('Error:', error);
    const lastMessage = chatContainer.querySelector('.message:last-child');
    if (lastMessage) {
      lastMessage.querySelector('.message-content').textContent = '發生錯誤，請檢查 API 端點設定。';
    }
    showNotification('連線錯誤，請檢查設定');
  } finally {
    sendBtn.disabled = false;
    isLoading = false;
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.remove('active');
});

saveSettingsBtn.addEventListener('click', async () => {
  const endpoint = apiEndpointInput.value.trim();
  if (!endpoint) {
    showNotification('請輸入 API 端點');
    return;
  }

  await chrome.storage.local.set({ [API_ENDPOINT_KEY]: endpoint });
  showNotification('設定已儲存');
  setTimeout(() => {
    settingsPanel.classList.remove('active');
  }, 1000);
});

init();
