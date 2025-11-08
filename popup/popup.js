// Cached DOM elements
let searchInput, passwordList, addBtn, modal, modalTitle;
let passwordForm, cancelBtn, websiteInput, loginUrlInput, usernameInput, passwordInput;
let exportBtn, importBtn, importFileInput;
let masterPasswordBtn, masterPasswordBtnText;
let masterPasswordModal, masterPasswordModalTitle, masterPasswordStatus;
let masterPasswordForm, currentMasterPasswordInput, newMasterPasswordInput, confirmMasterPasswordInput;
let masterPasswordCancelBtn, removeMasterPasswordBtn;

let passwords = [];
let editingId = null;
let masterPasswordHash = null;

// Initialize
(function init() {
    searchInput = document.getElementById('searchInput');
    passwordList = document.getElementById('passwordList');
    addBtn = document.getElementById('addBtn');
    modal = document.getElementById('modal');
    modalTitle = document.getElementById('modalTitle');
    passwordForm = document.getElementById('passwordForm');
    cancelBtn = document.getElementById('cancelBtn');
    websiteInput = document.getElementById('website');
    loginUrlInput = document.getElementById('loginUrl');
    usernameInput = document.getElementById('username');
    passwordInput = document.getElementById('password');
    exportBtn = document.getElementById('exportBtn');
    importBtn = document.getElementById('importBtn');
    importFileInput = document.getElementById('importFileInput');

    masterPasswordBtn = document.getElementById('masterPasswordBtn');
    masterPasswordBtnText = document.getElementById('masterPasswordBtnText');
    masterPasswordModal = document.getElementById('masterPasswordModal');
    masterPasswordModalTitle = document.getElementById('masterPasswordModalTitle');
    masterPasswordStatus = document.getElementById('masterPasswordStatus');
    masterPasswordForm = document.getElementById('masterPasswordForm');
    currentMasterPasswordInput = document.getElementById('currentMasterPassword');
    newMasterPasswordInput = document.getElementById('newMasterPassword');
    confirmMasterPasswordInput = document.getElementById('confirmMasterPassword');
    masterPasswordCancelBtn = document.getElementById('masterPasswordCancelBtn');
    removeMasterPasswordBtn = document.getElementById('removeMasterPasswordBtn');

    setupEventListeners();
    loadPasswords();
    loadMasterPassword();
})();

// Event listeners
function setupEventListeners() {
    addBtn.addEventListener('click', openModal);
    cancelBtn.addEventListener('click', closeModal);
    passwordForm.addEventListener('submit', handleSave);
    searchInput.addEventListener('input', handleSearch);
    exportBtn.addEventListener('click', exportPasswords);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImport);

    masterPasswordBtn.addEventListener('click', openMasterPasswordModal);
    masterPasswordCancelBtn.addEventListener('click', closeMasterPasswordModal);
    masterPasswordForm.addEventListener('submit', handleMasterPasswordSave);
    removeMasterPasswordBtn.addEventListener('click', handleRemoveMasterPassword);

    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });
    masterPasswordModal.addEventListener('click', e => {
        if (e.target === masterPasswordModal) closeMasterPasswordModal();
    });

    passwordList.addEventListener('click', e => {
        const item = e.target.closest('.password-item');
        if (!item) return;

        if (e.target.classList.contains('delete-btn')) {
            e.stopPropagation();
            deletePassword(e.target.dataset.id);
        } else if (e.target.classList.contains('login-btn')) {
            e.stopPropagation();
            autoLogin(e.target.dataset.id);
        } else {
            copyToClipboard(item.dataset.id);
        }
    });
}

// Load passwords
async function loadPasswords() {
    const result = await chrome.storage.local.get(['passwords']);
    passwords = result.passwords || [];
    renderPasswordList(passwords);
}

// Render password list
function renderPasswordList(list) {
    if (!list.length) {
        passwordList.innerHTML = `
      <div class="empty-state">
        <p>还没有保存的密码</p>
        <p class="hint">在网站上登录时会自动询问是否保存</p>
      </div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach(item => {
        const url = item.url ?? '';
        const username = item.username ?? '';
        const div = document.createElement('div');
        div.className = 'password-item';
        div.dataset.id = item.id;
        div.innerHTML = `
      <div class="password-item-header">
        <div class="website-name">${getDomainFromUrl(url)}</div>
        <div class="item-actions">
          <button class="login-btn" data-id="${item.id}">登录</button>
          <button class="delete-btn" data-id="${item.id}">删除</button>
        </div>
      </div>
      <div class="username">${username}</div>`;
        fragment.appendChild(div);
    });
    passwordList.replaceChildren(fragment);
}

// Extract domain
const domainCache = new Map();

function getDomainFromUrl(url) {
    if (domainCache.has(url)) return domainCache.get(url);
    try {
        const domain = new URL(url).hostname;
        domainCache.set(url, domain);
        return domain;
    } catch {
        domainCache.set(url, url);
        return url;
    }
}

// Search
let searchTimeout;

function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const keyword = e.target.value.toLowerCase();
        const filtered = keyword
            ? passwords.filter(p =>
                (p.url ?? '').toLowerCase().includes(keyword) ||
                (p.username ?? '').toLowerCase().includes(keyword))
            : passwords;
        renderPasswordList(filtered);
    }, 150);
}

// Modal
function openModal(password = null) {
    if (password) {
        modalTitle.textContent = '编辑密码';
        websiteInput.value = password.url ?? '';
        loginUrlInput.value = password.loginUrl ?? '';
        usernameInput.value = password.username ?? '';
        passwordInput.value = password.password ?? '';
        editingId = password.id ?? null;
    } else {
        modalTitle.textContent = '添加密码';
        passwordForm.reset();
        editingId = null;
    }
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    passwordForm.reset();
    editingId = null;
}

// Save
async function handleSave(e) {
    e.preventDefault();
    const data = {
        id: editingId || generateId(),
        url: websiteInput.value.trim(),
        loginUrl: loginUrlInput.value.trim() || websiteInput.value.trim(),
        username: usernameInput.value.trim(),
        password: passwordInput.value,
        createdAt: new Date().toISOString()
    };

    const index = passwords.findIndex(p => p.id === editingId);
    if (index !== -1) passwords[index] = data;
    else passwords.push(data);

    await chrome.storage.local.set({passwords});
    renderPasswordList(passwords);
    closeModal();
}

// Delete
async function deletePassword(id) {
    passwords = passwords.filter(p => p.id !== id);
    await chrome.storage.local.set({passwords});
    renderPasswordList(passwords);
    showToast('密码已删除');
}

// Copy
async function copyToClipboard(id) {
    const p = passwords.find(p => p.id === id);
    if (!p) return;
    await navigator.clipboard.writeText(p.password);
    showToast('密码已复制');
}

// Toast
function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.className = 'toast';
    toast.style.cssText = `
    position: fixed; bottom: 20px; left: 50%;
    transform: translateX(-50%);
    background: #333; color: white;
    padding: 10px 20px; border-radius: 4px;
    font-size: 14px; z-index: 10000;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ID generator
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Export
async function exportPasswords() {
    if (masterPasswordHash) {
        const input = prompt('请输入主密码以导出密码数据：');
        if (!input) return showToast('已取消导出');
        if (input !== masterPasswordHash) return showToast('主密码不正确');
    }

    const {passwords} = await chrome.storage.local.get(['passwords']);
    if (!passwords?.length) return showToast('没有可导出的密码');

    const headers = ['Website', 'Username', 'Password', 'Created', 'ID'];
    const rows = [headers.join(',')];
    passwords.forEach(p => {
        rows.push([
            escapeCSV(p.url ?? ''),
            escapeCSV(p.username ?? ''),
            escapeCSV(p.password ?? ''),
            escapeCSV(p.createdAt ?? ''),
            escapeCSV(p.id ?? '')
        ].join(','));
    });

    const blob = new Blob([rows.join('\n')], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {href: url, download: 'passwords.csv'});
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`成功导出 ${passwords.length} 个密码`);
}

function escapeCSV(str) {
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
}

// Import
async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const imported = parseCSV(text);
    if (!imported.length) return showToast('文件中没有有效数据');

    const merge = confirm(`发现 ${imported.length} 个密码\n确定合并吗？取消则替换所有数据`);
    let finalPasswords = imported;
    if (merge) {
        const {passwords: existing = []} = await chrome.storage.local.get(['passwords']);
        const ids = new Set(existing.map(p => p.id));
        const newOnes = imported.filter(p => !ids.has(p.id));
        finalPasswords = [...existing, ...newOnes];
        showToast(`导入 ${newOnes.length} 个新密码`);
    }
    await chrome.storage.local.set({passwords: finalPasswords});
    passwords = finalPasswords;
    renderPasswordList(passwords);
}

function parseCSV(text) {
    const lines = text.trim().split('\n').slice(1);
    return lines.map(line => line.split(',')).map(f => ({
        url: f[0] ?? '',
        username: f[1] ?? '',
        password: f[2] ?? '',
        createdAt: f[3] ?? new Date().toISOString(),
        id: f[4] ?? generateId()
    })).filter(p => p.url && p.username && p.password);
}

// Master password
async function loadMasterPassword() {
    const result = await chrome.storage.local.get(['masterPassword']);
    masterPasswordHash = result.masterPassword || null;
    updateMasterPasswordButton();
}

function updateMasterPasswordButton() {
    masterPasswordBtnText.textContent = masterPasswordHash ? '管理主密码' : '设置主密码';
}

function openMasterPasswordModal() {
    if (masterPasswordHash) {
        masterPasswordModalTitle.textContent = '管理主密码';
        masterPasswordStatus.className = 'master-password-status has-password';
        masterPasswordStatus.innerHTML = '✓ 已设置主密码 - 可修改或移除';
        currentMasterPasswordInput.required = true;
        removeMasterPasswordBtn.style.display = 'block';
    } else {
        masterPasswordModalTitle.textContent = '设置主密码';
        masterPasswordStatus.className = 'master-password-status no-password';
        masterPasswordStatus.innerHTML = '⚠️ 尚未设置主密码';
        currentMasterPasswordInput.required = false;
        removeMasterPasswordBtn.style.display = 'none';
    }
    masterPasswordForm.reset();
    masterPasswordModal.classList.add('active');
}

function closeMasterPasswordModal() {
    masterPasswordModal.classList.remove('active');
    masterPasswordForm.reset();
}

async function handleMasterPasswordSave(e) {
    e.preventDefault();
    const current = currentMasterPasswordInput.value;
    const newPwd = newMasterPasswordInput.value;
    const confirm = confirmMasterPasswordInput.value;

    if (newPwd !== confirm) return showToast('两次输入不一致');
    if (newPwd.length < 6) return showToast('主密码至少 6 个字符');
    if (masterPasswordHash && current !== masterPasswordHash) return showToast('当前主密码不正确');

    await chrome.storage.local.set({masterPassword: newPwd});
    masterPasswordHash = newPwd;
    updateMasterPasswordButton();
    showToast('主密码设置成功');
    closeMasterPasswordModal();
}

async function handleRemoveMasterPassword() {
    const current = currentMasterPasswordInput.value;
    if (!current || current !== masterPasswordHash) return showToast('当前主密码不正确');
    if (!confirm('确定要移除主密码吗？')) return;
    await chrome.storage.local.remove('masterPassword');
    masterPasswordHash = null;
    updateMasterPasswordButton();
    showToast('主密码已移除');
    closeMasterPasswordModal();
}

// Auto login
async function autoLogin(id) {
    const p = passwords.find(p => p.id === id);
    if (!p) return;
    const targetUrl = p.loginUrl || p.url;
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    await chrome.tabs.update(tab.id, {url: targetUrl});

    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'autoFillLogin',
                    username: p.username,
                    password: p.password
                }).catch(() => {
                });
            }, 500);
            chrome.tabs.onUpdated.removeListener(listener);
        }
    });
    showToast('正在跳转到登录页面...');
}
