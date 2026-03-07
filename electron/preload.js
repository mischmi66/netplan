// Preload-Skript für Electron-Sicherheit
const { contextBridge } = require('electron');

// Exponiere nur notwendige APIs an das Renderer-Prozess
contextBridge.exposeInMainWorld('electron', {
  // Hier können später Electron-spezifische APIs hinzugefügt werden
  platform: process.platform,
  isProduction: process.env.NODE_ENV === 'production'
});