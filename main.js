const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const { Client } = require('ssh2');
const { saveEncryptedSettings, loadEncryptedSettings } = require('./settingsStore');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

app.setName('Scoreboard');

const mediaListPath = path.join(app.getPath('userData'), 'media.json');
const playlistsPath = path.join(app.getPath('userData'), 'playlists.json');

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

function getMediaType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
  if (['.jpg', '.jpeg', '.png'].includes(ext)) return 'image';
  return 'unknown';
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
    path: path.join(mediaDir, item.storedName)
  }));
});

ipcMain.handle('add-media', async (event, filePath) => {
  const mediaDir = path.join(app.getPath('userData'), 'media');
  const mediaList = loadMediaList();

  if (!filePath || !fs.existsSync(filePath)) {
    return { status: 'error', message: 'Ungültiger Pfad' };
  }

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  const fileName = path.basename(filePath);
  const fileHash = calculateFileHash(filePath);
  const mediaType = getMediaType(fileName);

  const knownHash = mediaList.find((entry) => entry.hash === fileHash);

  const id = crypto.randomUUID();
  const ext = path.extname(fileName);
  const storedName = `${id}${ext}`;
  const targetPath = path.join(mediaDir, storedName);

  try {
    fs.copyFileSync(filePath, targetPath);
  } catch (err) {
    return { status: 'error', message: err.message };
  }

  const newEntry = {
    id,
    fileName,
    storedName,
    path: targetPath,
    hash: fileHash,
    type: mediaType,
    addedAt: new Date().toISOString()
  };

  mediaList.push(newEntry);
  saveMediaList(mediaList);

  return {
    status: knownHash ? 'known-hash' : 'ok',
    ...newEntry
  };
});

ipcMain.handle('delete-media', async (event, id) => {
  try {
    const mediaList = loadMediaList();
    const entry = mediaList.find((item) => item.id === id);

    if (!entry) {
      return { status: 'error', message: 'Nicht gefunden' };
    }

    const filePath = path.join(app.getPath('userData'), 'media', entry.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const updatedList = mediaList.filter((item) => item.id !== id);
    saveMediaList(updatedList);

    return { status: 'ok' };
  } catch (err) {
    console.error('[Media] Fehler beim Löschen:', err);
    return { status: 'error', message: err.message };
  }
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Dateien auswählen',
    filters: [
      { name: 'Medien', extensions: ['mp4', 'mov', 'jpg', 'jpeg', 'png'] }
    ],
    properties: ['openFile', 'multiSelections']
  });

  if (result.canceled) return [];

  return result.filePaths;
});

function loadPlaylists() {
  if (fs.existsSync(playlistsPath)) {
    return JSON.parse(fs.readFileSync(playlistsPath, 'utf-8'));
  }
  return [];
}

function savePlaylists(list) {
  fs.writeFileSync(playlistsPath, JSON.stringify(list, null, 2), 'utf-8');
}

ipcMain.handle('load-playlists', () => {
  return loadPlaylists();
});

ipcMain.handle('save-playlist', (event, updated) => {
  const playlists = loadPlaylists();
  const index = playlists.findIndex((p) => p.id === updated.id);

  if (index !== -1) {
    playlists[index] = updated;
  } else {
    playlists.push(updated);
  }

  savePlaylists(playlists);
  return { status: 'ok' };
});

ipcMain.handle('trigger-output', async (event, media) => {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('update-output', media);
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Output window not available' };
});

let outputWindow = null;

function createOutputWindow() {
  outputWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
  });

  if (app.isPackaged) {
    outputWindow.loadFile(path.join(__dirname, 'dist', 'index.html'), { hash: 'output' });
  } else {
    outputWindow.loadURL('http://localhost:5173/#/output');
  }

  outputWindow.once('ready-to-show', () => {
    outputWindow.show();
  });

  outputWindow.on('closed', () => {
    outputWindow = null;
  });
}

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
      {
        label: 'Ausgabefenster öffnen',
        click: () => {
          if (!outputWindow) createOutputWindow();
          else outputWindow.focus();
        }
      },
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
  createOutputWindow(); // Auto-open output window on start as requested

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

