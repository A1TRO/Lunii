const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const DiscordClient = require('./discord/client');
const AppUpdater = require('./updater/updater');

class LuniiApp {
  constructor() {
    this.mainWindow = null;
    this.isLoggedIn = false;
    this.discordClient = new DiscordClient();
    this.appUpdater = new AppUpdater();
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 1000,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false
      },
      frame: false,
      backgroundColor: '#0B1426',
      show: false,
      icon: path.join(__dirname, '../assets/lunii-icon.png')
    });

    // Load login screen initially
    this.mainWindow.loadFile('src/login.html');

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Set main window for updater and check for updates
      this.appUpdater.setMainWindow(this.mainWindow);
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Remove menu bar
    Menu.setApplicationMenu(null);
  }

  setupIPC() {
    // Handle login
    ipcMain.handle('login', async (event, token) => {
      try {
        console.log('Login attempt with token:', token.substring(0, 10) + '...');
        
        // Attempt Discord login
        const result = await this.discordClient.login(token);
        
        if (result.success) {
          this.isLoggedIn = true;
          // Load main dashboard
          this.mainWindow.loadFile('src/dashboard.html');
        }
        
        return result;
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle window controls
    ipcMain.on('window-minimize', () => {
      this.mainWindow.minimize();
    });

    ipcMain.on('window-maximize', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.on('window-close', () => {
      this.mainWindow.close();
    });

    // Handle logout
    ipcMain.on('logout', () => {
      this.isLoggedIn = false;
      this.discordClient.logout();
      this.mainWindow.loadFile('src/login.html');
    });

    // Handle app restart
    ipcMain.handle('app-restart', () => {
      app.relaunch();
      app.exit();
    });

    // Forward Discord IPC calls to the Discord client
    // The Discord client handles its own IPC setup
  }

  init() {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIPC();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.appUpdater.destroy();
        app.quit();
      }
    });
  }
}

const luniiApp = new LuniiApp();
luniiApp.init();