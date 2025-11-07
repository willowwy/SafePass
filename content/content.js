// Content Script - Injected into web pages

// Track if extension context is valid
let isExtensionValid = true;
let extensionContextCheckInterval = null;

// Helper function to check if extension context is valid
function isExtensionContextValid() {
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      isExtensionValid = false;
      return false;
    }
    // Additional check: try to access a chrome API
    void chrome.runtime.getManifest();
    return true;
  } catch (error) {
    isExtensionValid = false;
    return false;
  }
}

// Periodically check extension context (every 5 seconds)
function startExtensionContextMonitoring() {
  if (extensionContextCheckInterval) {
    return; // Already monitoring
  }

  extensionContextCheckInterval = setInterval(() => {
    if (!isExtensionContextValid()) {
      console.warn('🔄 Extension context lost. Please reload this page to use the password manager.');

      // Stop all observers and timers
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (extensionContextCheckInterval) {
        clearInterval(extensionContextCheckInterval);
        extensionContextCheckInterval = null;
      }
      if (checkLoginFieldsTimer) {
        clearTimeout(checkLoginFieldsTimer);
        checkLoginFieldsTimer = null;
      }

      // Show a one-time notification to the user
      showExtensionReloadNotification();
    }
  }, 5000);
}

// Show notification when extension is reloaded
let notificationShown = false;
function showExtensionReloadNotification() {
  if (notificationShown) return;
  notificationShown = true;

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #333;
    color: white;
    padding: 20px 30px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    text-align: center;
    max-width: 400px;
  `;
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">🔄 密码管理器已更新</div>
    <div style="font-size: 13px; color: #ddd; margin-bottom: 12px;">
      请刷新页面以继续使用密码管理功能
    </div>
    <button style="
      background: #4CAF50;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    " onclick="window.location.reload()">立即刷新</button>
  `;

  if (document.body) {
    document.body.appendChild(notification);

    // Auto remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }
}

// Start monitoring on load
startExtensionContextMonitoring();

// Helper function to safely send messages to background script
async function safeSendMessage(message) {
  if (!isExtensionContextValid()) {
    // Don't log warning here, the monitoring function will handle it
    return { success: false, error: 'Extension context invalidated' };
  }

  try {
    const response = await chrome.runtime.sendMessage(message);

    // Handle case where response is undefined or null
    if (!response) {
      console.warn('No response from background script for action:', message.action);
      return { success: false, error: 'No response from background script' };
    }

    return response;
  } catch (error) {
    // Handle different types of errors
    const errorMessage = error?.message || 'Unknown error';

    if (errorMessage.includes('Extension context invalidated') ||
        errorMessage.includes('message port closed') ||
        errorMessage.includes('Cannot access') ||
        errorMessage.includes('Receiving end does not exist')) {
      isExtensionValid = false;
      // Trigger the notification
      showExtensionReloadNotification();
      return { success: false, error: 'Extension context invalidated' };
    }

    // Only log errors that are not related to extension context
    console.error('Error sending message:', errorMessage, 'Action:', message.action);
    return { success: false, error: errorMessage };
  }
}

// Listen for form submissions
document.addEventListener('submit', handleFormSubmit, true);

// Debounce timer for checkForLoginFields
let checkLoginFieldsTimer = null;

// Debounced version of checkForLoginFields to avoid excessive calls
function debouncedCheckForLoginFields() {
  if (!isExtensionValid) {
    return;
  }

  clearTimeout(checkLoginFieldsTimer);
  checkLoginFieldsTimer = setTimeout(() => {
    checkForLoginFields();
  }, 300);
}

// Check after page load with multiple retries for dynamically loaded content
window.addEventListener('load', () => {
  if (!isExtensionValid) return;

  // Check immediately
  checkForLoginFields();
  checkPendingPassword();

  // Retry after delays to catch dynamically loaded forms (common in SPAs)
  setTimeout(() => {
    if (isExtensionValid) checkForLoginFields();
  }, 500);

  setTimeout(() => {
    if (isExtensionValid) checkForLoginFields();
  }, 1500);

  setTimeout(() => {
    if (isExtensionValid) checkForLoginFields();
  }, 3000);
});

// Also check when DOM is ready (earlier than window load)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (isExtensionValid) {
      checkForLoginFields();
    }
  });
} else {
  // DOM is already ready
  checkForLoginFields();
}

// Listen for dynamically added forms (with debouncing)
let observer = null;

function setupMutationObserver() {
  if (!isExtensionValid || observer) {
    return;
  }

  observer = new MutationObserver((mutations) => {
    if (!isExtensionValid) {
      // Stop observing if extension context is invalid
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }

    // Check if any mutations added input fields
    const hasInputFields = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('input') || node.querySelector?.('input'))
      )
    );

    if (hasInputFields) {
      debouncedCheckForLoginFields();
    }
  });

  // Wait for body to be available
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    // Wait for body
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        bodyObserver.disconnect();
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    });
    bodyObserver.observe(document.documentElement, { childList: true });
  }
}

// Setup observer when ready
setupMutationObserver();

// Handle form submission
async function handleFormSubmit(e) {
  const form = e.target;

  // Find password input field
  const passwordField = form.querySelector('input[type="password"]');
  if (!passwordField || !passwordField.value) {
    return;
  }

  // Find username input field (usually email or text)
  const usernameField = findUsernameField(form);
  if (!usernameField || !usernameField.value) {
    return;
  }

  const username = usernameField.value;
  const password = passwordField.value;
  const url = window.location.origin;

  // Save to temporary storage immediately without blocking form submission
  await safeSendMessage({
    action: 'savePendingPassword',
    data: { url, username, password }
  });
}

// Check for pending passwords
async function checkPendingPassword() {
  try {
    const response = await safeSendMessage({
      action: 'getPendingPassword'
    });

    if (!response || !response.success || !response.data) {
      return;
    }

    const { url, username, password } = response.data;

    // Validate data
    if (!url || !username || !password) {
      console.warn('Invalid pending password data:', response.data);
      await safeSendMessage({ action: 'clearPendingPassword' });
      return;
    }

    // Check if this username already exists for this website
    const passwordsResponse = await safeSendMessage({
      action: 'getPasswords',
      url: url
    });

    let isNewAccount = true;
    let existingPassword = null;

    if (passwordsResponse && passwordsResponse.success && passwordsResponse.passwords && Array.isArray(passwordsResponse.passwords)) {
      existingPassword = passwordsResponse.passwords.find(p => p && p.username === username);
      if (existingPassword) {
        isNewAccount = false;
      }
    }

    // Show save prompt with appropriate message
    showSavePrompt(url, username, password, isNewAccount, existingPassword);
  } catch (error) {
    console.error('Error in checkPendingPassword:', error);
  }
}

// Find username input field
function findUsernameField(form) {
  // Common username field selectors
  const selectors = [
    'input[type="email"]',
    'input[type="text"][name*="user"]',
    'input[type="text"][name*="email"]',
    'input[type="text"][name*="login"]',
    'input[type="text"][id*="user"]',
    'input[type="text"][id*="email"]',
    'input[type="text"][id*="login"]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]'
  ];

  for (const selector of selectors) {
    const field = form.querySelector(selector);
    if (field && field.value) {
      return field;
    }
  }

  // If not found, return the first text input
  const textFields = form.querySelectorAll('input[type="text"]');
  return textFields[0];
}

// Show save password prompt
function showSavePrompt(url, username, password, isNewAccount = true, existingPassword = null) {
  // Check if prompt already exists
  if (document.getElementById('password-manager-prompt')) {
    return;
  }

  // Check if password is the same as existing password
  const isSamePassword = existingPassword && existingPassword.password === password;

  // Don't show prompt if it's the same password
  if (isSamePassword) {
    safeSendMessage({ action: 'clearPendingPassword' });
    return;
  }

  const prompt = document.createElement('div');
  prompt.id = 'password-manager-prompt';

  // Different UI for new account vs update password
  const title = isNewAccount ? '保存新账户？' : '更新密码？';
  const message = isNewAccount
    ? `为 <strong>${escapeHtml(username)}</strong> 保存密码到密码管理器`
    : `检测到 <strong>${escapeHtml(username)}</strong> 的密码已更改`;
  const buttonText = isNewAccount ? '保存' : '更新';
  const buttonColor = isNewAccount ? '#D75A8E' : '#4CAF50';

  prompt.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 2px solid ${buttonColor};
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 320px;
      animation: slideIn 0.3s ease-out;
    ">
      <style>
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      </style>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #333;">
        ${title}
      </div>
      <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
        ${message}
      </div>
      ${!isNewAccount ? `
        <div style="font-size: 12px; color: #999; margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
          旧密码: ${maskPassword(existingPassword.password)}<br>
          新密码: ${maskPassword(password)}
        </div>
      ` : ''}
      <div style="display: flex; gap: 8px;">
        <button id="pm-save-btn" style="
          flex: 1;
          padding: 8px 16px;
          background: ${buttonColor};
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 600;
          transition: opacity 0.2s;
        ">${buttonText}</button>
        <button id="pm-cancel-btn" style="
          flex: 1;
          padding: 8px 16px;
          background: #f0f0f0;
          color: #666;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        ">取消</button>
      </div>
    </div>
  `;

  document.body.appendChild(prompt);

  // Add hover effects
  const saveBtn = document.getElementById('pm-save-btn');
  const cancelBtn = document.getElementById('pm-cancel-btn');

  saveBtn.addEventListener('mouseenter', () => {
    saveBtn.style.opacity = '0.9';
  });
  saveBtn.addEventListener('mouseleave', () => {
    saveBtn.style.opacity = '1';
  });

  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#e0e0e0';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = '#f0f0f0';
  });

  // Save button handler
  saveBtn.addEventListener('click', async () => {
    await savePassword(url, username, password);
    // Clear temporary storage
    await safeSendMessage({ action: 'clearPendingPassword' });

    // Show appropriate success message
    const successMessage = isNewAccount ? '密码已保存' : '密码已更新';
    showToast(successMessage);

    prompt.remove();
  });

  // Cancel button handler
  cancelBtn.addEventListener('click', async () => {
    // Clear temporary storage
    await safeSendMessage({ action: 'clearPendingPassword' });
    prompt.remove();
  });

  // Auto-close after 15 seconds
  setTimeout(async () => {
    if (document.getElementById('password-manager-prompt')) {
      await safeSendMessage({ action: 'clearPendingPassword' });
      prompt.remove();
    }
  }, 15000);
}

// Mask password for display (show first and last char, mask the rest)
function maskPassword(password) {
  if (!password) return '••••••';
  if (password.length <= 2) return '••••';

  const firstChar = password.charAt(0);
  const lastChar = password.charAt(password.length - 1);
  const maskedLength = Math.min(password.length - 2, 6);
  const masked = '•'.repeat(maskedLength);

  return `${firstChar}${masked}${lastChar}`;
}

// Save password
async function savePassword(url, username, password) {
  const response = await safeSendMessage({
    action: 'savePassword',
    data: { url, username, password }
  });

  if (response.success) {
    showToast('密码已保存');
  } else {
    if (response.error && response.error.includes('Extension context invalidated')) {
      showToast('请刷新页面后重试');
    } else {
      showToast('保存失败，请重试');
    }
  }
}

// Check for login fields (username and password) and add autofill
async function checkForLoginFields() {
  try {
    // Find all password fields
    const passwordFields = document.querySelectorAll('input[type="password"]');

    // Find all username/email fields
    const usernameFields = findAllUsernameFields();

    if (passwordFields.length === 0 && usernameFields.length === 0) {
      return;
    }

    // Check if there are saved passwords
    const response = await safeSendMessage({
      action: 'getPasswords',
      url: window.location.origin
    });

    if (response && response.success && response.passwords && Array.isArray(response.passwords) && response.passwords.length > 0) {
      // Add autofill to password fields
      passwordFields.forEach(field => {
        if (field && field.nodeType === Node.ELEMENT_NODE) {
          addAutoFillButton(field, response.passwords);
        }
      });

      // Add autofill to username/email fields
      usernameFields.forEach(field => {
        if (field && field.nodeType === Node.ELEMENT_NODE) {
          addAutoFillButton(field, response.passwords);
        }
      });
    }
  } catch (error) {
    console.error('Error in checkForLoginFields:', error);
  }
}

// Find all username/email fields on the page
function findAllUsernameFields() {
  const selectors = [
    'input[type="email"]',
    'input[type="text"][name*="user" i]',
    'input[type="text"][name*="email" i]',
    'input[type="text"][name*="login" i]',
    'input[type="text"][id*="user" i]',
    'input[type="text"][id*="email" i]',
    'input[type="text"][id*="login" i]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]'
  ];

  const fields = new Set();

  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(field => {
        // Only add visible fields that are likely login fields
        if (isVisibleField(field)) {
          fields.add(field);
        }
      });
    } catch (e) {
      // Ignore selector errors
    }
  });

  return Array.from(fields);
}

// Check if a field is visible and likely a login field
function isVisibleField(field) {
  // Check if field is visible
  const rect = field.getBoundingClientRect();
  const style = window.getComputedStyle(field);

  if (style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      rect.width === 0 ||
      rect.height === 0) {
    return false;
  }

  return true;
}

// Add autofill button to login field (username or password)
function addAutoFillButton(loginField, passwords) {
  // Avoid duplicate addition
  if (loginField.dataset.pmEnabled) {
    return;
  }
  loginField.dataset.pmEnabled = 'true';

  const form = loginField.closest('form') || document.body;

  // Show autofill options when field is focused
  loginField.addEventListener('focus', () => {
    showAutoFillOptions(loginField, passwords, form);
  });
}

// Show autofill options
function showAutoFillOptions(loginField, passwords, form) {
  // Remove existing options box
  const existing = document.getElementById('password-manager-autofill');
  if (existing) {
    existing.remove();
  }

  const rect = loginField.getBoundingClientRect();

  const optionsBox = document.createElement('div');
  optionsBox.id = 'password-manager-autofill';
  optionsBox.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 5}px;
    left: ${rect.left}px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 999999;
    min-width: ${rect.width}px;
    max-width: 300px;
  `;

  optionsBox.innerHTML = passwords.map(p => `
    <div class="pm-option" data-id="${p.id}" style="
      padding: 10px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <div style="font-weight: 500; color: #333;">${escapeHtml(p.username)}</div>
      <div style="font-size: 12px; color: #999;">${escapeHtml(getDomainFromUrl(p.url))}</div>
    </div>
  `).join('');

  document.body.appendChild(optionsBox);

  // Click option to fill
  optionsBox.querySelectorAll('.pm-option').forEach(option => {
    option.addEventListener('mouseenter', function() {
      this.style.background = '#FDF2F7';
    });

    option.addEventListener('mouseleave', function() {
      this.style.background = 'white';
    });

    option.addEventListener('click', () => {
      const id = option.dataset.id;
      const password = passwords.find(p => p.id === id);
      if (password) {
        fillForm(form, password);
        optionsBox.remove();
      }
    });
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function closeOptions(e) {
      if (!optionsBox.contains(e.target) && e.target !== loginField) {
        optionsBox.remove();
        document.removeEventListener('click', closeOptions);
      }
    });
  }, 100);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Fill form with saved credentials
function fillForm(form, password) {
  // Fill username field
  const usernameField = findUsernameField(form);
  if (usernameField) {
    usernameField.value = password.username;
    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Fill password field
  const passwordField = form.querySelector('input[type="password"]');
  if (passwordField) {
    passwordField.value = password.password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
  }

  showToast('已自动填充密码');
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

// Show toast message
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}
