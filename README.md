# Local Password Manager - Browser Extension

A Chrome browser extension for local password management with intelligent autofill and master password protection.

## Features

- **Smart Password Detection**: Automatically detects login forms and saves credentials
- **Intelligent Save Prompts**: Distinguishes between new accounts and password updates
- **Enhanced Autofill**: Works on both username/email and password fields
- **Master Password Protection**: Optional master password to protect password exports
- **Multiple Accounts Support**: Save and manage multiple accounts per website
- **Password Import/Export**: Backup and restore passwords via CSV files
- **Clean Interface**: Modern, user-friendly password management interface
- **Error Recovery**: Automatic handling of extension reloads with user notifications

## Project Structure

```
password-manager-extension/
├── manifest.json          # Extension configuration
├── popup/                 # Popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/            # Background service
│   └── background.js
├── content/               # Content script
│   └── content.js
└── icons/                 # Icon folder
```

## Installation

### Chrome / Edge Browser

1. Open browser and navigate to extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. Enable "Developer mode" in the top right corner

3. Click "Load unpacked"

4. Select the `password-manager-extension` folder

5. Installation complete! The extension icon will appear in the toolbar

## Usage

### Save Password

1. Visit any website that requires login
2. Enter username and password
3. Submit the login form
4. A smart prompt will appear:
   - **New Account**: Shows "保存新账户?" if this is a new username for the site
   - **Update Password**: Shows "更新密码?" if the username exists but password changed
   - Displays masked password comparison for updates (e.g., `p••••••d`)
5. Click "Save" or "Update" to save the credentials

**Note**: No prompt appears if you log in with the same saved credentials.

### Autofill

1. Visit a website where you have saved passwords
2. Click on **either** the username/email field **or** the password field
3. A dropdown list of saved accounts for this website will appear
4. Click to select an account
5. Both username and password will be automatically filled

**Enhanced Features**:
- Works on dynamically loaded forms (SPAs like GitHub)
- Automatically detects common username field patterns
- Multiple retry mechanism for slow-loading pages

### Manage Passwords

1. Click the extension icon in the browser toolbar
2. In the popup window you can:
   - View all saved passwords
   - Search for passwords
   - Click a password item to copy to clipboard
   - Delete unwanted passwords
   - Manually add passwords

### Master Password

Set up a master password to protect your password exports:

1. Click the extension icon in the browser toolbar
2. Click the "设置主密码" (Set Master Password) button at the bottom
3. Enter and confirm your master password (minimum 6 characters)
4. Click "Save"

**Managing Master Password**:
- After setting, the button changes to "管理主密码" (Manage Master Password)
- You can change or remove your master password at any time
- Requires current password verification for changes

⚠️ **Important**: The master password currently protects exports only. Full password encryption will be added in future updates.

### Export/Import Passwords

#### Export
1. Click the extension icon in the browser toolbar
2. Click the "导出密码" (Export Passwords) button
3. **If master password is set**: Enter your master password when prompted
4. A CSV file will be downloaded with format: `passwords-backup-YYYY-MM-DD.csv`
5. The exported file includes columns: Website, Username, Password, Created Date, ID
6. Can be opened in Excel, Google Sheets, or any CSV-compatible application

#### Import
1. Click the extension icon in the browser toolbar
2. Click the "导入密码" (Import Passwords) button
3. Select a previously exported CSV file
4. Choose your import strategy:
   - Click "确定" (OK) to merge with existing passwords (only adds new passwords by ID)
   - Click "取消" (Cancel) to replace all existing passwords with imported ones
5. A confirmation message will show how many passwords were imported

**CSV File Format:**
```
Website,Username,Password,Created Date,ID
https://example.com,user@email.com,mypassword,2025-10-31T12:00:00.000Z,abc123
```

## Important Notes

⚠️ **Security Status**

**Current Implementation**:
- ✅ Master password framework implemented (protects exports)
- ✅ Smart password detection and update prompts
- ✅ Enhanced autofill with username field support
- ⚠️ Passwords stored in plain text in browser's local storage
- ⚠️ Master password stored in plain text (encryption TODO)

**Upcoming Security Enhancements**:
- Password encryption using Web Crypto API
- Encrypted master password storage (hashing)
- Master password required for accessing all passwords
- Auto-lock functionality
- Password strength indicator

## Changelog & Roadmap

### ✅ Completed
- [x] Automatic password save and autofill
- [x] Password export/import (CSV format)
- [x] Smart detection: new account vs password update
- [x] Enhanced autofill for username/email fields
- [x] Master password framework (protects exports)
- [x] Multiple accounts per website support
- [x] Extension context error handling
- [x] Dynamic form detection (SPA support)

### 🚧 In Progress
- [ ] Password encryption with Web Crypto API
- [ ] Secure master password hashing (PBKDF2/Argon2)
- [ ] Master password unlock screen on startup

### 📋 Future Plans
- [ ] Password strength indicator and generator
- [ ] Auto-lock after inactivity
- [ ] Encrypted password storage
- [ ] Browser sync support (optional)
- [ ] Password breach detection
- [ ] Two-factor authentication support

## Tech Stack

- Manifest V3
- Chrome Extension APIs
- Vanilla JavaScript
- Chrome Storage API

## Development Notes

This is a minimalist implementation suitable for learning and extension. Main file functions:

- **manifest.json**: Defines extension permissions and configuration
- **popup.js**: Management interface logic
- **background.js**: Background message handling
- **content.js**: Web form monitoring and autofill

## License

MIT License
