const fs = require('fs');
const crypto = require('crypto');

const ENCRYPTION_KEY = crypto.scryptSync('super-secret-key', 'salt123', 32);
const IV = Buffer.alloc(16, 0);

function encrypt(data) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

async function saveEncryptedSettings(filePath, settings) {
  const encrypted = encrypt(settings);
  fs.writeFileSync(filePath, encrypted, 'utf-8');
}

module.exports = {
  saveEncryptedSettings
};
