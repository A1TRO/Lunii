const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // Authentication
  login: (token) => ipcRenderer.invoke('login', token),
  logout: () => ipcRenderer.send('logout'),
  
  // Discord API
  getDiscordUserData: () => ipcRenderer.invoke('discord-get-user-data'),
  getDiscordStats: () => ipcRenderer.invoke('discord-get-stats'),
  updateDiscordSetting: (setting, value) => ipcRenderer.invoke('discord-update-setting', setting, value),
  
  // Event listeners
  onDiscordNotification: (callback) => {
    ipcRenderer.on('discord-notification', callback);
  },
  
  // Update system
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', callback);
  },
  
  onUpdateDismissed: (callback) => {
    ipcRenderer.on('update-dismissed', callback);
  },
  
  onUpdaterProgress: (callback) => {
    ipcRenderer.on('updater-progress', callback);
  },
  
  // Send events
  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },
  
  // Invoke methods
  invoke: (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});