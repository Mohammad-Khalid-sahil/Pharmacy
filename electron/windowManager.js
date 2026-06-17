'use strict';

const path = require('path');
const { BrowserWindow, shell } = require('electron');
const log = require('electron-log');

async function createMainWindow(frontendUrl, startupError, iconPath) {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: iconPath,
    show: false,
    center: true,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: process.env.NODE_ENV === 'development'
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url)) {
      return;
    }

    if (/login$/i.test(url)) {
      event.preventDefault();
      mainWindow.loadURL(`${frontendUrl.replace(/#\/?$/, '')}#/login`);
      return;
    }

    log.warn('Blocked unexpected navigation', url);
  });

  mainWindow.webContents.on('did-start-loading', () => {
    log.info('Window started loading');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Window finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('Window failed to load', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (startupError) {
    log.error('Opening frontend after startup error.', startupError);
  }

  log.info('Loading frontend', frontendUrl);
  await mainWindow.loadURL(frontendUrl);

  return mainWindow;
}

module.exports = {
  createMainWindow
};
