const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const DiscordClient = require('./discord/client');
const AppUpdater = require('./updater/updater');
const fs = require('fs');

class LuniiApp {
  constructor() {
    this.mainWindow = null;
    this.splashWindow = null;
    this.isLoggedIn = false;
    this.discordClient = new DiscordClient();
    this.appUpdater = new AppUpdater();
    this.savedToken = this.loadSavedToken();
  }

  createSplashWindow() {
    this.splashWindow = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      alwaysOnTop: true,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      show: false
    });

    this.splashWindow.loadFile('src/splash.html');

    this.splashWindow.once('ready-to-show', () => {
      this.splashWindow.show();
      this.startSplashSequence();
    });
  }

  startSplashSequence() {
    const steps = [
      { progress: 20, message: 'Loading Discord client...' },
      { progress: 40, message: 'Initializing features...' },
      { progress: 60, message: 'Setting up automation...' },
      { progress: 80, message: 'Preparing dashboard...' },
      { progress: 100, message: 'Ready!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        this.splashWindow.webContents.send('splash-progress', steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.splashWindow.webContents.send('splash-complete');
          setTimeout(() => {
            this.createMainWindow();
            this.splashWindow.close();
          }, 1000);
        }, 500);
      }
    }, 800);
  }

  createMainWindow() {
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

    // Load login screen or dashboard based on saved token
    if (this.savedToken) {
      this.attemptAutoLogin();
    } else {
      this.mainWindow.loadFile('src/login.html');
    }

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

  async attemptAutoLogin() {
    try {
      const result = await this.discordClient.login(this.savedToken);
      if (result.success) {
        this.isLoggedIn = true;
        this.mainWindow.loadFile('src/dashboard.html');
      } else {
        // Auto-login failed, clear saved token and show login
        this.clearSavedToken();
        this.mainWindow.loadFile('src/login.html');
      }
    } catch (error) {
      console.error('Auto-login failed:', error);
      this.clearSavedToken();
      this.mainWindow.loadFile('src/login.html');
    }
  }

  loadSavedToken() {
    try {
      const tokenPath = path.join(app.getPath('userData'), 'token.json');
      if (fs.existsSync(tokenPath)) {
        const data = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        return data.token;
      }
    } catch (error) {
      console.error('Error loading saved token:', error);
    }
    return null;
  }

  saveToken(token) {
    try {
      const tokenPath = path.join(app.getPath('userData'), 'token.json');
      fs.writeFileSync(tokenPath, JSON.stringify({ token }));
      this.savedToken = token;
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  clearSavedToken() {
    try {
      const tokenPath = path.join(app.getPath('userData'), 'token.json');
      if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
      }
      this.savedToken = null;
    } catch (error) {
      console.error('Error clearing saved token:', error);
    }
  }
  setupIPC() {
    // Handle login
    ipcMain.handle('login', async (event, token, saveToken = false) => {
      try {
        console.log('Login attempt with token:', token.substring(0, 10) + '...');
        
        // Attempt Discord login
        const result = await this.discordClient.login(token);
        
        if (result.success) {
          this.isLoggedIn = true;
          
          // Save token if requested
          if (saveToken) {
            this.saveToken(token);
          }
          
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
      this.clearSavedToken();
      this.discordClient.logout();
      this.mainWindow.loadFile('src/login.html');
    });

    // Handle app version request
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
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
      this.createSplashWindow();
      this.setupIPC();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createSplashWindow();
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