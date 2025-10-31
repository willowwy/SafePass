// DOM elements - cached for performance
let searchInput, passwordList, addBtn, modal, modalTitle;
let passwordForm, cancelBtn, websiteInput, usernameInput, passwordInput;

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

  setupEventListeners();
  loadPasswords();
})();

// Setup event listeners
function setupEventListeners() {
  addBtn.addEventListener('click', openModal);
  cancelBtn.addEventListener('click', closeModal);
  passwordForm.addEventListener('submit', handleSave);
  searchInput.addEventListener('input', handleSearch);

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
