'use strict';

const { app, ipcMain, dialog } = require('electron');
const path = require('path');
const log = require('electron-log');
const { createMainWindow } = require('./windowManager');
const { getAppRoot, getFrontendUrl } = require('./startup');
const { LocalRepository } = require('./localRepository');
const { login } = require('./staticAuth');

let mainWindow = null;
let localRepository = null;

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
    log.info('userData:', app.getPath('userData'));
    log.info('userData:', app.getPath('userData'));

    try {
      const { default: Store } = await import('electron-store');
      const store = new Store();
      store.set('lastLaunchAt', new Date().toISOString());
    } catch (error) {
      log.warn('electron-store could not persist launch metadata', error);
    }

    try {
      localRepository = new LocalRepository(app.getPath('userData'));
      await localRepository.init();
      ipcMain.handle('auth:login', (_, body) => login(body.email, body.password));
      ipcMain.handle('pharmacy-db:request', (_event, args) => localRepository.request(args));
      ipcMain.handle('pharmacy-zoom:get', (event) => event.sender.getZoomFactor());
      ipcMain.handle('pharmacy-zoom:set', (event, factor) => {
        const nextFactor = Math.min(Math.max(Number(factor) || 1, 0.7), 1.3);
        event.sender.setZoomFactor(nextFactor);
        return nextFactor;
      });
      ipcMain.handle('pharmacy-report:save-pdf', async (event, defaultFileName = 'pharmacy-report.pdf') => {
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save PDF Report',
          defaultPath: defaultFileName,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
        if (canceled || !filePath) return { canceled: true };
        const pdf = await event.sender.printToPDF({
          printBackground: true,
          margins: { marginType: 'default' },
          pageSize: 'A4',
        });
        require('fs').writeFileSync(filePath, pdf);
        return { canceled: false, filePath };
      });

      mainWindow = await createMainWindow(getFrontendUrl(), undefined, path.join(getAppRoot(), 'icon.ico'));
    } catch (error) {
      log.error('Application startup failed', error);
      mainWindow = await createMainWindow(getFrontendUrl(), error, path.join(getAppRoot(), 'icon.ico'));
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', async () => {
    if (!mainWindow) {
      mainWindow = await createMainWindow(getFrontendUrl(), undefined, path.join(getAppRoot(), 'icon.ico'));
    }
  });

  app.on('before-quit', () => {
    log.info('Electron shutdown requested');
  });
}
