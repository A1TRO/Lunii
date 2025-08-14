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
        this.githubRepo = 'your-username/lunii'; // Replace with actual repo
        this.githubApiUrl = `https://api.github.com/repos/${this.githubRepo}`;
        this.downloadProgress = 0;
        this.totalFiles = 0;
        this.downloadedFiles = 0;
        this.updateData = null;
        
        this.setupIPC();
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
    }

    async checkForUpdates() {
        try {
            console.log('Checking for updates...');
            
            // Get current version
            this.currentVersion = this.getCurrentVersion();
            
            // Get latest release from GitHub
            const response = await axios.get(`${this.githubApiUrl}/releases/latest`);
            const latestRelease = response.data;
            
            this.latestVersion = latestRelease.tag_name.replace('v', '');
            
            const hasUpdate = this.compareVersions(this.latestVersion, this.currentVersion) > 0;
            
            if (hasUpdate) {
                this.updateData = {
                    currentVersion: this.currentVersion,
                    latestVersion: this.latestVersion,
                    releaseNotes: latestRelease.body,
                    publishedAt: latestRelease.published_at,
                    downloadUrl: latestRelease.zipball_url,
                    size: latestRelease.assets.length > 0 ? latestRelease.assets[0].size : 0
                };
            }
            
            return {
                hasUpdate,
                currentVersion: this.currentVersion,
                latestVersion: this.latestVersion,
                updateData: this.updateData
            };
        } catch (error) {
            console.error('Error checking for updates:', error);
            return {
                hasUpdate: false,
                error: error.message
            };
        }
    }

    async downloadUpdate() {
        if (!this.updateData) {
            throw new Error('No update data available');
        }

        try {
            console.log('Downloading update...');
            
            // Get all files from the repository
            const filesResponse = await axios.get(`${this.githubApiUrl}/contents`, {
                params: { ref: `v${this.latestVersion}` }
            });
            
            const filesToUpdate = await this.getFilesToUpdate(filesResponse.data);
            this.totalFiles = filesToUpdate.length;
            this.downloadedFiles = 0;
            
            // Create temp directory for update
            const tempDir = path.join(app.getPath('temp'), 'lunii-update');
            await this.ensureDir(tempDir);
            
            // Download each file
            for (const file of filesToUpdate) {
                await this.downloadFile(file, tempDir);
                this.downloadedFiles++;
                this.downloadProgress = (this.downloadedFiles / this.totalFiles) * 100;
                
                // Send progress update
                if (this.updateWindow) {
                    this.updateWindow.webContents.send('updater-progress', {
                        progress: this.downloadProgress,
                        currentFile: file.name,
                        downloadedFiles: this.downloadedFiles,
                        totalFiles: this.totalFiles
                    });
                }
            }
            
            return {
                success: true,
                downloadPath: tempDir,
                filesDownloaded: this.downloadedFiles
            };
        } catch (error) {
            console.error('Error downloading update:', error);
            throw error;
        }
    }

    async getFilesToUpdate(repoFiles) {
        const filesToUpdate = [];
        
        for (const file of repoFiles) {
            if (file.type === 'file') {
                // Check if file needs updating
                const localPath = path.join(process.cwd(), file.path);
                const needsUpdate = await this.fileNeedsUpdate(localPath, file.sha);
                
                if (needsUpdate) {
                    filesToUpdate.push(file);
                }
            } else if (file.type === 'dir') {
                // Recursively check directory
                const dirResponse = await axios.get(file.url);
                const subFiles = await this.getFilesToUpdate(dirResponse.data);
                filesToUpdate.push(...subFiles);
            }
        }
        
        return filesToUpdate;
    }

    async fileNeedsUpdate(localPath, remoteSha) {
        try {
            const stats = await fs.stat(localPath);
            if (!stats.isFile()) return true;
            
            const content = await fs.readFile(localPath);
            const localSha = crypto.createHash('sha1')
                .update(`blob ${content.length}\0${content}`)
                .digest('hex');
            
            return localSha !== remoteSha;
        } catch (error) {
            // File doesn't exist locally, needs to be downloaded
            return true;
        }
    }

    async downloadFile(file, tempDir) {
        const response = await axios.get(file.download_url, {
            responseType: 'arraybuffer'
        });
        
        const filePath = path.join(tempDir, file.path);
        await this.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, response.data);
    }

    async installUpdate() {
        try {
            console.log('Installing update...');
            
            const tempDir = path.join(app.getPath('temp'), 'lunii-update');
            const appDir = process.cwd();
            
            // Copy files from temp to app directory
            await this.copyDirectory(tempDir, appDir);
            
            // Clean up temp directory
            await this.removeDirectory(tempDir);
            
            return { success: true };
        } catch (error) {
            console.error('Error installing update:', error);
            throw error;
        }
    }

    async copyDirectory(src, dest) {
        const entries = await fs.readdir(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await this.ensureDir(destPath);
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    async removeDirectory(dir) {
        try {
            await fs.rmdir(dir, { recursive: true });
        } catch (error) {
            console.error('Error removing directory:', error);
        }
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

    showUpdateWindow(updateData) {
        if (this.updateWindow) {
            this.updateWindow.focus();
            return;
        }

        this.updateWindow = new BrowserWindow({
            width: 500,
            height: 600,
            resizable: false,
            frame: false,
            backgroundColor: '#0B1426',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            parent: BrowserWindow.getFocusedWindow(),
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

    async checkAndShowUpdates() {
        const updateCheck = await this.checkForUpdates();
        
        if (updateCheck.hasUpdate) {
            this.showUpdateWindow(updateCheck.updateData);
            return true;
        }
        
        return false;
    }
}

module.exports = AppUpdater;