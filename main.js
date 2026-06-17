'use strict';

const { app } = require('electron');
const log = require('electron-log');
const { createMainWindow } = require('./windowManager');
const { getFrontendUrl } = require('./startup');

let mainWindow = null;

log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

app.setName('Pharmacy');

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    log.info('Electron startup', {
      packaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
      userData: app.getPath('userData')
    });

    try {
      const { default: Store } = await import('electron-store');
      const store = new Store();
      store.set('lastLaunchAt', new Date().toISOString());
    } catch (error) {
      log.warn('electron-store could not persist launch metadata', error);
    }

    try {
      mainWindow = await createMainWindow(getFrontendUrl());
    } catch (error) {
      log.error('Application startup failed', error);
      mainWindow = await createMainWindow(getFrontendUrl(), error);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', async () => {
    if (!mainWindow) {
      mainWindow = await createMainWindow(getFrontendUrl());
    }
  });

  app.on('before-quit', () => {
    log.info('Electron shutdown requested');
  });
}
