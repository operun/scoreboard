// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  testConnection: () => ipcRenderer.invoke('test-connection'),
  generateSSHKey: () => ipcRenderer.invoke('generate-ssh-key'),
  regenerateSSHKey: () => ipcRenderer.invoke('regenerate-ssh-key'),
  getSSHKeyInfo: () => ipcRenderer.invoke('get-ssh-key-info'),
  loadMedia: () => ipcRenderer.invoke('load-media'),
  addMedia: (filePath) => ipcRenderer.invoke('add-media', filePath),
  deleteMedia: (id) => ipcRenderer.invoke('delete-media', id),
  updateMediaMeta: (data) => ipcRenderer.invoke('update-media-meta', data),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  loadPlaylists: () => ipcRenderer.invoke('load-playlists'),
  savePlaylist: (playlist) => ipcRenderer.invoke('save-playlist', playlist),
  deletePlaylist: (id) => ipcRenderer.invoke('delete-playlist', id),
  syncToRemote: () => ipcRenderer.invoke('sync-to-remote'),

  // Presets
  loadPresets: () => ipcRenderer.invoke('load-presets'),
  savePreset: (preset) => ipcRenderer.invoke('save-preset', preset),
  deletePreset: (id) => ipcRenderer.invoke('delete-preset', id),

  // Communication for Output Window
  onUpdateOutput: (callback) => {
    const subscription = (event, value) => callback(null, value);
    ipcRenderer.on('update-output', subscription);
    return () => ipcRenderer.removeListener('update-output', subscription);
  },

  onControlCommand: (callback) => {
    const subscription = (event, value) => callback(null, value);
    ipcRenderer.on('control-command', subscription);
    return () => ipcRenderer.removeListener('control-command', subscription);
  },

  onSettingsUpdated: (callback) => {
    const subscription = (event, value) => callback(null, value);
    ipcRenderer.on('settings-updated', subscription);
    return () => ipcRenderer.removeListener('settings-updated', subscription);
  },

  onPlaylistsUpdated: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('playlists-updated', subscription);
    return () => ipcRenderer.removeListener('playlists-updated', subscription);
  },

  onMediaUpdated: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('media-updated', subscription);
    return () => ipcRenderer.removeListener('media-updated', subscription);
  },

  onTestImageUpdated: (callback) => {
    const subscription = (event, value) => callback(null, value);
    ipcRenderer.on('test-image-updated', subscription);
    return () => ipcRenderer.removeListener('test-image-updated', subscription);
  },

  selectTestImage: () => ipcRenderer.invoke('select-test-image'),
  deleteTestImage: () => ipcRenderer.invoke('delete-test-image'),

  // Generic control command
  sendControlCommand: (command, payload) => ipcRenderer.invoke('control-command', { command, payload }),

  // Legacy single trigger (can be deprecated later)
  triggerOutput: (media) => ipcRenderer.invoke('trigger-output', media),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // Environment
  platform: process.platform,

  // Reset (wipes settings + presets, keeps media)
  resetApp: () => ipcRenderer.invoke('reset-app'),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  resetMedia: () => ipcRenderer.invoke('reset-media'),

  // Versions
  getVersions: () => ipcRenderer.invoke('get-versions'),
});
