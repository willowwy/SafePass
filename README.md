# Local Password Manager - Browser Extension

A simple local password manager browser extension that supports automatic password saving and autofill.

## Features

- Automatic login form detection
- Prompt to save password when submitting forms
- Autofill saved passwords
- Local password storage (chrome.storage.local)
- Clean management interface
- Password export/import functionality (CSV format)

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
3. After submitting the form, a prompt will automatically appear asking if you want to save
4. Click "Save" to save the password

### Autofill

1. Visit a website where you have saved passwords
2. Click on the password input field
3. A list of saved accounts for this website will be displayed
4. Click to select an account, and username and password will be automatically filled

### Manage Passwords

1. Click the extension icon in the browser toolbar
2. In the popup window you can:
   - View all saved passwords
   - Search for passwords
   - Click a password item to copy to clipboard
   - Delete unwanted passwords
   - Manually add passwords

### Export/Import Passwords

#### Export
1. Click the extension icon in the browser toolbar
2. Click the "导出密码" (Export Passwords) button
3. A CSV file will be downloaded with format: `passwords-backup-YYYY-MM-DD.csv`
4. The exported file includes columns: Website, Username, Password, Created Date, ID
5. Can be opened in Excel, Google Sheets, or any CSV-compatible application

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

⚠️ **This is a basic version with unencrypted password storage**

Currently passwords are stored in plain text in the browser's local storage. Future versions should add:
- Master password functionality
- Encrypted password storage (Web Crypto API)
- Password strength detection
- Encrypted export/import with password protection

## Future Development Plans

- [ ] Add password encryption
- [ ] Implement master password verification
- [ ] Add password generator
- [x] Support password export/import
- [ ] Optimize domain matching algorithm
- [ ] Add encrypted export with password protection

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
