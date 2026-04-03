const fs = require('fs');

function loadEncryptedSettings(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    // File is unreadable (e.g. old encrypted format) → treat as missing
    return null;
  }
}

async function saveEncryptedSettings(filePath, settings) {
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}

module.exports = { saveEncryptedSettings, loadEncryptedSettings };
