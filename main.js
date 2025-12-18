const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const { Client } = require('ssh2');
const { saveEncryptedSettings, loadEncryptedSettings } = require('./settingsStore');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

app.setName('Scoreboard');

const mediaListPath = path.join(app.getPath('userData'), 'media.json');
const playlistsPath = path.join(app.getPath('userData'), 'playlists.json');
const presetsPath = path.join(app.getPath('userData'), 'presets.json');

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

  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('settings-updated', settings);
  }
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
  let mediaList = loadMediaList();
  const mediaDir = path.join(app.getPath('userData'), 'media');
  let hasChanges = false;

  // Check for missing durations and enrich (Migration logic)
  // We process this sequentially to avoid spawning 100 ffmpeg processes at boot
  const ffmpeg = require('fluent-ffmpeg');

  for (const item of mediaList) {
    if (item.type === 'video' && !item.duration) {
      const fullPath = path.join(mediaDir, item.storedName);
      try {
        if (fs.existsSync(fullPath)) {
          const duration = await new Promise((resolve) => {
            ffmpeg.ffprobe(fullPath, (err, metadata) => {
              if (!err && metadata && metadata.format && metadata.format.duration) {
                resolve(Math.ceil(metadata.format.duration));
              } else {
                resolve(0);
              }
            });
          });

          if (duration > 0) {
            item.duration = duration;
            hasChanges = true;
            console.log(`[Media] Duration fixed for ${item.fileName}: ${duration}s`);
          }
        }
      } catch (e) {
        console.warn(`[Media] Failed to probe ${item.fileName}`, e);
      }
    }
  }

  if (hasChanges) {
    saveMediaList(mediaList);
  }

  return mediaList
    .filter(item => !item.deleted)
    .map((item) => ({
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
    addedAt: new Date().toISOString(),
    updatedAt: Date.now(),
    deleted: false,
    duration: 0 // Default
  };

  // Extract duration for videos
  if (mediaType === 'video') {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      // fluent-ffmpeg needs ffmpeg path. On Mac with Brew it's usually in path.
      // If not, we might need: ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');

      await new Promise((resolve) => {
        ffmpeg.ffprobe(targetPath, (err, metadata) => {
          if (!err && metadata && metadata.format && metadata.format.duration) {
            newEntry.duration = Math.ceil(metadata.format.duration);
          }
          resolve();
        });
      });
    } catch (e) {
      console.error('FFprobe error:', e);
    }
  }

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
    const index = mediaList.findIndex((item) => item.id === id);

    if (index === -1) {
      return { status: 'error', message: 'Nicht gefunden' };
    }

    // Soft delete
    mediaList[index].deleted = true;
    mediaList[index].updatedAt = Date.now();
    saveMediaList(mediaList);

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
  return loadPlaylists().filter(p => !p.deleted);
});

ipcMain.handle('save-playlist', (event, updated) => {
  const playlists = loadPlaylists();
  const index = playlists.findIndex((p) => p.id === updated.id);

  const now = Date.now();
  if (index !== -1) {
    playlists[index] = { ...updated, updatedAt: now };
  } else {
    playlists.push({ ...updated, updatedAt: now, deleted: false });
  }

  savePlaylists(playlists);
  return { status: 'ok' };
});

function loadPresetsList() {
  if (fs.existsSync(presetsPath)) {
    return JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));
  }
  return [];
}

function savePresetsList(list) {
  fs.writeFileSync(presetsPath, JSON.stringify(list, null, 2), 'utf-8');
}

ipcMain.handle('load-presets', () => {
  return loadPresetsList().filter(p => !p.deleted);
});

ipcMain.handle('save-preset', (event, updated) => {
  const list = loadPresetsList();
  const index = list.findIndex(p => p.id === updated.id);

  const now = Date.now();
  if (index !== -1) list[index] = { ...updated, updatedAt: now };
  else list.push({ ...updated, updatedAt: now, deleted: false });

  savePresetsList(list);
  return { status: 'ok' };
});

ipcMain.handle('control-command', async (event, { command, payload }) => {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('control-command', { command, payload });
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Output window not available' };
});

ipcMain.handle('trigger-output', async (event, media) => {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('update-output', media);
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Output window not available' };
});

// --- SYNC TO REMOTE (BIDIRECTIONAL) ---
ipcMain.handle('sync-to-remote', async () => {
  console.log('[Sync] Starting sync request...');
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  const settings = loadEncryptedSettings(settingsPath);

  if (!settings || !settings.server || !settings.username || !settings.password) {
    console.warn('[Sync] Settings missing');
    return { status: 'error', message: 'Einstellungen fehlen!' };
  }

  console.log(`[Sync] Connecting to ${settings.server} as ${settings.username}...`);

  const conn = new Client();
  const remoteBase = 'scoreboard';

  return new Promise((resolve) => {
    // Safety timeout
    const timeout = setTimeout(() => {
      console.error('[Sync] Timeout - No connection established within 15s');
      try { conn.end(); } catch (e) { }
      resolve({ status: 'error', message: 'Verbindungstimeout (15s). Server erreichbar?' });
    }, 15000);

    conn.on('ready', async () => {
      clearTimeout(timeout);
      try {
        console.log('[Sync] SSH Connected. Starting sync logic...');

        // 1. Get Remote Time (to calc offset)
        const remoteTimeMs = await new Promise((res, rej) => {
          conn.exec('date +%s', (err, stream) => {
            if (err) return rej(err);
            let data = '';
            stream.on('data', d => data += d);
            stream.on('close', () => {
              const ts = parseInt(data.trim());
              if (isNaN(ts)) rej(new Error('Invalid server time'));
              else res(ts * 1000);
            });
          });
        });

        const localTimeMs = Date.now();
        const timeOffset = localTimeMs - remoteTimeMs;
        console.log(`[Sync] Time Offset (Local - Remote): ${timeOffset}ms`);

        // 2. Setup SFTP
        console.log('[Sync] Requesting SFTP...');
        const sftp = await new Promise((res, rej) => {
          conn.sftp((err, sftp) => err ? rej(err) : res(sftp));
        });
        console.log('[Sync] SFTP established.');

        // Ensure remote dirs exist via SFTP (safer than exec)
        console.log('[Sync] Creating remote folders (SFTP)...');
        try {
          await new Promise((res, rej) => sftp.mkdir(`${remoteBase}/media`, true, (err) => {
            // Ignore error if dir already exists (usually code 4 or message)
            if (err && err.code !== 4) console.warn('[Sync] mkdir warning:', err.message);
            res();
          }));
        } catch (e) { console.warn('[Sync] mkdir failed', e); }

        console.log('[Sync] Fetching remote data...');

        // Helper: Read JSON from SFTP
        const readRemoteJson = (filename) => new Promise((res) => {
          const rPath = `${remoteBase}/${filename}`;
          let chunks = [];
          const rs = sftp.createReadStream(rPath);
          rs.on('data', d => chunks.push(d));
          rs.on('error', () => res([]));
          rs.on('close', () => {
            if (chunks.length === 0) return res([]);
            try {
              const str = Buffer.concat(chunks).toString('utf-8');
              res(JSON.parse(str));
            } catch (e) {
              console.error('[Sync] JSON Parse Error:', filename, e);
              res([]);
            }
          });
        });

        // Helper: Write JSON to SFTP
        const writeRemoteJson = (filename, data) => new Promise((res, rej) => {
          const rPath = `${remoteBase}/${filename}`;
          const ws = sftp.createWriteStream(rPath);
          ws.on('error', rej);
          ws.on('close', res);
          ws.end(JSON.stringify(data, null, 2));
        });

        // 3. Fetch Remote Data
        const [remoteMedia, remotePlaylists, remotePresets] = await Promise.all([
          readRemoteJson('media.json'),
          readRemoteJson('playlists.json'),
          readRemoteJson('presets.json')
        ]);

        console.log(`[Sync] Remote Loaded: ${remoteMedia.length} Media, ${remotePlaylists.length} Playlists`);

        // 4. Merge Logic
        const mergeLists = (local, remote) => {
          const map = new Map();
          local.forEach(item => map.set(item.id, { ...item, _win: 'local' }));

          remote.forEach(rItem => {
            const lItem = map.get(rItem.id);
            if (!lItem) {
              map.set(rItem.id, { ...rItem, _win: 'remote' });
            } else {
              const lTime = lItem.updatedAt || 0;
              const rTimeAdj = (rItem.updatedAt || 0) + timeOffset;

              if (rTimeAdj > lTime) {
                map.set(rItem.id, { ...rItem, _win: 'remote' });
              }
            }
          });
          return Array.from(map.values());
        };

        const localMedia = loadMediaList();
        const localPlaylists = loadPlaylists();
        const localPresets = loadPresetsList();

        const mergedMedia = mergeLists(localMedia, remoteMedia);
        const mergedPlaylists = mergeLists(localPlaylists, remotePlaylists);
        const mergedPresets = mergeLists(localPresets, remotePresets);

        // 5. Save Merged State (Local & Remote)
        const clean = (list) => list.map(({ _win, ...rest }) => rest);

        saveMediaList(clean(mergedMedia));
        savePlaylists(clean(mergedPlaylists));
        savePresetsList(clean(mergedPresets));

        await writeRemoteJson('media.json', clean(mergedMedia));
        await writeRemoteJson('playlists.json', clean(mergedPlaylists));
        await writeRemoteJson('presets.json', clean(mergedPresets));

        // 6. Transfer Files (Media)
        let up = 0, down = 0;
        const mediaDir = path.join(app.getPath('userData'), 'media');

        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

        for (const item of mergedMedia) {
          if (item.deleted) continue;

          const localPath = path.join(mediaDir, item.storedName);
          const remotePath = `${remoteBase}/media/${item.storedName}`;

          if (item._win === 'local') {
            if (fs.existsSync(localPath)) {
              const rExists = await new Promise(r => sftp.stat(remotePath, err => r(!err)));
              if (!rExists) {
                console.log(`[Sync] Uploading ${item.fileName}...`);
                await new Promise((res, rej) => sftp.fastPut(localPath, remotePath, err => err ? rej(err) : res()));
                up++;
              }
            }
          } else {
            if (!fs.existsSync(localPath)) {
              const rExists = await new Promise(r => sftp.stat(remotePath, err => r(!err)));
              if (rExists) {
                console.log(`[Sync] Downloading ${item.fileName}...`);
                await new Promise((res, rej) => sftp.fastGet(remotePath, localPath, err => err ? rej(err) : res()));
                down++;
              }
            }
          }
        }

        conn.end();
        console.log('[Sync] Done.');
        resolve({ status: 'ok', message: `Synchronisation abgeschlossen. ${up} Dateien hochgeladen und ${down} Dateien heruntergeladen.` });

      } catch (e) {
        console.error('[Sync] Error:', e);
        conn.end();
        resolve({ status: 'error', message: 'Fehler: ' + e.message });
      }
    });

    conn.on('error', (e) => {
      resolve({ status: 'error', message: 'SSH Connection Error: ' + e.message });
    });

    conn.connect({
      host: settings.server,
      port: 22,
      username: settings.username,
      password: settings.password,
      readyTimeout: 10000
    });
  });
});

let outputWindow = null;

function createOutputWindow() {
  outputWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    title: "Output"
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

