// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
});
