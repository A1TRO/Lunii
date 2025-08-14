const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const DiscordClient = require('./discord/client');
const AppUpdater = require('./updater/updater');

class LuniiApp {
    constructor() {
        this.mainWindow = null;
        this.splashWindow = null;
        this.loginWindow = null;
        this.discordClient = null;
        this.updater = null;
        this.isLoggedIn = false;
        this.userDataPath = app.getPath('userData');
        this.tokenPath = path.join(this.userDataPath, 'token.json');
        
        this.init();
    }

    init() {
        this.setupApp();
        this.setupIPC();
        this.initializeDiscordClient();
        this.initializeUpdater();
    }

    setupApp() {
        // Set app user model ID for Windows
        if (process.platform === 'win32') {
            app.setAppUserModelId('com.lunii.dashboard');
        }

        // Handle app events
        app.whenReady().then(() => {
            this.createSplashWindow();
            this.setupMenu();
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createSplashWindow();
            }
        });

        app.on('before-quit', () => {
            if (this.discordClient) {
                this.discordClient.logout();
            }
            if (this.updater) {
                this.updater.destroy();
            }
        });
    }

    setupIPC() {
        // Window controls
        ipcMain.on('window-minimize', (event) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window) window.minimize();
        });

        ipcMain.on('window-maximize', (event) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window) {
                if (window.isMaximized()) {
                    window.unmaximize();
                } else {
                    window.maximize();
                }
            }
        });

        ipcMain.on('window-close', (event) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window) window.close();
        });

        // Authentication
        ipcMain.handle('login', async (event, token, saveToken = false) => {
            try {
                const result = await this.discordClient.login(token);
                
                if (result.success) {
                    this.isLoggedIn = true;
                    
                    // Save token if requested
                    if (saveToken) {
                        await this.saveToken(token);
                    }
                    
                    // Close login window and show dashboard
                    if (this.loginWindow) {
                        this.loginWindow.close();
                        this.loginWindow = null;
                    }
                    
                    this.createMainWindow();
                }
                
                return result;
            } catch (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.on('logout', () => {
            this.logout();
        });

        // App info
        ipcMain.handle('get-app-version', () => {
            return app.getVersion();
        });

        // Splash screen
        ipcMain.on('splash-complete', () => {
            this.handleSplashComplete();
        });
    }

    initializeDiscordClient() {
        this.discordClient = new DiscordClient();
    }

    initializeUpdater() {
        this.updater = new AppUpdater();
    }

    createSplashWindow() {
        this.splashWindow = new BrowserWindow({
            width: 400,
            height: 500,
            frame: false,
            alwaysOnTop: true,
            transparent: true,
            backgroundColor: '#0B1426',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false
        });

        this.splashWindow.loadFile('src/splash.html');

        this.splashWindow.once('ready-to-show', () => {
            this.splashWindow.show();
        });

        this.splashWindow.on('closed', () => {
            this.splashWindow = null;
        });
    }

    async handleSplashComplete() {
        if (this.splashWindow) {
            this.splashWindow.close();
            this.splashWindow = null;
        }

        // Check for saved token
        const savedToken = await this.loadSavedToken();
        
        if (savedToken) {
            // Try to login with saved token
            try {
                const result = await this.discordClient.login(savedToken);
                if (result.success) {
                    this.isLoggedIn = true;
                    this.createMainWindow();
                    return;
                }
            } catch (error) {
                console.error('Auto-login failed:', error);
                // Remove invalid token
                await this.removeToken();
            }
        }

        // Show login window if no valid token
        this.createLoginWindow();
    }

    createLoginWindow() {
        this.loginWindow = new BrowserWindow({
            width: 500,
            height: 650,
            frame: false,
            resizable: false,
            backgroundColor: '#0B1426',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false
        });

        this.loginWindow.loadFile('src/login.html');

        this.loginWindow.once('ready-to-show', () => {
            this.loginWindow.show();
        });

        this.loginWindow.on('closed', () => {
            this.loginWindow = null;
            if (!this.isLoggedIn) {
                app.quit();
            }
        });
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1200,
            minHeight: 800,
            frame: false,
            backgroundColor: '#0B1426',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false
        });

        this.mainWindow.loadFile('src/dashboard.html');

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            // Set main window for updater
            if (this.updater) {
                this.updater.setMainWindow(this.mainWindow);
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
            this.isLoggedIn = false;
            
            if (this.discordClient) {
                this.discordClient.logout();
            }
        });

        // Handle window state changes
        this.mainWindow.on('maximize', () => {
            this.mainWindow.webContents.send('window-maximized');
        });

        this.mainWindow.on('unmaximize', () => {
            this.mainWindow.webContents.send('window-unmaximized');
        });
    }

    setupMenu() {
        // Create application menu (mainly for macOS)
        const template = [
            {
                label: 'Lunii',
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideothers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' }
                ]
            }
        ];

        if (process.platform === 'darwin') {
            const menu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(menu);
        } else {
            Menu.setApplicationMenu(null);
        }
    }

    async saveToken(token) {
        try {
            const tokenData = {
                token: token,
                savedAt: new Date().toISOString()
            };
            
            await fs.promises.writeFile(
                this.tokenPath, 
                JSON.stringify(tokenData, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Error saving token:', error);
        }
    }

    async loadSavedToken() {
        try {
            if (!fs.existsSync(this.tokenPath)) {
                return null;
            }
            
            const tokenData = JSON.parse(
                await fs.promises.readFile(this.tokenPath, 'utf8')
            );
            
            return tokenData.token;
        } catch (error) {
            console.error('Error loading saved token:', error);
            return null;
        }
    }

    async removeToken() {
        try {
            if (fs.existsSync(this.tokenPath)) {
                await fs.promises.unlink(this.tokenPath);
            }
        } catch (error) {
            console.error('Error removing token:', error);
        }
    }

    logout() {
        this.isLoggedIn = false;
        
        if (this.discordClient) {
            this.discordClient.logout();
        }
        
        if (this.mainWindow) {
            this.mainWindow.close();
            this.mainWindow = null;
        }
        
        // Remove saved token
        this.removeToken();
        
        // Show login window
        this.createLoginWindow();
    }
}

// Create and start the application
const luniiApp = new LuniiApp();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});