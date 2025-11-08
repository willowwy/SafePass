# SafePass - Local Password Manager

[English](README.md) | [简体中文](README.zh-CN.md)

A secure and convenient browser password management extension with auto-save, smart autofill, and one-click login features.

## Key Features

- **Smart Password Saving**: Automatically detects login forms and intelligently identifies new account registrations and password updates
- **Multi-Account Management**: Save and manage multiple accounts per website for easy switching
- **One-Click Login**: Click the "Login" button to automatically navigate to the website and fill in passwords
- **Auto-Fill**: Smart recognition and filling of username/email and password fields
- **Password Import/Export**: Backup and restore with CSV format support
- **Master Password Protection**: Optional master password to protect password exports
- **Beautiful Chinese Interface**: Clean and intuitive password management experience
- **AJAX Form Support**: Compatible with dynamic login forms on modern websites

## Installation

### Chrome / Edge Browser

1. Open the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. Enable "Developer mode" in the top right corner

3. Click "Load unpacked"

4. Select the `SafePass` folder

5. Installation complete! The extension icon will appear in the toolbar

## User Guide

### Save Password

1. Visit any website login page
2. Enter username and password
3. Click the login button
4. A save prompt will appear:
   - **New Account**: Shows "Save new account?"
   - **Password Update**: Shows "Update password?" with old/new password comparison
5. Click "Save" or "Update" to complete

**Note**: No prompt appears if you login with the same saved credentials.

### Auto-Fill

1. Visit a website where you have saved passwords
2. Click on the username or password input field
3. Select an account from the dropdown list
4. Auto-fill complete

### One-Click Login

1. Open the password manager (click extension icon)
2. Find the website you want to login to
3. Click the "Login" button
4. Automatically navigate to the login page and fill in password
5. Manually click the website's login button to complete

### Manage Passwords

Click the extension icon to open the password manager, where you can:

- **View Passwords**: Browse all saved passwords
- **Search**: Use the search box to quickly find passwords
- **Copy Password**: Click a password item to copy to clipboard
- **Delete Password**: Click the "Delete" button to remove unwanted passwords
- **Manual Add**: Click the "+ Add Password Manually" button

### Set Master Password

1. Click the extension icon to open the password manager
2. Click the "Set Master Password" button at the bottom
3. Enter and confirm your master password (minimum 6 characters)
4. Click "Save"

The master password protects the password export function to ensure data security.

### Export/Import Passwords

#### Export

1. Click the "Export Passwords" button
2. If a master password is set, you'll need to enter it for verification
3. Download CSV file: `passwords-backup-YYYY-MM-DD.csv`

#### Import

1. Click the "Import Passwords" button
2. Select a previously exported CSV file
3. Choose import strategy:
   - **Merge**: Only add new passwords (recommended)
   - **Replace**: Clear existing passwords and import

**CSV Format**:
```
Website,Username,Password,Created Date,ID
https://example.com,user@email.com,mypassword,2025-01-01T00:00:00.000Z,abc123
```

## Data Structure

Each password entry contains:
- `url`: Website homepage URL (for domain matching)
- `loginUrl`: Login page URL (for one-click login)
- `username`: Username or email
- `password`: Password
- `createdAt`: Creation time
- `id`: Unique identifier

## Security Notes

**Local Storage**: All password data is stored entirely in the browser's local storage and is never uploaded to any server, ensuring data privacy.

**Current Security Status**:
- ✅ Completely offline data, privacy guaranteed
- ✅ Master password protects export function
- ⚠️ Passwords are stored in plain text in browser local storage (unencrypted)

**Security Recommendations**:
- Ensure your computer and browser account are secure
- Regularly backup password data
- Do not use on public or shared computers
- Enable two-factor authentication for important accounts

Since all data is stored locally, there's no concern about network transmission or server breach risks. However, please properly safeguard your device access.

## Project Structure

```
SafePass/
├── manifest.json          # Extension configuration
├── popup/                 # Popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/            # Background service
│   └── background.js
├── content/               # Content script
│   └── content.js
└── icons/                 # Icon resources
```

## Tech Stack

- **Manifest V3**: Latest Chrome extension specification
- **Vanilla JavaScript**: No external dependencies
- **Chrome Storage API**: Local data storage
- **Chrome Tabs API**: Tab management

## License

MIT License

---

**SafePass** - Simple, Secure, and Local Password Management Solution
