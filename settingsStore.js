const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const IV = Buffer.alloc(16, 0);

function getEncryptionKey() {
  const keyFile = path.join(app.getPath('userData'), 'encryption-key.bin');
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile);
  } else {
    const newKey = crypto.randomBytes(32);
    fs.writeFileSync(keyFile, newKey);
    return newKey;
  }
}

function encrypt(data) {
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, IV);
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
