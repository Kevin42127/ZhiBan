chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ zhiban_welcome_shown: false });
    console.log('智伴 ZhiBan 已安裝');
  } else if (details.reason === 'update') {
    console.log('智伴 ZhiBan 已更新');
  }
});

