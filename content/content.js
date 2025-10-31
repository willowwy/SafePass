// Content Script - Injected into web pages

// Listen for form submissions
document.addEventListener('submit', handleFormSubmit, true);

// Check after page load
window.addEventListener('load', () => {
  setTimeout(() => {
    checkForPasswordFields();
    checkPendingPassword(); // Check for pending passwords
  }, 1000);
});

// Listen for dynamically added forms
const observer = new MutationObserver(() => {
  checkForPasswordFields();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

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
  try {
    await chrome.runtime.sendMessage({
      action: 'savePendingPassword',
      data: { url, username, password }
    });
  } catch (error) {
    // Silent fail - don't block form submission
  }
}

// Check for pending passwords
async function checkPendingPassword() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getPendingPassword'
    });

    if (response.success && response.data) {
      // Show save prompt
      showSavePrompt(response.data.url, response.data.username, response.data.password);
    }
  } catch (error) {
    // Silent fail
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
function showSavePrompt(url, username, password) {
  // Check if prompt already exists
  if (document.getElementById('password-manager-prompt')) {
    return;
  }

  const prompt = document.createElement('div');
  prompt.id = 'password-manager-prompt';
  prompt.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 2px solid #D75A8E;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(215, 90, 142, 0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 300px;
    ">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #333;">
        保存密码？
      </div>
      <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
        为 <strong>${username}</strong> 保存密码到密码管理器
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="pm-save-btn" style="
          flex: 1;
          padding: 8px 16px;
          background: #D75A8E;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 600;
        ">保存</button>
        <button id="pm-cancel-btn" style="
          flex: 1;
          padding: 8px 16px;
          background: #f0f0f0;
          color: #666;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
        ">取消</button>
      </div>
    </div>
  `;

  document.body.appendChild(prompt);

  // Save button handler
  document.getElementById('pm-save-btn').addEventListener('click', async () => {
    await savePassword(url, username, password);
    // Clear temporary storage
    await chrome.runtime.sendMessage({ action: 'clearPendingPassword' });
    prompt.remove();
  });

  // Cancel button handler
  document.getElementById('pm-cancel-btn').addEventListener('click', async () => {
    // Clear temporary storage
    await chrome.runtime.sendMessage({ action: 'clearPendingPassword' });
    prompt.remove();
  });

  // Auto-close after 10 seconds
  setTimeout(async () => {
    if (document.getElementById('password-manager-prompt')) {
      await chrome.runtime.sendMessage({ action: 'clearPendingPassword' });
      prompt.remove();
    }
  }, 10000);
}

// Save password
async function savePassword(url, username, password) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'savePassword',
      data: { url, username, password }
    });

    if (response.success) {
      showToast('密码已保存');
    } else {
      showToast('保存失败，请重试');
    }
  } catch (error) {
    showToast('保存失败，请重试');
  }
}

// Check for password fields and add autofill
async function checkForPasswordFields() {
  const passwordFields = document.querySelectorAll('input[type="password"]');

  if (passwordFields.length === 0) {
    return;
  }

  // Check if there are saved passwords
  const response = await chrome.runtime.sendMessage({
    action: 'getPasswords',
    url: window.location.origin
  });

  if (response.success && response.passwords.length > 0) {
    passwordFields.forEach(field => {
      addAutoFillButton(field, response.passwords);
    });
  }
}

// Add autofill button to password field
function addAutoFillButton(passwordField, passwords) {
  // Avoid duplicate addition
  if (passwordField.dataset.pmEnabled) {
    return;
  }
  passwordField.dataset.pmEnabled = 'true';

  const form = passwordField.closest('form');
  if (!form) return;

  // Show autofill options when password field is focused
  passwordField.addEventListener('focus', () => {
    showAutoFillOptions(passwordField, passwords, form);
  });
}

// Show autofill options
function showAutoFillOptions(passwordField, passwords, form) {
  // Remove existing options box
  const existing = document.getElementById('password-manager-autofill');
  if (existing) {
    existing.remove();
  }

  const rect = passwordField.getBoundingClientRect();

  const optionsBox = document.createElement('div');
  optionsBox.id = 'password-manager-autofill';
  optionsBox.style.cssText = `
    position: fixed;
    top: ${rect.bottom + window.scrollY + 5}px;
    left: ${rect.left + window.scrollX}px;
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
      <div style="font-weight: 500; color: #333;">${p.username}</div>
      <div style="font-size: 12px; color: #999;">${getDomainFromUrl(p.url)}</div>
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
      if (!optionsBox.contains(e.target) && e.target !== passwordField) {
        optionsBox.remove();
        document.removeEventListener('click', closeOptions);
      }
    });
  }, 100);
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
