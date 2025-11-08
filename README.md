# SafePass - Local Password Manager

A secure and convenient browser password management extension with smart autofill, intelligent merge, and one-click login features.

## Key Features

### Core Innovations

- **🎯 Smart Account Recognition**: Identifies accounts by `URL + Username` combination, automatically prevents duplicates
- **🔄 Intelligent Import Merge**: Automatically keeps the newest password based on timestamp when importing duplicates
- **⚡ AJAX Form Support**: Advanced detection for dynamic login forms on modern single-page applications
- **🌐 Multi-language i18n**: Automatically switches between English/Chinese based on browser language
- **🔐 One-Click Login**: Auto-navigate to login page and fill credentials with a single click

### Standard Features

- **Auto-Save**: Detects login forms and intelligently identifies new registrations vs password updates
- **Multi-Account Support**: Manage multiple accounts per website
- **Auto-Fill Dropdown**: Quick account selection from detected input fields
- **Master Password Protection**: Optional protection for password exports
- **CSV Import/Export**: Simple backup and restore with proper CSV escaping

## Installation

### Chrome / Edge Browser

1. Open the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. Enable "Developer mode" in the top right corner

3. Click "Load unpacked"

4. Select the `SafePass` folder

5. Installation complete! The extension icon will appear in the toolbar

## Usage

### Automatic Workflow

1. **Login anywhere** → Extension detects and prompts to save
2. **Return to site** → Auto-fill dropdown appears on input fields
3. **Manage via popup** → Search, copy, delete, or one-click login

### Import/Export

**Export**: Click menu (☰) → Export → Enter master password (if set) → Download CSV

**Import**: Click menu (☰) → Import → Select CSV file
- **Merge mode**: Automatically keeps newest password for duplicate `URL + Username` pairs based on timestamp
- **Replace mode**: Clear all and import fresh

**CSV Format**:
```csv
Website,Username,Password,Created
https://example.com,user@email.com,mypassword,2025-01-01T00:00:00.000Z
```

## Security

**100% Local Storage**: All data stored in browser local storage, never uploaded anywhere.

- ✅ Completely offline, no network transmission
- ✅ Master password protects exports
- ⚠️ Passwords stored unencrypted in browser (plaintext)

**Recommendations**: Use on trusted devices only, enable browser sync encryption if needed.

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
├── _locales/              # i18n translations
│   ├── en/
│   └── zh_CN/
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
