chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('智伴 ZhiBan 已安裝');
  } else if (details.reason === 'update') {
    console.log('智伴 ZhiBan 已更新');
  }
});

