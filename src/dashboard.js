class DashboardManager {
    constructor() {
        this.currentPage = 'overview';
        this.userData = null;
        this.notifications = [];
        this.uptime = { start: Date.now() };
        this.configPanels = new Map();
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupWindowControls();
        this.setupEventListeners();
        this.loadUserData();
        this.startUptimeCounter();
        this.setupAutomationSettings();
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
    }

    setupWindowControls() {
        document.getElementById('minimize-btn').addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });

        document.getElementById('maximize-btn').addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });

        document.getElementById('close-btn').addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            window.electronAPI.logout();
        });
    }

    setupEventListeners() {
        // Profile toggles
        document.getElementById('auto-giveaway-toggle').addEventListener('change', (e) => {
            this.updateSetting('autoGiveaway', e.target.checked);
        });

        document.getElementById('message-logger-toggle').addEventListener('change', (e) => {
            this.updateSetting('messageLogger', e.target.checked);
        });

        document.getElementById('anti-ghost-ping-toggle').addEventListener('change', (e) => {
            this.updateSetting('antiGhostPing', e.target.checked);
        });

        // Custom status
        document.getElementById('update-status-btn').addEventListener('click', () => {
            const status = document.getElementById('custom-status-input').value;
            const type = document.getElementById('status-type-select').value;
            this.updateCustomStatus(status, type);
        });

        document.getElementById('clear-status-btn').addEventListener('click', () => {
            this.clearCustomStatus();
        });

        // Notifications
        document.getElementById('clear-notifications-btn').addEventListener('click', () => {
            this.clearNotifications();
        });

        // Listen for Discord notifications
        window.electronAPI.onDiscordNotification((event, notification) => {
            this.addNotification(notification);
        });
    }

    setupAutomationSettings() {
        // Auto Giveaway
        const autoGiveawayToggle = document.getElementById('auto-giveaway-feature');
        const configureGiveawayBtn = document.getElementById('configure-giveaway-btn');
        const giveawayPanel = document.getElementById('giveaway-config-panel');

        autoGiveawayToggle.addEventListener('change', (e) => {
            this.updateAutomationSetting('giveaway', 'enabled', e.target.checked);
        });

        configureGiveawayBtn.addEventListener('click', () => {
            this.toggleConfigPanel('giveaway-config-panel');
        });

        // Giveaway configuration
        document.getElementById('giveaway-save-btn').addEventListener('click', () => {
            this.saveGiveawaySettings();
        });

        document.getElementById('giveaway-cancel-btn').addEventListener('click', () => {
            this.hideConfigPanel('giveaway-config-panel');
        });

        // AFK Auto Reply
        const afkToggle = document.getElementById('afk-auto-reply-feature');
        const configureAfkBtn = document.getElementById('configure-afk-btn');

        afkToggle.addEventListener('change', (e) => {
            this.updateAutomationSetting('afk', 'enabled', e.target.checked);
        });

        configureAfkBtn.addEventListener('click', () => {
            this.toggleConfigPanel('afk-config-panel');
        });

        // AFK configuration
        document.getElementById('afk-save-btn').addEventListener('click', () => {
            this.saveAFKSettings();
        });

        document.getElementById('afk-cancel-btn').addEventListener('click', () => {
            this.hideConfigPanel('afk-config-panel');
        });

        // Status Animation
        const statusToggle = document.getElementById('status-animation-feature');
        const configureStatusBtn = document.getElementById('configure-status-btn');

        statusToggle.addEventListener('change', (e) => {
            this.updateAutomationSetting('statusAnimation', 'enabled', e.target.checked);
        });

        configureStatusBtn.addEventListener('click', () => {
            this.toggleConfigPanel('status-config-panel');
            this.loadStatusMessages();
        });

        // Status animation configuration
        document.getElementById('status-save-btn').addEventListener('click', () => {
            this.saveStatusAnimationSettings();
        });

        document.getElementById('status-cancel-btn').addEventListener('click', () => {
            this.hideConfigPanel('status-config-panel');
        });

        document.getElementById('add-status-message-btn').addEventListener('click', () => {
            this.addStatusMessage();
        });
    }

    async updateAutomationSetting(feature, setting, value) {
        try {
            let result;
            
            if (feature === 'giveaway') {
                result = await window.electronAPI.invoke('discord-set-giveaway-settings', {
                    [setting]: value
                });
            } else if (feature === 'afk') {
                result = await window.electronAPI.invoke('discord-set-afk-settings', {
                    [setting]: value
                });
            } else if (feature === 'statusAnimation') {
                result = await window.electronAPI.invoke('discord-set-status-animation', {
                    [setting]: value
                });
            }

            if (result && result.success) {
                this.showToast('success', 'Settings Updated', `${feature} ${setting} updated successfully`);
            } else {
                throw new Error(result?.error || 'Unknown error');
            }
        } catch (error) {
            console.error(`Failed to update ${feature} ${setting}:`, error);
            this.showToast('error', 'Update Failed', `Failed to update ${feature}: ${error.message}`);
        }
    }

    async saveGiveawaySettings() {
        try {
            const settings = {
                enabled: document.getElementById('auto-giveaway-feature').checked,
                keywords: document.getElementById('giveaway-keywords').value.split(',').map(k => k.trim()).filter(k => k),
                reactionEmojis: document.getElementById('giveaway-emojis').value.split(',').map(e => e.trim()).filter(e => e),
                minDelay: parseInt(document.getElementById('giveaway-min-delay').value),
                maxDelay: parseInt(document.getElementById('giveaway-max-delay').value),
                maxPerHour: parseInt(document.getElementById('giveaway-max-hour').value),
                verifiedBotsOnly: document.getElementById('giveaway-verified-only').checked,
                requireKeywords: document.getElementById('giveaway-require-keywords').checked
            };

            const result = await window.electronAPI.invoke('discord-set-giveaway-settings', settings);
            
            if (result.success) {
                this.showToast('success', 'Settings Saved', 'Giveaway settings saved successfully');
                this.hideConfigPanel('giveaway-config-panel');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to save giveaway settings:', error);
            this.showToast('error', 'Save Failed', 'Failed to save giveaway settings');
        }
    }

    async saveAFKSettings() {
        try {
            const settings = {
                enabled: document.getElementById('afk-auto-reply-feature').checked,
                message: document.getElementById('afk-message').value,
                timeout: parseInt(document.getElementById('afk-timeout').value) * 60000, // Convert to milliseconds
                responseLimit: parseInt(document.getElementById('afk-response-limit').value),
                autoDetection: document.getElementById('afk-auto-detection').checked,
                aiEnabled: document.getElementById('afk-ai-enabled').checked
            };

            const result = await window.electronAPI.invoke('discord-set-afk-settings', settings);
            
            if (result.success) {
                this.showToast('success', 'Settings Saved', 'AFK settings saved successfully');
                this.hideConfigPanel('afk-config-panel');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to save AFK settings:', error);
            this.showToast('error', 'Save Failed', 'Failed to save AFK settings');
        }
    }

    async saveStatusAnimationSettings() {
        try {
            const messages = this.getStatusMessages();
            const settings = {
                enabled: document.getElementById('status-animation-feature').checked,
                interval: parseInt(document.getElementById('status-interval').value) * 1000, // Convert to milliseconds
                randomOrder: document.getElementById('status-random-order').checked,
                messages: messages
            };

            const result = await window.electronAPI.invoke('discord-set-status-animation', settings);
            
            if (result.success) {
                this.showToast('success', 'Settings Saved', 'Status animation settings saved successfully');
                this.hideConfigPanel('status-config-panel');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to save status animation settings:', error);
            this.showToast('error', 'Save Failed', 'Failed to save status animation settings');
        }
    }

    toggleConfigPanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel.style.display === 'none' || !panel.style.display) {
            this.showConfigPanel(panelId);
        } else {
            this.hideConfigPanel(panelId);
        }
    }

    showConfigPanel(panelId) {
        // Hide all other config panels
        document.querySelectorAll('.config-panel').forEach(panel => {
            if (panel.id !== panelId) {
                panel.style.display = 'none';
            }
        });

        const panel = document.getElementById(panelId);
        panel.style.display = 'block';
    }

    hideConfigPanel(panelId) {
        const panel = document.getElementById(panelId);
        panel.style.display = 'none';
    }

    loadStatusMessages() {
        const container = document.getElementById('status-messages-list');
        container.innerHTML = '';

        // Default messages
        const defaultMessages = [
            { text: 'Discord Self-Bot', type: 'PLAYING' },
            { text: 'with Lunii Dashboard', type: 'PLAYING' },
            { text: 'your messages', type: 'WATCHING' },
            { text: 'to music', type: 'LISTENING' }
        ];

        defaultMessages.forEach(message => {
            this.addStatusMessageItem(message.text, message.type);
        });
    }

    addStatusMessage() {
        this.addStatusMessageItem('', 'PLAYING');
    }

    addStatusMessageItem(text = '', type = 'PLAYING') {
        const container = document.getElementById('status-messages-list');
        const item = document.createElement('div');
        item.className = 'status-message-item';
        
        item.innerHTML = `
            <input type="text" placeholder="Status message" value="${text}">
            <select>
                <option value="PLAYING" ${type === 'PLAYING' ? 'selected' : ''}>Playing</option>
                <option value="WATCHING" ${type === 'WATCHING' ? 'selected' : ''}>Watching</option>
                <option value="LISTENING" ${type === 'LISTENING' ? 'selected' : ''}>Listening</option>
                <option value="STREAMING" ${type === 'STREAMING' ? 'selected' : ''}>Streaming</option>
            </select>
            <button class="status-message-remove" type="button">×</button>
        `;

        const removeBtn = item.querySelector('.status-message-remove');
        removeBtn.addEventListener('click', () => {
            item.remove();
        });

        container.appendChild(item);
    }

    getStatusMessages() {
        const items = document.querySelectorAll('.status-message-item');
        const messages = [];

        items.forEach(item => {
            const text = item.querySelector('input').value.trim();
            const type = item.querySelector('select').value;
            
            if (text) {
                messages.push({ text, type });
            }
        });

        return messages;
    }

    async updateSetting(setting, value) {
        try {
            const result = await window.electronAPI.updateDiscordSetting(setting, value);
            if (result.success) {
                console.log(`${setting} updated successfully`);
            } else {
                console.error(`Failed to update ${setting}:`, result.error);
                this.showToast('error', 'Update Failed', `Failed to update ${setting}`);
            }
        } catch (error) {
            console.error(`Failed to update ${setting}:`, error);
            this.showToast('error', 'Update Failed', `Failed to update ${setting}`);
        }
    }

    async updateCustomStatus(status, type) {
        try {
            await window.electronAPI.updateDiscordSetting('customStatus', status);
            await window.electronAPI.updateDiscordSetting('status', type);
            this.showToast('success', 'Status Updated', 'Custom status updated successfully');
        } catch (error) {
            console.error('Failed to update status:', error);
            this.showToast('error', 'Update Failed', 'Failed to update status');
        }
    }

    async clearCustomStatus() {
        try {
            await window.electronAPI.updateDiscordSetting('customStatus', '');
            document.getElementById('custom-status-input').value = '';
            this.showToast('success', 'Status Cleared', 'Custom status cleared successfully');
        } catch (error) {
            console.error('Failed to clear status:', error);
            this.showToast('error', 'Clear Failed', 'Failed to clear status');
        }
    }

    switchPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;

        // Load page-specific data
        this.loadPageData(page);
    }

    async loadPageData(page) {
        switch (page) {
            case 'friends':
                await this.loadFriends();
                break;
            case 'servers':
                await this.loadServers();
                break;
            case 'logs':
                await this.loadLogs();
                break;
        }
    }

    async loadUserData() {
        try {
            const userData = await window.electronAPI.getDiscordUserData();
            if (userData) {
                this.userData = userData;
                this.updateUserInterface();
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    updateUserInterface() {
        if (!this.userData) return;

        // Update greeting
        document.getElementById('user-greeting').textContent = this.userData.displayName || this.userData.username;

        // Update profile
        document.getElementById('user-display-name').textContent = this.userData.formattedName;
        document.getElementById('user-username').textContent = `@${this.userData.username}`;
        document.getElementById('user-avatar').src = this.userData.avatar;

        // Update stats
        document.getElementById('servers-count').textContent = this.userData.servers;
        document.getElementById('friends-count').textContent = this.userData.friends;

        // Update badges
        this.updateBadges();
        this.updateStats();
    }

    updateBadges() {
        const badgesContainer = document.getElementById('user-badges');
        badgesContainer.innerHTML = '';

        if (this.userData.badges && this.userData.badges.length > 0) {
            this.userData.badges.forEach(badge => {
                const badgeElement = document.createElement('span');
                badgeElement.className = 'badge';
                badgeElement.textContent = badge.replace('_', ' ');
                badgesContainer.appendChild(badgeElement);
            });
        }
    }

    updateStats() {
        // Update progress circles
        const serversProgress = document.getElementById('servers-progress');
        const friendsProgress = document.getElementById('friends-progress');

        if (serversProgress && friendsProgress) {
            const serversPercent = Math.min((this.userData.servers / 100) * 226, 226);
            const friendsPercent = Math.min((this.userData.friends / 1000) * 226, 226);

            serversProgress.style.strokeDashoffset = 226 - serversPercent;
            friendsProgress.style.strokeDashoffset = 226 - friendsPercent;
        }
    }

    startUptimeCounter() {
        setInterval(() => {
            const now = Date.now();
            const uptime = now - this.uptime.start;
            
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

            const display = document.getElementById('uptime-display');
            if (display) {
                display.innerHTML = `<span>${hours}</span>h <span>${minutes}</span>m <span>${seconds}</span>s`;
            }
        }, 1000);
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        this.updateNotificationsList();
        this.updateNotificationCount();
    }

    updateNotificationsList() {
        const container = document.getElementById('notifications-list');
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No notifications yet</p>
                    <span>You'll see mentions, giveaways, and other events here</span>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item">
                <div class="notification-header">
                    <span class="notification-title">${notification.title}</span>
                    <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                </div>
                <div class="notification-content">${notification.content}</div>
                <div class="notification-meta">
                    <span class="notification-type ${notification.type}">${notification.type}</span>
                    <span>${notification.guild || notification.channel}</span>
                </div>
            </div>
        `).join('');
    }

    updateNotificationCount() {
        const countElement = document.getElementById('notification-count');
        if (countElement) {
            countElement.textContent = this.notifications.length;
        }
    }

    clearNotifications() {
        this.notifications = [];
        this.updateNotificationsList();
        this.updateNotificationCount();
    }

    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    showToast(type, title, message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon ${type}">
                ${this.getToastIcon(type)}
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">×</button>
        `;

        // Add to container
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }

    getToastIcon(type) {
        const icons = {
            success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5z"/></svg>',
            error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
            warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
            info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>'
        };
        return icons[type] || icons.info;
    }

    async loadFriends() {
        // Implementation for loading friends
        console.log('Loading friends...');
    }

    async loadServers() {
        // Implementation for loading servers
        console.log('Loading servers...');
    }

    async loadLogs() {
        // Implementation for loading logs
        console.log('Loading logs...');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});