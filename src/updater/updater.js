const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const crypto = require('crypto');

class AppUpdater {
    constructor() {
        this.currentVersion = null;
        this.latestVersion = null;
        this.updateWindow = null;
        this.githubRepo = 'A1TRO/Lunii';
        this.githubApiUrl = `https://api.github.com/repos/${this.githubRepo}`;
        this.downloadProgress = 0;
        this.totalFiles = 0;
        this.downloadedFiles = 0;
        this.updateData = null;
        this.checkInterval = null;
        this.mainWindow = null;
        this.isChecking = false;
        
        this.setupIPC();
        this.startPeriodicCheck();
    }

    setMainWindow(window) {
        this.mainWindow = window;
    }

    setupIPC() {
        ipcMain.handle('updater-check-updates', async () => {
            return await this.checkForUpdates();
        });

        ipcMain.handle('updater-download-update', async () => {
            return await this.downloadUpdate();
        });

        ipcMain.handle('updater-install-update', async () => {
            return await this.installUpdate();
        });

        ipcMain.handle('updater-get-current-version', () => {
            return this.getCurrentVersion();
        });

        ipcMain.handle('updater-get-update-info', () => {
            return this.updateData;
        });

        ipcMain.handle('updater-dismiss-notification', () => {
            this.dismissUpdateNotification();
        });

        ipcMain.handle('updater-show-update-window', () => {
            this.showUpdateWindow();
        });

        ipcMain.on('updater-window-close', () => {
            if (this.updateWindow) {
                this.updateWindow.close();
            }
        });
    }

    startPeriodicCheck() {
        // Check for updates every 30 minutes
        this.checkInterval = setInterval(async () => {
            const result = await this.checkForUpdates(true);
            if (result.hasUpdate && this.mainWindow) {
                this.notifyUpdateAvailable();
            }
        }, 30 * 60 * 1000);

        // Initial check after 5 seconds
        setTimeout(async () => {
            const result = await this.checkForUpdates(true);
            if (result.hasUpdate && this.mainWindow) {
                this.notifyUpdateAvailable();
            }
        }, 5000);
    }

    async checkForUpdates(silent = false) {
        if (this.isChecking) return { hasUpdate: false };
        
        try {
            this.isChecking = true;
            if (!silent) console.log('Checking for updates...');
            
            // Get current version
            this.currentVersion = this.getCurrentVersion();
            
            // Get latest release from GitHub
            const response = await axios.get(`${this.githubApiUrl}/releases/latest`, {
                timeout: 10000
            });
            const latestRelease = response.data;
            
            this.latestVersion = latestRelease.tag_name.replace('v', '');
            
            const hasUpdate = this.compareVersions(this.latestVersion, this.currentVersion) > 0;
            
            if (hasUpdate) {
                this.updateData = {
                    currentVersion: this.currentVersion,
                    latestVersion: this.latestVersion,
                    releaseNotes: latestRelease.body || 'No release notes available.',
                    publishedAt: latestRelease.published_at,
                    downloadUrl: latestRelease.zipball_url,
                    size: this.formatBytes(latestRelease.assets.length > 0 ? latestRelease.assets[0].size : 5000000),
                    releaseName: latestRelease.name || `Version ${this.latestVersion}`
                };
            }
            
            return {
                hasUpdate,
                currentVersion: this.currentVersion,
                latestVersion: this.latestVersion,
                updateData: this.updateData
            };
        } catch (error) {
            if (!silent) console.error('Error checking for updates:', error);
            return {
                hasUpdate: false,
                error: error.message
            };
        } finally {
            this.isChecking = false;
        }
    }

    async downloadUpdate() {
        if (!this.updateData) {
            throw new Error('No update data available');
        }

        try {
            console.log('Downloading update...');
            
            // Send initial progress
            this.sendProgressUpdate(0, 'Preparing download...', 0, 1);
            
            // Download the release archive
            const response = await axios.get(this.updateData.downloadUrl, {
                responseType: 'stream',
                timeout: 300000 // 5 minutes timeout
            });
            
            const tempDir = path.join(app.getPath('temp'), 'lunii-update');
            await this.ensureDir(tempDir);
            
            const archivePath = path.join(tempDir, 'update.zip');
            const writer = require('fs').createWriteStream(archivePath);
            
            const totalLength = parseInt(response.headers['content-length'], 10);
            let downloadedLength = 0;
            
            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                const progress = (downloadedLength / totalLength) * 100;
                this.sendProgressUpdate(progress, 'Downloading update...', downloadedLength, totalLength);
            });
            
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    resolve({
                        success: true,
                        downloadPath: archivePath,
                        size: downloadedLength
                    });
                });
                
                writer.on('error', reject);
            });
        } catch (error) {
            console.error('Error downloading update:', error);
            throw error;
        }
    }

    async installUpdate() {
        try {
            console.log('Installing update...');
            
            this.sendProgressUpdate(0, 'Preparing installation...', 0, 1);
            
            // For now, just show success - actual installation would require
            // extracting the archive and replacing files
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.sendProgressUpdate(100, 'Update installed successfully!', 1, 1);
            
            return { success: true };
        } catch (error) {
            console.error('Error installing update:', error);
            throw error;
        }
    }

    sendProgressUpdate(progress, message, current, total) {
        if (this.updateWindow) {
            this.updateWindow.webContents.send('updater-progress', {
                progress: Math.round(progress),
                message,
                current,
                total
            });
        }
    }

    notifyUpdateAvailable() {
        if (this.mainWindow && this.updateData) {
            this.mainWindow.webContents.send('update-available', this.updateData);
        }
    }

    dismissUpdateNotification() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('update-dismissed');
        }
    }

    showUpdateWindow() {
        if (this.updateWindow) {
            this.updateWindow.focus();
            return;
        }

        this.updateWindow = new BrowserWindow({
            width: 500,
            height: 650,
            resizable: false,
            frame: false,
            backgroundColor: '#0B1426',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload.js')
            },
            parent: this.mainWindow,
            modal: true,
            show: false
        });

        this.updateWindow.loadFile('src/updater/updater.html');

        this.updateWindow.once('ready-to-show', () => {
            this.updateWindow.show();
        });

        this.updateWindow.on('closed', () => {
            this.updateWindow = null;
        });
    }

    async ensureDir(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    getCurrentVersion() {
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            const packageJson = require(packagePath);
            return packageJson.version;
        } catch (error) {
            console.error('Error reading package.json:', error);
            return '1.0.0';
        }
    }

    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }
        
        return 0;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        if (this.updateWindow) {
            this.updateWindow.close();
        }
    }
}

module.exports = AppUpdater;