'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noktaDesktop', {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  }
});

contextBridge.exposeInMainWorld('pharmacyDb', {
  request: (args) => ipcRenderer.invoke('pharmacy-db:request', args)
});

contextBridge.exposeInMainWorld('auth', {
  login: (body) => ipcRenderer.invoke('auth:login', body)
});

contextBridge.exposeInMainWorld('pharmacyZoom', {
  get: () => ipcRenderer.invoke('pharmacy-zoom:get'),
  set: (factor) => ipcRenderer.invoke('pharmacy-zoom:set', factor)
});

contextBridge.exposeInMainWorld('pharmacyReport', {
  savePdf: (fileName) => ipcRenderer.invoke('pharmacy-report:save-pdf', fileName)
});
