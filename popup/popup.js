// DOM elements - cached for performance
let searchInput, passwordList, addBtn, modal, modalTitle;
let passwordForm, cancelBtn, websiteInput, usernameInput, passwordInput;
let exportBtn, importBtn, importFileInput;

let passwords = [];
let editingId = null;

// Initialize immediately (script is at bottom of body)
(function init() {
  // Cache DOM elements
  searchInput = document.getElementById('searchInput');
  passwordList = document.getElementById('passwordList');
  addBtn = document.getElementById('addBtn');
  modal = document.getElementById('modal');
  modalTitle = document.getElementById('modalTitle');
  passwordForm = document.getElementById('passwordForm');
  cancelBtn = document.getElementById('cancelBtn');
  websiteInput = document.getElementById('website');
  usernameInput = document.getElementById('username');
  passwordInput = document.getElementById('password');
  exportBtn = document.getElementById('exportBtn');
  importBtn = document.getElementById('importBtn');
  importFileInput = document.getElementById('importFileInput');

  setupEventListeners();
  loadPasswords();
})();

// Setup event listeners
function setupEventListeners() {
  addBtn.addEventListener('click', openModal);
  cancelBtn.addEventListener('click', closeModal);
  passwordForm.addEventListener('submit', handleSave);
  searchInput.addEventListener('input', handleSearch);
  exportBtn.addEventListener('click', exportPasswords);
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImport);

  // Close modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Event delegation for password list (more efficient)
  passwordList.addEventListener('click', (e) => {
    const item = e.target.closest('.password-item');
    if (!item) return;

    if (e.target.classList.contains('delete-btn')) {
      e.stopPropagation();
      deletePassword(e.target.dataset.id);
    } else {
      copyToClipboard(item.dataset.id);
    }
  });
}

// Load passwords
async function loadPasswords() {
  try {
    const result = await chrome.storage.local.get(['passwords']);
    passwords = result.passwords || [];
    renderPasswordList(passwords);
  } catch (error) {
    passwordList.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
  }
}

// Render password list (optimized)
function renderPasswordList(list) {
  if (list.length === 0) {
    passwordList.innerHTML = `
      <div class="empty-state">
        <p>还没有保存的密码</p>
        <p class="hint">在网站上登录时会自动询问是否保存</p>
      </div>
    `;
    return;
  }

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  list.forEach(item => {
    const div = document.createElement('div');
    div.className = 'password-item';
    div.dataset.id = item.id;
    div.innerHTML = `
      <div class="password-item-header">
        <div class="website-name">${getDomainFromUrl(item.url)}</div>
        <button class="delete-btn" data-id="${item.id}">删除</button>
      </div>
      <div class="username">${item.username}</div>
    `;
    fragment.appendChild(div);
  });

  // Single DOM update
  passwordList.innerHTML = '';
  passwordList.appendChild(fragment);
}

// Extract domain from URL (cached for performance)
const domainCache = new Map();
function getDomainFromUrl(url) {
  if (domainCache.has(url)) {
    return domainCache.get(url);
  }

  try {
    const domain = new URL(url).hostname;
    domainCache.set(url, domain);
    return domain;
  } catch {
    domainCache.set(url, url);
    return url;
  }
}

// Search handler (debounced for performance)
let searchTimeout;
function handleSearch(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const keyword = e.target.value.toLowerCase();
    if (!keyword) {
      renderPasswordList(passwords);
      return;
    }

    const filtered = passwords.filter(item =>
      item.url.toLowerCase().includes(keyword) ||
      item.username.toLowerCase().includes(keyword)
    );
    renderPasswordList(filtered);
  }, 150);
}

// Open modal
function openModal(password = null) {
  if (password) {
    modalTitle.textContent = '编辑密码';
    websiteInput.value = password.url;
    usernameInput.value = password.username;
    passwordInput.value = password.password;
    editingId = password.id;
  } else {
    modalTitle.textContent = '添加密码';
    passwordForm.reset();
    editingId = null;
  }
  modal.classList.add('active');
}

// Close modal
function closeModal() {
  modal.classList.remove('active');
  passwordForm.reset();
  editingId = null;
}

// Save password
async function handleSave(e) {
  e.preventDefault();

  const passwordData = {
    id: editingId || generateId(),
    url: websiteInput.value,
    username: usernameInput.value,
    password: passwordInput.value,
    createdAt: new Date().toISOString()
  };

  if (editingId) {
    const index = passwords.findIndex(p => p.id === editingId);
    if (index !== -1) {
      passwords[index] = passwordData;
    }
  } else {
    passwords.push(passwordData);
  }

  try {
    await chrome.storage.local.set({ passwords });
    renderPasswordList(passwords);
    closeModal();
  } catch (error) {
    alert('保存失败，请重试');
  }
}

// Delete password
async function deletePassword(id) {
  if (!confirm('确定要删除这个密码吗？')) {
    return;
  }

  passwords = passwords.filter(p => p.id !== id);

  try {
    await chrome.storage.local.set({ passwords });
    renderPasswordList(passwords);
  } catch (error) {
    alert('删除失败，请重试');
  }
}

// Copy password to clipboard
async function copyToClipboard(id) {
  const password = passwords.find(p => p.id === id);
  if (!password) return;

  try {
    await navigator.clipboard.writeText(password.password);
    showToast('密码已复制到剪贴板');
  } catch (error) {
    showToast('复制失败');
  }
}

// Show toast message
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Export passwords to CSV file
async function exportPasswords() {
  try {
    const result = await chrome.storage.local.get(['passwords']);
    const passwords = result.passwords || [];

    if (passwords.length === 0) {
      showToast('没有可导出的密码');
      return;
    }

    // Create CSV content
    const headers = ['Website', 'Username', 'Password', 'Created Date', 'ID'];
    const csvRows = [headers.join(',')];

    // Add each password as a row
    passwords.forEach(p => {
      const row = [
        escapeCSV(p.url || ''),
        escapeCSV(p.username || ''),
        escapeCSV(p.password || ''),
        escapeCSV(p.createdAt || ''),
        escapeCSV(p.id || '')
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passwords-backup-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    showToast(`成功导出 ${passwords.length} 个密码`);
  } catch (error) {
    console.error('Export error:', error);
    showToast('导出失败，请重试');
  }
}

// Escape CSV fields (handle commas, quotes, newlines)
function escapeCSV(field) {
  if (field == null) return '';
  const str = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Import passwords from CSV file
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Reset file input
  e.target.value = '';

  try {
    const text = await file.text();
    const validPasswords = parseCSV(text);

    if (validPasswords.length === 0) {
      showToast('文件中没有有效的密码数据');
      return;
    }

    // Ask user for merge strategy
    const shouldMerge = confirm(
      `发现 ${validPasswords.length} 个密码\n\n` +
      `点击"确定"合并到现有密码\n` +
      `点击"取消"替换所有现有密码`
    );

    let finalPasswords;
    if (shouldMerge) {
      // Merge: Add imported passwords that don't exist (by ID)
      const result = await chrome.storage.local.get(['passwords']);
      const existingPasswords = result.passwords || [];
      const existingIds = new Set(existingPasswords.map(p => p.id));

      const newPasswords = validPasswords.filter(p => !existingIds.has(p.id));
      finalPasswords = [...existingPasswords, ...newPasswords];

      showToast(`成功导入 ${newPasswords.length} 个新密码`);
    } else {
      // Replace all
      finalPasswords = validPasswords;
      showToast(`成功导入 ${validPasswords.length} 个密码`);
    }

    // Save to storage
    await chrome.storage.local.set({ passwords: finalPasswords });

    // Reload display
    passwords = finalPasswords;
    renderPasswordList(passwords);

  } catch (error) {
    console.error('Import error:', error);
    showToast('导入失败，请检查文件格式');
  }
}

// Parse CSV file and convert to password objects
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV文件为空或格式不正确');
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const passwords = [];

  dataLines.forEach((line, index) => {
    try {
      const fields = parseCSVLine(line);

      // Expected format: Website, Username, Password, Created Date, ID
      if (fields.length >= 3) {
        const password = {
          url: fields[0] || '',
          username: fields[1] || '',
          password: fields[2] || '',
          createdAt: fields[3] || new Date().toISOString(),
          id: fields[4] || generateId()
        };

        // Validate required fields
        if (password.url && password.username && password.password) {
          passwords.push(password);
        }
      }
    } catch (error) {
      console.warn(`Skipping line ${index + 2}: ${error.message}`);
    }
  });

  return passwords;
}

// Parse a single CSV line (handle quoted fields)
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add last field
  fields.push(currentField);

  return fields;
}
