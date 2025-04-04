const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const { Client } = require('ssh2');
const { saveEncryptedSettings, loadEncryptedSettings } = require('./settingsStore');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

app.setName('Scoreboard');

const mediaListPath = path.join(app.getPath('userData'), 'media.json');

function loadMediaList() {
  if (fs.existsSync(mediaListPath)) {
    return JSON.parse(fs.readFileSync(mediaListPath, 'utf-8'));
  }
  return [];
}

function saveMediaList(list) {
  fs.writeFileSync(mediaListPath, JSON.stringify(list, null, 2), 'utf-8');
}

function calculateFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

ipcMain.handle('load-settings', async () => {
  const filePath = path.join(app.getPath('userData'), 'settings.json');
  const settings = loadEncryptedSettings(filePath);
  return settings;
});

ipcMain.handle('save-settings', async (event, settings) => {
  const filePath = path.join(app.getPath('userData'), 'settings.json');
  await saveEncryptedSettings(filePath, settings);
});

ipcMain.handle('test-connection', async () => {
  const filePath = path.join(app.getPath('userData'), 'settings.json');
  const settings = loadEncryptedSettings(filePath);

  return new Promise((resolve) => {
    if (!settings || !settings.server || !settings.username || !settings.password) {
      return resolve({ status: 'error', message: 'Unvollständige Einstellungen' });
    }

    const conn = new Client();

    conn
      .on('ready', () => {
        conn.end();
        resolve({ status: 'ok', message: 'Verbindung erfolgreich' });
      })
      .on('error', (err) => {
        console.error('[SSH] Connection error:', err.message);
        resolve({ status: 'error', message: 'Verbindung fehlgeschlagen' });
      })
      .connect({
        host: settings.server,
        port: 22,
        username: settings.username,
        password: settings.password,
        readyTimeout: 5000
      });
  });
});

ipcMain.handle('load-media', async () => {
  const mediaList = loadMediaList();
  const mediaDir = path.join(app.getPath('userData'), 'media');

  return mediaList.map((item) => ({
    ...item,
    path: path.join(mediaDir, item.fileName)
  }));
});

ipcMain.handle('add-media', async (event, options = {}) => {
  const mediaDir = path.join(app.getPath('userData'), 'media');
  const mediaList = loadMediaList();

  let originalPath;

  if (options.force && options.originalPath) {
    originalPath = String(options.originalPath);
  } else {
    const result = await dialog.showOpenDialog({
      title: 'Video auswählen',
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { status: 'cancel' };
    }

    originalPath = String(result.filePaths[0]);
  }

  const fileName = String(options.fileName || path.basename(originalPath));
  const targetPath = path.join(mediaDir, fileName);
  const fileHash = String(calculateFileHash(originalPath));

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  if (!options.force) {
    const duplicate = mediaList.find((entry) => entry.hash === fileHash);
    if (duplicate) {
      if (duplicate.fileName === fileName) {
        return {
          status: 'duplicate-identical',
          fileName: String(fileName)
        };
      }
      return {
        status: 'duplicate-hash',
        fileName: String(fileName),
        existingFileName: String(duplicate.fileName),
        hash: String(fileHash),
        originalPath: String(originalPath)
      };
    }
  }

  fs.copyFileSync(originalPath, targetPath);

  const newEntry = {
    id: crypto.randomUUID(),
    fileName,
    originalPath,
    path: targetPath,
    hash: fileHash,
    addedAt: new Date().toISOString()
  };

  mediaList.push(newEntry);
  saveMediaList(mediaList);

  return {
    status: 'ok',
    id: String(newEntry.id),
    fileName: String(newEntry.fileName),
    originalPath: String(newEntry.originalPath),
    path: String(newEntry.path),
    hash: String(newEntry.hash),
    addedAt: String(newEntry.addedAt)
  };
});

ipcMain.handle('delete-media', async (event, fileName) => {
  const userData = app.getPath('userData');
  const mediaDir = path.join(userData, 'media');
  const filePath = path.join(mediaDir, fileName);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const mediaList = loadMediaList().filter((item) => item.fileName !== fileName);
    saveMediaList(mediaList);

    return { status: 'ok' };
  } catch (err) {
    console.error('[Media] Fehler beim Löschen:', err);
    return { status: 'error', message: err.message };
  }
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
  });

  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    window.loadURL('http://localhost:5173');
  }

  window.once('ready-to-show', () => {
    window.center();
    window.show();
  });

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

const menuTemplate = [
  {
    label: app.name,
    submenu: [
      {
        label: 'About',
        click: () => {
          dialog.showMessageBox({
            title: `About ${app.getName()}`,
            message: `${app.getName()} v${app.getVersion()}`,
            detail: '© 2025 by operun Digital Solutions',
            buttons: ['OK'],
          });
        },
      },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'Datei',
    submenu: [
      {
        label: 'Neu',
        click: () => {
          console.log('Neu gewählt');
        },
      },
      { type: 'separator' },
      { role: 'close' },
    ],
  },
  {
    label: 'Ansicht',
    submenu: [
      { role: 'reload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
];

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
