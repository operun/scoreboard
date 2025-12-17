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
  loadPlaylists: () => ipcRenderer.invoke('load-playlists'),
  savePlaylist: (playlist) => ipcRenderer.invoke('save-playlist', playlist),

  // Communication for Output Window
  onUpdateOutput: (callback) => {
    const subscription = (event, value) => callback(null, value);
    ipcRenderer.on('update-output', subscription);
    return () => ipcRenderer.removeListener('update-output', subscription);
  },

  // Command from Controller to Main
  triggerOutput: (media) => ipcRenderer.invoke('trigger-output', media),
});
