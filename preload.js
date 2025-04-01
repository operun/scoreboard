// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  testConnection: () => ipcRenderer.invoke('test-connection'),
  loadMedia: () => ipcRenderer.invoke('load-media'),
  addMedia: () => ipcRenderer.invoke('add-media'),
  deleteMedia: (fileName) => ipcRenderer.invoke('delete-media', fileName),
  updateMediaMeta: (data) => ipcRenderer.invoke('update-media-meta', data),
});
