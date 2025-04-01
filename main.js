const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { ipcMain } = require('electron');

app.setName('Scoreboard');

const { saveEncryptedSettings } = require('./settingsStore');

ipcMain.handle('save-settings', async (event, settings) => {
  console.log('IPC-HANDLER: save-settings', settings);
  const filePath = path.join(app.getPath('userData'), 'settings.json');
  await saveEncryptedSettings(filePath, settings);
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
      nodeIntegration: false
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
