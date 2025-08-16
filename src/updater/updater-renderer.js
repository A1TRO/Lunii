class UpdaterRenderer {
    constructor() {
        this.currentScreen = 'update-available-screen';
        this.updateData = null;
        this.downloadStartTime = null;
        this.lastDownloaded = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUpdateData();
    }

    setupEventListeners() {
        // Window controls
        document.getElementById('close-btn').addEventListener('click', () => {
            window.electronAPI.send('updater-window-close');
        });

        // Update actions
        document.getElementById('later-btn').addEventListener('click', () => {
            window.electronAPI.send('updater-window-close');
        });

        document.getElementById('download-btn').addEventListener('click', () => {
            this.startDownload();
        });

        document.getElementById('restart-later-btn').addEventListener('click', () => {
            window.electronAPI.send('updater-window-close');
        });

        document.getElementById('restart-now-btn').addEventListener('click', () => {
            this.restartApp();
        });

        // Listen for progress updates
        window.electronAPI.onUpdaterProgress((event, data) => {
            this.updateProgress(data);
        });
    }

    async loadUpdateData() {
        try {
            this.updateData = await window.electronAPI.invoke('updater-get-update-info');
            if (this.updateData) {
                this.populateUpdateInfo();
            }
        } catch (error) {
            console.error('Error loading update data:', error);
        }
    }

    populateUpdateInfo() {
        if (!this.updateData) return;

        // Update version info
        document.getElementById('current-version').textContent = this.updateData.currentVersion;
        document.getElementById('new-version').textContent = this.updateData.latestVersion;
        document.getElementById('release-name').textContent = this.updateData.releaseName;
        document.getElementById('download-size').textContent = this.updateData.size;
        
        // Format publish date
        const publishDate = new Date(this.updateData.publishedAt);
        document.getElementById('publish-date').textContent = this.formatDate(publishDate);
        
        // Update release notes
        const notesElement = document.getElementById('release-notes');
        notesElement.innerHTML = this.formatReleaseNotes(this.updateData.releaseNotes);
    }

    formatDate(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        
        return date.toLocaleDateString();
    }

    formatReleaseNotes(notes) {
        if (!notes || notes.trim() === '') {
            return '<p>No release notes available.</p>';
        }
        
        // Convert markdown-like formatting to HTML
        let formatted = notes
            .replace(/^### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^## (.*$)/gim, '<h3>$1</h3>')
            .replace(/^# (.*$)/gim, '<h2>$1</h2>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Wrap in paragraphs and handle lists
        if (formatted.includes('<li>')) {
            formatted = formatted.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
        }
        
        if (!formatted.startsWith('<h') && !formatted.startsWith('<ul>')) {
            formatted = '<p>' + formatted + '</p>';
        }
        
        return formatted;
    }

    async startDownload() {
        this.switchScreen('download-progress-screen');
        this.downloadStartTime = Date.now();
        this.lastDownloaded = 0;
        
        try {
            const result = await window.electronAPI.invoke('updater-download-update');
            if (result.success) {
                // Small delay to show completion
                setTimeout(() => {
                    this.startInstallation();
                }, 1000);
            }
        } catch (error) {
            console.error('Download failed:', error);
            this.showError('Download failed: ' + error.message);
        }
    }

    async startInstallation() {
        this.updateProgress({
            progress: 0,
            message: 'Installing update...',
            current: 0,
            total: 1
        });
        
        try {
            const result = await window.electronAPI.invoke('updater-install-update');
            if (result.success) {
                setTimeout(() => {
                    this.switchScreen('installation-screen');
                }, 1000);
            }
        } catch (error) {
            console.error('Installation failed:', error);
            this.showError('Installation failed: ' + error.message);
        }
    }

    updateProgress(data) {
        const { progress, message, current, total } = data;
        
        // Update progress bar
        const progressFill = document.getElementById('progress-fill');
        progressFill.style.width = progress + '%';
        
        // Update progress text
        document.getElementById('progress-percent').textContent = progress + '%';
        document.getElementById('progress-message').textContent = message;
        
        // Update size info
        if (current && total) {
            const currentMB = (current / (1024 * 1024)).toFixed(1);
            const totalMB = (total / (1024 * 1024)).toFixed(1);
            document.getElementById('progress-size').textContent = `${currentMB} / ${totalMB} MB`;
        }
        
        // Calculate and update speed
        if (this.downloadStartTime && current > this.lastDownloaded) {
            const elapsed = (Date.now() - this.downloadStartTime) / 1000;
            const speed = (current - this.lastDownloaded) / elapsed;
            document.getElementById('download-speed').textContent = this.formatSpeed(speed);
            this.lastDownloaded = current;
        }
        
        // Update status
        document.getElementById('download-status').textContent = 
            progress === 100 ? 'Complete' : 'Downloading...';
    }

    formatSpeed(bytesPerSecond) {
        if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s';
        if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
        return (bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s';
    }

    switchScreen(screenId) {
        const currentScreenEl = document.getElementById(this.currentScreen);
        const newScreenEl = document.getElementById(screenId);
        
        if (currentScreenEl) {
            currentScreenEl.classList.remove('active');
            currentScreenEl.classList.add('slide-out');
        }
        
        setTimeout(() => {
            if (currentScreenEl) {
                currentScreenEl.classList.remove('slide-out');
            }
            newScreenEl.classList.add('active');
            this.currentScreen = screenId;
        }, 200);
    }

    showError(message) {
        // For now, just log the error
        // In a real implementation, you might want to show an error screen
        console.error(message);
        alert(message);
    }

    async restartApp() {
        try {
            await window.electronAPI.invoke('app-restart');
        } catch (error) {
            console.error('Failed to restart app:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UpdaterRenderer();
});

// Add some visual enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effects to buttons
    const buttons = document.querySelectorAll('.update-btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add click ripple effect
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
    
    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});