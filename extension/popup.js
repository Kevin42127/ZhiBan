const API_BASE_URL = 'https://zhiban.vercel.app/api/chat';
const STORAGE_KEY = 'zhiban_conversation_history';

let conversationHistory = [];

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loadingIndicator = document.getElementById('loading');
const clearBtn = document.getElementById('clearBtn');
const confirmDialogOverlay = document.getElementById('confirmDialogOverlay');
const confirmDialogTitle = document.getElementById('confirmDialogTitle');
const confirmDialogMessage = document.getElementById('confirmDialogMessage');
const confirmDialogConfirm = document.getElementById('confirmDialogConfirm');
const confirmDialogCancel = document.getElementById('confirmDialogCancel');

async function getApiUrl() {
  const result = await chrome.storage.sync.get(['apiUrl']);
  return result.apiUrl || API_BASE_URL;
}

async function saveConversationHistory() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: conversationHistory });
  } catch (error) {
    console.error('Failed to save conversation history:', error);
  }
}

function showWelcomeMessage() {
  const welcomeText = '你好，我可以幫你什麼忙？';
  const welcomeDiv = addMessage(welcomeText, 'ai');
  welcomeDiv.classList.add('welcome-message');
  welcomeDiv.setAttribute('data-welcome', 'true');
}

function removeWelcomeMessage() {
  const welcomeMsg = messagesContainer.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
}

async function loadConversationHistory() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY]) && result[STORAGE_KEY].length > 0) {
      conversationHistory = result[STORAGE_KEY];
      renderHistory();
    } else {
      showWelcomeMessage();
    }
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    showWelcomeMessage();
  }
}

function renderHistory() {
  messagesContainer.innerHTML = '';
  
  conversationHistory.forEach((msg) => {
    if (msg && msg.content !== undefined && msg.role) {
      let role = msg.role;
      if (role === 'assistant') {
        role = 'ai';
      }
      const messageDiv = addMessage(msg.content, role);
      if (messageDiv) {
        const avatar = messageDiv.querySelector('.message-avatar');
        if (!avatar) {
          const avatarDiv = document.createElement('div');
          avatarDiv.className = 'message-avatar';
          const avatarIcon = document.createElement('span');
          avatarIcon.className = 'material-icons';
          avatarIcon.textContent = role === 'user' ? 'person' : 'smart_toy';
          avatarDiv.appendChild(avatarIcon);
          const contentDiv = messageDiv.querySelector('.message-content');
          if (contentDiv) {
            messageDiv.insertBefore(avatarDiv, contentDiv);
          } else {
            messageDiv.insertBefore(avatarDiv, messageDiv.firstChild);
          }
        }
      }
    }
  });
}

function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    confirmDialogTitle.textContent = title;
    confirmDialogMessage.textContent = message;
    confirmDialogOverlay.style.display = 'flex';
    
    const handleConfirm = () => {
      confirmDialogOverlay.style.display = 'none';
      confirmDialogConfirm.removeEventListener('click', handleConfirm);
      confirmDialogCancel.removeEventListener('click', handleCancel);
      confirmDialogOverlay.removeEventListener('click', handleOverlayClick);
      resolve(true);
    };
    
    const handleCancel = () => {
      confirmDialogOverlay.style.display = 'none';
      confirmDialogConfirm.removeEventListener('click', handleConfirm);
      confirmDialogCancel.removeEventListener('click', handleCancel);
      confirmDialogOverlay.removeEventListener('click', handleOverlayClick);
      resolve(false);
    };
    
    const handleOverlayClick = (e) => {
      if (e.target === confirmDialogOverlay) {
        handleCancel();
      }
    };
    
    confirmDialogConfirm.addEventListener('click', handleConfirm);
    confirmDialogCancel.addEventListener('click', handleCancel);
    confirmDialogOverlay.addEventListener('click', handleOverlayClick);
  });
}

async function clearAllMessages() {
  if (conversationHistory.length === 0) return;
  
  const confirmed = await showConfirmDialog('確認清空', '確定要清空所有對話嗎？');
  if (confirmed) {
    conversationHistory = [];
    messagesContainer.innerHTML = '';
    await saveConversationHistory();
  }
}

function addMessage(content, role, messageDiv = null) {
  if (role === 'assistant') {
    role = 'ai';
  }
  
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    const avatarIcon = document.createElement('span');
    avatarIcon.className = 'material-icons';
    avatarIcon.textContent = role === 'user' ? 'person' : 'smart_toy';
    avatarDiv.appendChild(avatarIcon);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(messageDiv);
  } else {
    let avatarDiv = messageDiv.querySelector('.message-avatar');
    if (!avatarDiv) {
      avatarDiv = document.createElement('div');
      avatarDiv.className = 'message-avatar';
      const avatarIcon = document.createElement('span');
      avatarIcon.className = 'material-icons';
      avatarIcon.textContent = role === 'user' ? 'person' : 'smart_toy';
      avatarDiv.appendChild(avatarIcon);
      const contentDiv = messageDiv.querySelector('.message-content');
      if (contentDiv) {
        messageDiv.insertBefore(avatarDiv, contentDiv);
      } else {
        messageDiv.appendChild(avatarDiv);
      }
    } else {
      const avatarIcon = avatarDiv.querySelector('.material-icons');
      if (avatarIcon) {
        avatarIcon.textContent = role === 'user' ? 'person' : 'smart_toy';
      } else {
        const newAvatarIcon = document.createElement('span');
        newAvatarIcon.className = 'material-icons';
        newAvatarIcon.textContent = role === 'user' ? 'person' : 'smart_toy';
        avatarDiv.appendChild(newAvatarIcon);
      }
    }
    
    let contentDiv = messageDiv.querySelector('.message-content');
    if (!contentDiv) {
      contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      messageDiv.appendChild(contentDiv);
    }
    contentDiv.textContent = content;
    
    if (!messageDiv.className.includes(role)) {
      messageDiv.className = `message ${role}`;
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

function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fff]/;
  if (chineseRegex.test(text)) {
    return 'zh-TW';
  }
  return 'en';
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

  removeWelcomeMessage();

  addMessage(message, 'user');
  conversationHistory.push({ role: 'user', content: message });
  await saveConversationHistory();
  
  messageInput.value = '';
  showLoading();

  const aiMessageDiv = addMessage('', 'ai');
  let aiMessageContent = '';

  try {
    const apiUrl = await getApiUrl();
    const detectedLanguage = detectLanguage(message);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        history: conversationHistory.slice(0, -1),
        language: detectedLanguage
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
              conversationHistory.push({ role: 'ai', content: aiMessageContent });
              await saveConversationHistory();
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
    conversationHistory.pop();
    await saveConversationHistory();
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

clearBtn.addEventListener('click', () => {
  clearAllMessages();
});

loadConversationHistory();
messageInput.focus();

