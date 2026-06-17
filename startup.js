'use strict';

const path = require('path');

const DEV_FRONTEND_URL = process.env.ELECTRON_START_URL || 'http://127.0.0.1:5173';

function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

function getAppRoot() {
  return isDevelopment() ? path.resolve(__dirname, '..') : process.resourcesPath;
}

function getFrontendUrl() {
  if (isDevelopment()) {
    return DEV_FRONTEND_URL;
  }

  const indexPath = path.join(process.resourcesPath, 'dist', 'index.html');
  return `file://${indexPath.replace(/\\/g, '/')}#/`;
}

module.exports = {
  isDevelopment,
  getAppRoot,
  getFrontendUrl
};
