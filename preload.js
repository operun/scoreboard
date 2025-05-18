// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  testConnection: () => ipcRenderer.invoke('test-connection'),
  loadMedia: () => ipcRenderer.invoke('load-media'),
  addMedia: (filePath) => ipcRenderer.invoke('add-media', filePath),
  deleteMedia: (id) => ipcRenderer.invoke('delete-media', id),
  updateMediaMeta: (data) => ipcRenderer.invoke('update-media-meta', data),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});
