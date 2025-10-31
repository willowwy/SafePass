// Background service worker

// Initialize on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('密码管理器已安装');

  // Initialize storage
  chrome.storage.local.get(['passwords'], (result) => {
    if (!result.passwords) {
      chrome.storage.local.set({ passwords: [] });
    }
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'savePassword') {
    handleSavePassword(request.data, sendResponse);
    return true; // Keep message channel open
  }

  if (request.action === 'getPasswords') {
    handleGetPasswords(request.url, sendResponse);
    return true;
  }

  if (request.action === 'checkPassword') {
    handleCheckPassword(request.url, sendResponse);
    return true;
  }

  if (request.action === 'savePendingPassword') {
    handleSavePendingPassword(request.data, sendResponse);
    return true;
  }

  if (request.action === 'getPendingPassword') {
    handleGetPendingPassword(sendResponse);
    return true;
  }

  if (request.action === 'clearPendingPassword') {
    handleClearPendingPassword(sendResponse);
    return true;
  }
});

// Handle save password request
async function handleSavePassword(data, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['passwords']);
    let passwords = result.passwords || [];

    // Check if same username and URL already exist
    const existingIndex = passwords.findIndex(
      p => p.url === data.url && p.username === data.username
    );

    if (existingIndex !== -1) {
      // Update existing password
      passwords[existingIndex] = {
        ...passwords[existingIndex],
        password: data.password,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new password
      const newPassword = {
        id: generateId(),
        url: data.url,
        username: data.username,
        password: data.password,
        createdAt: new Date().toISOString()
      };
      passwords.push(newPassword);
    }

    await chrome.storage.local.set({ passwords });
    sendResponse({ success: true });
  } catch (error) {
    console.error('保存密码失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle get passwords request
async function handleGetPasswords(url, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['passwords']);
    const passwords = result.passwords || [];

    // Match passwords for current website
    const domain = getDomainFromUrl(url);
    const matchedPasswords = passwords.filter(p => {
      const pDomain = getDomainFromUrl(p.url);
      return pDomain === domain;
    });

    sendResponse({ success: true, passwords: matchedPasswords });
  } catch (error) {
    console.error('获取密码失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Check if password exists for URL
async function handleCheckPassword(url, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['passwords']);
    const passwords = result.passwords || [];

    const domain = getDomainFromUrl(url);
    const hasPassword = passwords.some(p => {
      const pDomain = getDomainFromUrl(p.url);
      return pDomain === domain;
    });

    sendResponse({ success: true, hasPassword });
  } catch (error) {
    console.error('检查密码失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Extract domain from URL
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Save pending password (temporary storage)
async function handleSavePendingPassword(data, sendResponse) {
  try {
    await chrome.storage.local.set({ pendingPassword: data });
    sendResponse({ success: true });
  } catch (error) {
    console.error('保存待确认密码失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Get pending password
async function handleGetPendingPassword(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['pendingPassword']);
    sendResponse({ success: true, data: result.pendingPassword || null });
  } catch (error) {
    console.error('获取待确认密码失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Clear pending password
async function handleClearPendingPassword(sendResponse) {
  try {
    await chrome.storage.local.remove('pendingPassword');
    sendResponse({ success: true });
  } catch (error) {
    console.error('清除待确认密码失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}
