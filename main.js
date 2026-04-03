const { app, BrowserWindow, ipcMain, Menu, dialog, nativeImage } = require('electron');
const { saveEncryptedSettings, loadEncryptedSettings } = require('./settingsStore');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- Crash safety: write to log and show dialog instead of silently dying ---
// This must be registered before any other code that might throw.
process.on('uncaughtException', (error) => {
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] UNCAUGHT EXCEPTION\n${error.stack}\n\n`);
  } catch (_) { /* ignore log errors */ }
  try {
    dialog.showErrorBox('Scoreboard – Fehler beim Start', `${error.message}\n\nDetails: ${error.stack}`);
  } catch (_) { /* dialog may not be available yet */ }
  app.quit();
});

// --- ssh2 is lazy-loaded to avoid startup crash if native module (cpu-features) fails ---
// If ssh2 fails to load, only sync/connection features are broken — the app still opens.
function getSSHClient() {
  const { Client } = require('ssh2');
  return new Client();
}

// --- ffprobe-static path (remapped for ASAR packaging) ---
let ffprobePath = null;
try {
  const ffprobeRaw = require('ffprobe-static').path;
  ffprobePath = app.isPackaged
    ? ffprobeRaw.replace('app.asar', 'app.asar.unpacked')
    : ffprobeRaw;
} catch (e) {
  console.error('[FFprobe] Failed to load ffprobe-static:', e.message);
}

app.setName('Scoreboard');
// Required on Windows for correct taskbar grouping, notifications and Start-Menu pinning
if (process.platform === 'win32') {
  app.setAppUserModelId('com.operun.scoreboard');
}

// Disable Chromium's autoplay policy so that videos with audio play automatically
// without requiring prior user interaction (needed for the output window on Windows)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const mediaListPath = path.join(app.getPath('userData'), 'media.json');
const playlistsPath = path.join(app.getPath('userData'), 'playlists.json');
const presetsPath = path.join(app.getPath('userData'), 'presets.json');

// --- Sync Configuration (from settings, with fallback defaults) ---
const SYNC_REMOTE_BASE = 'scoreboard';
const SSH_KEY_PATH = path.join(app.getPath('userData'), 'id_ed25519');
const SSH_PUBKEY_PATH = SSH_KEY_PATH + '.pub';

function getSyncConfig() {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  const settings = loadEncryptedSettings(settingsPath) || {};
  return {
    host: settings.syncHost || 'sync.operun.de',
    user: settings.syncUser || 'scoreboard',
  };
}

// --- SSH Key Management ---
function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function getSSHKeyInfo() {
  if (fs.existsSync(SSH_KEY_PATH) && fs.existsSync(SSH_PUBKEY_PATH)) {
    const publicKey = fs.readFileSync(SSH_PUBKEY_PATH, 'utf8').trim();
    // Fingerprint is SHA256 of the raw key blob (the base64 part of authorized_keys)
    const parts = publicKey.split(' ');
    const keyBlob = Buffer.from(parts[1], 'base64');
    const fingerprint = 'SHA256:' + crypto.createHash('sha256').update(keyBlob).digest('base64').replace(/=+$/, '');
    return { exists: true, publicKey, fingerprint };
  }
  return { exists: false, publicKey: null, fingerprint: null };
}

function generateSSHKeyPair() {
  const { execSync } = require('child_process');
  const hostname = require('os').hostname();
  const comment = `${getSyncConfig().user}@${hostname}`;

  // ssh-keygen is available on Windows 10 1809+, macOS, Linux out of the box
  execSync(`ssh-keygen -t ed25519 -C "${comment}" -f "${SSH_KEY_PATH}" -N ""`, {
    windowsHide: true,
  });

  return getSSHKeyInfo();
}


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

ipcMain.handle('get-versions', () => ({
  app: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  v8: process.versions.v8,
}));

ipcMain.handle('load-settings', async () => {
  const filePath = path.join(app.getPath('userData'), 'settings.json');
  const settings = loadEncryptedSettings(filePath) || {};

  // Check for custom test image
  const customImagePath = path.join(app.getPath('userData'), 'custom_test_image.png');
  if (fs.existsSync(customImagePath)) {
    settings.customTestImage = `file://${customImagePath}?t=${Date.now()}`;
    if (!settings.customTestImageName) settings.customTestImageName = 'Eigenes Testbild';
  } else {
    settings.customTestImage = null;
    settings.customTestImageName = null;
  }

  return settings;
});


ipcMain.handle('save-settings', async (event, settings) => {
  const filePath = path.join(app.getPath('userData'), 'settings.json');
  await saveEncryptedSettings(filePath, settings);

  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('settings-updated', settings);
  }

  // Also send to the sender window (Main Window / Controller) if it's different or just always
  // event.sender is the webContents of the caller.
  event.sender.send('settings-updated', settings);
});

// --- SSH Key IPC Handlers ---
ipcMain.handle('get-ssh-key-info', async () => {
  return getSSHKeyInfo();
});

ipcMain.handle('generate-ssh-key', async () => {
  if (fs.existsSync(SSH_KEY_PATH)) {
    return { status: 'error', message: 'SSH-Schlüssel existiert bereits.' };
  }
  try {
    const info = generateSSHKeyPair();
    return { status: 'ok', ...info };
  } catch (e) {
    console.error('[SSH] Key generation failed:', e);
    return { status: 'error', message: 'Schlüssel konnte nicht erzeugt werden: ' + e.message };
  }
});

ipcMain.handle('regenerate-ssh-key', async () => {
  try {
    // Remove old keys first
    if (fs.existsSync(SSH_KEY_PATH))     fs.unlinkSync(SSH_KEY_PATH);
    if (fs.existsSync(SSH_PUBKEY_PATH))  fs.unlinkSync(SSH_PUBKEY_PATH);
    const info = generateSSHKeyPair();
    return { status: 'ok', ...info };
  } catch (e) {
    console.error('[SSH] Key regeneration failed:', e);
    return { status: 'error', message: 'Schlüssel konnte nicht erneuert werden: ' + e.message };
  }
});


ipcMain.handle('test-connection', async () => {
  const keyInfo = getSSHKeyInfo();
  if (!keyInfo.exists) {
    return { status: 'error', message: 'Kein SSH-Schlüssel vorhanden.' };
  }

  let conn;
  try {
    conn = getSSHClient();
  } catch (e) {
    console.error('[SSH] ssh2 module not available:', e.message);
    return { status: 'error', message: 'SSH-Modul nicht verfügbar: ' + e.message };
  }

  return new Promise((resolve) => {
    conn
      .on('ready', () => {
        conn.end();
        resolve({ status: 'ok', message: 'Verbindung erfolgreich' });
      })
      .on('error', (err) => {
        console.error('[SSH] Connection error:', err.message);
        resolve({ status: 'error', message: 'Verbindung fehlgeschlagen: ' + err.message });
      })
      .connect({
        host: getSyncConfig().host,
        port: 22,
        username: getSyncConfig().user,
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8'),
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
  ffmpeg.setFfprobePath(ffprobePath);

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

  const { pathToFileURL } = require('url');
  return mediaList
    .filter(item => !item.deleted)
    .map((item) => ({
      ...item,
      path: pathToFileURL(path.join(mediaDir, item.storedName)).href,
      thumbnailPath: item.thumbnailStoredName
        ? pathToFileURL(path.join(mediaDir, 'thumbnails', item.thumbnailStoredName)).href
        : null
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName, 'de', { sensitivity: 'base' }));
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

  // Extract duration + generate thumbnail for videos
  if (mediaType === 'video') {
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfprobePath(ffprobePath);

    // Duration
    try {
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

    // Thumbnail
    try {
      const thumbDir = path.join(mediaDir, 'thumbnails');
      if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

      const thumbName = `${id}.jpg`;
      const thumbPath = path.join(thumbDir, thumbName);

      await new Promise((resolve) => {
        ffmpeg(targetPath)
          .on('end', resolve)
          .on('error', (err) => {
            console.warn('[Media] Thumbnail generation failed:', err.message);
            resolve();
          })
          .screenshots({
            timestamps: ['00:00:01'],
            filename: thumbName,
            folder: thumbDir,
            size: '160x90'
          });
      });

      if (fs.existsSync(thumbPath)) {
        newEntry.thumbnailStoredName = thumbName;
        console.log(`[Media] Thumbnail generated: ${thumbName}`);
      }
    } catch (e) {
      console.warn('[Media] Thumbnail error:', e);
    }
  }

  mediaList.push(newEntry);
  saveMediaList(mediaList);
  BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('media-updated'); });

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
    BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('media-updated'); });
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

ipcMain.handle('select-test-image', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Testbild auswählen',
    filters: [{ name: 'Bilder', extensions: ['jpg', 'jpeg', 'png'] }],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const sourcePath = result.filePaths[0];
  const destPath = path.join(app.getPath('userData'), 'custom_test_image.png');

  try {
    fs.copyFileSync(sourcePath, destPath);

    // Verify settings existence before saving
    let settings = loadEncryptedSettings(path.join(app.getPath('userData'), 'settings.json')) || {};
    settings.customTestImageName = path.basename(sourcePath);
    await saveEncryptedSettings(path.join(app.getPath('userData'), 'settings.json'), settings);

    // Notify output window to reload the image
    if (outputWindow && !outputWindow.isDestroyed()) {
      outputWindow.webContents.send('test-image-updated', `file://${destPath}?t=${Date.now()}`);
    }

    return { path: `file://${destPath}?t=${Date.now()}`, name: settings.customTestImageName };
  } catch (error) {
    console.error('Error saving test image:', error);
    return null;
  }
});

ipcMain.handle('delete-test-image', async () => {
  const destPath = path.join(app.getPath('userData'), 'custom_test_image.png');
  try {
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    // Clear name in settings
    let settings = loadEncryptedSettings(path.join(app.getPath('userData'), 'settings.json')) || {};
    delete settings.customTestImageName;
    await saveEncryptedSettings(path.join(app.getPath('userData'), 'settings.json'), settings);

    // Notify output window
    if (outputWindow && !outputWindow.isDestroyed()) {
      outputWindow.webContents.send('test-image-updated', null);
    }
    return true;
  } catch (e) {
    console.error('Error deleting test image:', e);
    return false;
  }
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
  BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('playlists-updated'); });
  return { status: 'ok' };
});

ipcMain.handle('delete-playlist', (event, id) => {
  const playlists = loadPlaylists();
  const index = playlists.findIndex((p) => p.id === id);

  if (index !== -1) {
    playlists[index].deleted = true;
    playlists[index].updatedAt = Date.now();
    savePlaylists(playlists);
    BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('playlists-updated'); });
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Not found' };
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
  else list.push({ ...updated, updatedAt: now }); // Removed deleted: false as we don't use soft deletes anymore

  savePresetsList(list);
  return { status: 'ok' };
});

ipcMain.handle('delete-preset', (event, id) => {
  let list = loadPresetsList();
  // Hard delete: Filter out the item with the given ID
  const initialLength = list.length;
  list = list.filter(p => p.id !== id);

  if (list.length !== initialLength) {
    savePresetsList(list);
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Not found' };
});

ipcMain.handle('control-command', async (event, { command, payload }) => {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('control-command', { command, payload });
    }
  });

  return { status: 'ok' };
});

ipcMain.handle('trigger-output', async (event, media) => {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('update-output', media);
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Output window not available' };
});

ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// --- SYNC TO REMOTE (BIDIRECTIONAL) ---
ipcMain.handle('sync-to-remote', async () => {
  console.log('[Sync] Starting sync request...');

  const keyInfo = getSSHKeyInfo();
  if (!keyInfo.exists) {
    console.warn('[Sync] No SSH key found');
    return { status: 'error', message: 'Kein SSH-Schlüssel vorhanden. Bitte zuerst in den Einstellungen generieren.' };
  }

  let conn;
  try {
    conn = getSSHClient();
  } catch (e) {
    console.error('[Sync] ssh2 module not available:', e.message);
    return { status: 'error', message: 'SSH-Modul nicht verfügbar: ' + e.message };
  }

  const { host: SYNC_HOST, user: SYNC_USER } = getSyncConfig();
  console.log(`[Sync] Connecting to ${SYNC_HOST} as ${SYNC_USER}...`);

  const remoteBase = SYNC_REMOTE_BASE;

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

        // Recursively ensure remote dirs exist (ssh2 has no recursive mkdir).
        // Creates each path segment individually, ignoring "already exists" errors.
        const mkdirpSftp = (dirPath) => new Promise((resolve) => {
          const segments = dirPath.split('/').filter(Boolean);
          const makeNext = (i) => {
            if (i > segments.length) return resolve();
            const partial = segments.slice(0, i).join('/');
            sftp.mkdir(partial, (err) => {
              if (err) console.log(`[Sync] mkdir '${partial}': ${err.message} (ignored)`);
              makeNext(i + 1);
            });
          };
          makeNext(1);
        });

        console.log('[Sync] Ensuring remote folder structure...');
        await mkdirpSftp(remoteBase);
        await mkdirpSftp(`${remoteBase}/media`);

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
      host: getSyncConfig().host,
      port: 22,
      username: getSyncConfig().user,
      privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8'),
      readyTimeout: 10000
    });
  });
});

// --- Reset: Settings & Presets only ---
ipcMain.handle('reset-settings', async () => {
  const filesToDelete = [
    path.join(app.getPath('userData'), 'settings.json'),
    path.join(app.getPath('userData'), 'playlists.json'),
    path.join(app.getPath('userData'), 'presets.json'),
  ];
  for (const f of filesToDelete) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { console.error('[Reset] Failed:', f, e); }
  }
  app.relaunch();
  app.quit();
});

// --- Reset: Media only ---
ipcMain.handle('reset-media', async () => {
  const mediaDir = path.join(app.getPath('userData'), 'media');
  const mediaList = path.join(app.getPath('userData'), 'media.json');
  try {
    if (fs.existsSync(mediaDir)) fs.rmSync(mediaDir, { recursive: true, force: true });
    if (fs.existsSync(mediaList)) fs.unlinkSync(mediaList);
  } catch (e) { console.error('[Reset] Media reset failed:', e); }
  app.relaunch();
  app.quit();
});

// --- Reset: Everything ---
ipcMain.handle('reset-app', async () => {
  const userData = app.getPath('userData');
  const filesToDelete = [
    path.join(userData, 'settings.json'),
    path.join(userData, 'playlists.json'),
    path.join(userData, 'presets.json'),
    path.join(userData, 'media.json'),
  ];
  for (const f of filesToDelete) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { console.error('[Reset] Failed:', f, e); }
  }
  const mediaDir = path.join(userData, 'media');
  try {
    if (fs.existsSync(mediaDir)) fs.rmSync(mediaDir, { recursive: true, force: true });
  } catch (e) { console.error('[Reset] Media dir failed:', e); }
  app.relaunch();
  app.quit();
});

let outputWindow = null;

// Resolve app icon path depending on platform
function getAppIcon() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'src', 'assets', 'icons')
    : path.join(__dirname, 'src', 'assets', 'icons');
  if (process.platform === 'darwin') return path.join(base, 'icon.icns');
  if (process.platform === 'win32') return path.join(base, 'icon.ico');
  return path.join(base, 'icon.png'); // Linux
}

// --- CREATE OUTPUT WINDOW ---
function createOutputWindow() {
  outputWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    frame: false,           // Frameless on all platforms — Output window has its own TitleBar
    autoHideMenuBar: true,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required'
    },
    title: 'Output - Scoreboard',
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 10, y: 10 } } : {}),
  });

  if (app.isPackaged) {
    outputWindow.loadFile(path.join(__dirname, 'dist', 'index.html'), { hash: '/output' });
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

// --- CREATE MAIN WINDOW ---
function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    frame: false,           // Frameless on all platforms — custom TitleBar handles controls
    minWidth: 1024,
    minHeight: 768,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required'
    },
    title: 'Controller - Scoreboard',
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 10, y: 10 } } : {}),
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
            detail: 'powered by operun Digital Solutions',
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
  // Startup diagnostic log — helps diagnose issues on Windows where no terminal is visible
  try {
    const logPath = path.join(app.getPath('userData'), 'startup.log');
    fs.writeFileSync(logPath,
      `[${new Date().toISOString()}] App started\n` +
      `Version: ${app.getVersion()}\n` +
      `Platform: ${process.platform} ${process.arch}\n` +
      `Electron: ${process.versions.electron}\n` +
      `Node: ${process.versions.node}\n` +
      `Packaged: ${app.isPackaged}\n` +
      `UserData: ${app.getPath('userData')}\n`
    );
  } catch (e) {
    console.error('[Startup] Could not write startup.log:', e.message);
  }

  createWindow();
  createOutputWindow(); // Auto-open output window on start as requested

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

