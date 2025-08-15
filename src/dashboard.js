class DashboardManager {
    constructor() {
        this.currentPage = 'overview';
        this.userData = null;
        this.stats = null;
        this.notifications = [];
        this.uptimeInterval = null;
        this.configModals = new Map();
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupWindowControls();
        this.setupEventListeners();
        this.loadUserData();
        this.startUptimeCounter();
        this.setupNotificationListener();
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
        // Custom status
        document.getElementById('update-status-btn').addEventListener('click', () => {
            this.updateCustomStatus();
        });

        document.getElementById('clear-status-btn').addEventListener('click', () => {
            this.clearCustomStatus();
        });

        // Toggle switches
        document.getElementById('auto-giveaway-toggle').addEventListener('change', (e) => {
            this.updateSetting('autoGiveaway', e.target.checked);
        });

        document.getElementById('message-logger-toggle').addEventListener('change', (e) => {
            this.updateSetting('messageLogger', e.target.checked);
        });

        document.getElementById('anti-ghost-ping-toggle').addEventListener('change', (e) => {
            this.updateSetting('antiGhostPing', e.target.checked);
        });

        // Automation features
        document.getElementById('auto-giveaway-feature').addEventListener('change', (e) => {
            this.updateFeatureSetting('autoGiveaway.enabled', e.target.checked);
        });

        document.getElementById('afk-auto-reply-feature').addEventListener('change', (e) => {
            this.updateFeatureSetting('afkAutoReply.enabled', e.target.checked);
        });

        document.getElementById('status-animation-feature').addEventListener('change', (e) => {
            this.updateFeatureSetting('statusAnimation.enabled', e.target.checked);
        });
        
        document.getElementById('ai-auto-talk-feature').addEventListener('change', (e) => {
            this.updateFeatureSetting('aiAutoTalk.enabled', e.target.checked);
        });

        // Configuration buttons
        document.querySelectorAll('.config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.feature-card');
                const feature = this.getFeatureFromCard(card);
                this.showConfigModal(feature);
            });
        });

        // Friends refresh
        document.getElementById('refresh-friends-btn').addEventListener('click', () => {
            this.loadFriends();
        });

        // Servers refresh
        document.getElementById('refresh-servers-btn').addEventListener('click', () => {
            this.loadServers();
        });

        // Backup functionality
        document.getElementById('create-backup-btn').addEventListener('click', () => {
            this.createServerBackup();
        });

        document.getElementById('clone-server-btn').addEventListener('click', () => {
            this.cloneServer();
        });

        // Settings
        document.getElementById('save-gemini-settings').addEventListener('click', () => {
            this.saveGeminiSettings();
        });

        document.getElementById('test-gemini-connection').addEventListener('click', () => {
            this.testGeminiConnection();
        });
    }

    async loadUserData() {
        try {
            this.userData = await window.electronAPI.getDiscordUserData();
            this.stats = await window.electronAPI.getDiscordStats();
            
            if (this.userData) {
                this.updateUserInterface();
                this.loadFriends();
                this.loadServers();
                this.loadConfig();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async loadConfig() {
        try {
            const config = await window.electronAPI.invoke('discord-get-config');
            this.updateConfigInterface(config);
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    updateConfigInterface(config) {
        // Update toggle states
        if (config.autoGiveaway) {
            document.getElementById('auto-giveaway-feature').checked = config.autoGiveaway.enabled;
        }
        if (config.afkAutoReply) {
            document.getElementById('afk-auto-reply-feature').checked = config.afkAutoReply.enabled;
        }
        if (config.statusAnimation) {
            document.getElementById('status-animation-feature').checked = config.statusAnimation.enabled;
        }
        if (config.aiAutoTalk) {
            document.getElementById('ai-auto-talk-feature').checked = config.aiAutoTalk.enabled;
        }
    }

    updateUserInterface() {
        if (!this.userData) return;

        // Update greeting
        document.getElementById('user-greeting').textContent = this.userData.displayName || this.userData.username;

        // Update profile info
        document.getElementById('user-display-name').textContent = this.userData.formattedName;
        document.getElementById('user-username').textContent = `@${this.userData.username}`;
        document.getElementById('user-avatar').src = this.userData.avatar;

        // Update status indicator
        const statusIndicator = document.getElementById('status-indicator');
        statusIndicator.className = `status-indicator ${this.userData.status}`;

        // Update connection status
        document.getElementById('connection-status').textContent = 'Connected';

        // Update stats
        if (this.stats) {
            document.getElementById('servers-count').textContent = this.stats.guilds.length;
            document.getElementById('friends-count').textContent = this.stats.friends.length;
            document.getElementById('commands-used').textContent = this.stats.commandsUsed;

            // Update progress circles
            this.updateProgressCircle('servers-progress', this.stats.guilds.length, 100);
            this.updateProgressCircle('friends-progress', this.stats.friends.length, 1000);
        }

        // Update badges
        this.updateUserBadges();
    }

    updateProgressCircle(elementId, value, max) {
        const circle = document.getElementById(elementId);
        const percentage = Math.min((value / max) * 100, 100);
        const circumference = 2 * Math.PI * 36; // radius = 36
        const offset = circumference - (percentage / 100) * circumference;
        
        circle.style.strokeDashoffset = offset;
    }

    updateUserBadges() {
        const badgesContainer = document.getElementById('user-badges');
        badgesContainer.innerHTML = '';

        if (this.userData.badges) {
            this.userData.badges.forEach(badge => {
                const badgeElement = document.createElement('span');
                badgeElement.className = 'badge';
                badgeElement.textContent = badge.replace('_', ' ');
                badgesContainer.appendChild(badgeElement);
            });
        }
    }

    async loadFriends() {
        try {
            const friends = await window.electronAPI.getFriends();
            this.displayFriends(friends);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    displayFriends(friends) {
        const friendsList = document.getElementById('friends-list');
        
        if (friends.length === 0) {
            friendsList.innerHTML = '<div class="empty-state"><p>No friends found</p></div>';
            return;
        }

        friendsList.innerHTML = friends.map(friend => `
            <div class="friend-item">
                <div class="friend-avatar">
                    ${friend.avatar ? 
                        `<img src="${friend.avatar}" alt="${friend.username}">` :
                        `<div class="friend-avatar-placeholder">${friend.username.charAt(0).toUpperCase()}</div>`
                    }
                    <div class="friend-status-indicator ${friend.status || 'offline'}"></div>
                </div>
                <div class="friend-info">
                    <div class="friend-name">${friend.displayName || friend.username}</div>
                    <div class="friend-status">
                        <span class="friend-status-text">${friend.status || 'offline'}</span>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="friend-action-btn message" title="Send Message">💬</button>
                </div>
            </div>
        `).join('');
    }

    async loadServers() {
        try {
            const servers = await window.electronAPI.getServers();
            this.displayServers(servers);
        } catch (error) {
            console.error('Error loading servers:', error);
        }
    }

    displayServers(servers) {
        const serversGrid = document.getElementById('servers-grid');
        
        if (servers.length === 0) {
            serversGrid.innerHTML = '<div class="empty-state"><p>No servers found</p></div>';
            return;
        }

        serversGrid.innerHTML = servers.map(server => `
            <div class="server-item" data-server-id="${server.id}">
                <div class="server-header">
                    <div class="server-icon">
                        ${server.icon ? 
                            `<img src="${server.icon}" alt="${server.name}">` :
                            server.name.charAt(0).toUpperCase()
                        }
                    </div>
                    <div class="server-info">
                        <h3>${server.name}</h3>
                        <p>${server.memberCount} members</p>
                    </div>
                </div>
                <div class="server-stats">
                    <span>Channels: ${server.channels?.length || 0}</span>
                    <span>Roles: ${server.roles?.length || 0}</span>
                </div>
            </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.server-item').forEach(item => {
            item.addEventListener('click', () => {
                const serverId = item.dataset.serverId;
                this.showServerDetails(serverId);
            });
        });
    }

    async showServerDetails(serverId) {
        try {
            const details = await window.electronAPI.getServerDetails(serverId);
            // Implementation for showing server details
            console.log('Server details:', details);
        } catch (error) {
            console.error('Error loading server details:', error);
        }
    }

    async updateCustomStatus() {
        const statusInput = document.getElementById('custom-status-input');
        const statusType = document.getElementById('status-type-select').value;
        const status = statusInput.value.trim();

        try {
            const result = await window.electronAPI.invoke('discord-set-custom-status', status, statusType);
            if (result.success) {
                this.showToast('Status updated successfully', 'success');
            } else {
                this.showToast('Failed to update status: ' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('Error updating status: ' + error.message, 'error');
        }
    }

    async clearCustomStatus() {
        try {
            const result = await window.electronAPI.invoke('discord-set-custom-status', null);
            if (result.success) {
                document.getElementById('custom-status-input').value = '';
                this.showToast('Status cleared', 'success');
            }
        } catch (error) {
            this.showToast('Error clearing status: ' + error.message, 'error');
        }
    }

    async updateSetting(setting, value) {
        try {
            await window.electronAPI.updateDiscordSetting(setting, value);
        } catch (error) {
            console.error('Error updating setting:', error);
        }
    }

    async updateFeatureSetting(key, value) {
        try {
            await window.electronAPI.invoke('discord-set-config', key, value);
            this.showToast(`${key} ${value ? 'enabled' : 'disabled'}`, 'success');
        } catch (error) {
            console.error('Error updating feature setting:', error);
            this.showToast('Error updating setting', 'error');
        }
    }

    getFeatureFromCard(card) {
        const title = card.querySelector('h4').textContent;
        if (title.includes('Giveaway')) return 'autoGiveaway';
        if (title.includes('AFK')) return 'afkAutoReply';
        if (title.includes('Status')) return 'statusAnimation';
        if (title.includes('AI Talk')) return 'aiAutoTalk';
        if (title.includes('RPC')) return 'customRPC';
        return null;
    }

    async showConfigModal(feature) {
        if (!feature) return;

        try {
            const config = await window.electronAPI.invoke('discord-get-config', feature);
            
            switch (feature) {
                case 'autoGiveaway':
                    this.showAutoGiveawayConfig(config);
                    break;
                case 'afkAutoReply':
                    this.showAFKConfig(config);
                    break;
                case 'statusAnimation':
                    this.showStatusAnimationConfig(config);
                    break;
                case 'aiAutoTalk':
                    this.showAIAutoTalkConfig(config);
                    break;
                case 'customRPC':
                    this.showCustomRPCConfig(config);
                    break;
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    showAutoGiveawayConfig(config) {
        const modal = Modal.prompt({
            title: 'Auto Giveaway Configuration',
            message: 'Configure automatic giveaway joining settings',
            multiline: true,
            defaultValue: JSON.stringify(config, null, 2),
            confirmText: 'Save',
            cancelText: 'Cancel'
        });

        modal.then(result => {
            if (result) {
                try {
                    const newConfig = JSON.parse(result);
                    window.electronAPI.invoke('discord-configure-auto-giveaway', newConfig);
                    this.showToast('Auto Giveaway config saved', 'success');
                } catch (error) {
                    this.showToast('Invalid JSON configuration', 'error');
                }
            }
        });
    }

    showAFKConfig(config) {
        const modal = Modal.prompt({
            title: 'AFK Auto-Reply Configuration',
            message: 'Configure AFK auto-reply settings',
            multiline: true,
            defaultValue: JSON.stringify(config, null, 2),
            confirmText: 'Save',
            cancelText: 'Cancel'
        });

        modal.then(result => {
            if (result) {
                try {
                    const newConfig = JSON.parse(result);
                    window.electronAPI.invoke('discord-configure-afk-auto-reply', newConfig);
                    this.showToast('AFK Auto-Reply config saved', 'success');
                } catch (error) {
                    this.showToast('Invalid JSON configuration', 'error');
                }
            }
        });
    }

    showStatusAnimationConfig(config) {
        const modal = Modal.prompt({
            title: 'Status Animation Configuration',
            message: 'Configure status animation settings',
            multiline: true,
            defaultValue: JSON.stringify(config, null, 2),
            confirmText: 'Save',
            cancelText: 'Cancel'
        });

        modal.then(result => {
            if (result) {
                try {
                    const newConfig = JSON.parse(result);
                    window.electronAPI.invoke('discord-configure-status-animation', newConfig);
                    this.showToast('Status Animation config saved', 'success');
                } catch (error) {
                    this.showToast('Invalid JSON configuration', 'error');
                }
            }
        });
    }

    showAIAutoTalkConfig(config) {
        const modal = Modal.prompt({
            title: 'AI Auto Talk Configuration',
            message: 'Configure AI auto talk settings',
            multiline: true,
            defaultValue: JSON.stringify(config, null, 2),
            confirmText: 'Save',
            cancelText: 'Cancel'
        });

        modal.then(result => {
            if (result) {
                try {
                    const newConfig = JSON.parse(result);
                    window.electronAPI.invoke('discord-configure-ai-auto-talk', newConfig);
                    this.showToast('AI Auto Talk config saved', 'success');
                } catch (error) {
                    this.showToast('Invalid JSON configuration', 'error');
                }
            }
        });
    }

    showCustomRPCConfig(config) {
        const modal = Modal.prompt({
            title: 'Custom RPC Configuration',
            message: 'Configure Discord Rich Presence settings',
            multiline: true,
            defaultValue: JSON.stringify(config, null, 2),
            confirmText: 'Save',
            cancelText: 'Cancel'
        });

        modal.then(result => {
            if (result) {
                try {
                    const newConfig = JSON.parse(result);
                    window.electronAPI.invoke('discord-configure-custom-rpc', newConfig);
                    this.showToast('Custom RPC config saved', 'success');
                } catch (error) {
                    this.showToast('Invalid JSON configuration', 'error');
                }
            }
        });
    }

    async createServerBackup() {
        const serverSelect = document.getElementById('backup-server-select');
        const serverId = serverSelect.value;
        
        if (!serverId) {
            this.showToast('Please select a server to backup', 'warning');
            return;
        }

        const options = {
            channels: document.getElementById('backup-channels').checked,
            roles: document.getElementById('backup-roles').checked,
            emojis: document.getElementById('backup-emojis').checked,
            settings: document.getElementById('backup-settings').checked
        };

        try {
            const result = await window.electronAPI.backupServer(serverId, options);
            if (result.success) {
                this.showToast('Server backup created successfully', 'success');
                this.loadBackups();
            } else {
                this.showToast('Failed to create backup: ' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('Error creating backup: ' + error.message, 'error');
        }
    }

    async cloneServer() {
        const sourceSelect = document.getElementById('clone-source-select');
        const nameInput = document.getElementById('clone-server-name');
        
        const sourceId = sourceSelect.value;
        const newName = nameInput.value.trim();
        
        if (!sourceId || !newName) {
            this.showToast('Please select a source server and enter a name', 'warning');
            return;
        }

        const options = {
            channels: document.getElementById('clone-channels').checked,
            roles: document.getElementById('clone-roles').checked,
            emojis: document.getElementById('clone-emojis').checked
        };

        try {
            const result = await window.electronAPI.cloneServer(sourceId, newName, options);
            if (result.success) {
                this.showToast('Server cloned successfully', 'success');
                if (result.inviteCode) {
                    this.showToast(`Invite code: ${result.inviteCode}`, 'info');
                }
            } else {
                this.showToast('Failed to clone server: ' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('Error cloning server: ' + error.message, 'error');
        }
    }

    async loadBackups() {
        try {
            const backups = await window.electronAPI.invoke('discord-get-backups');
            this.displayBackups(backups);
        } catch (error) {
            console.error('Error loading backups:', error);
        }
    }

    displayBackups(backups) {
        const backupsList = document.getElementById('backups-list');
        
        if (backups.length === 0) {
            backupsList.innerHTML = '<div class="empty-state"><p>No backups found</p></div>';
            return;
        }

        backupsList.innerHTML = backups.map(backup => `
            <div class="backup-item">
                <div class="backup-info">
                    <h5>${backup.serverName}</h5>
                    <p>Created: ${new Date(backup.createdAt).toLocaleDateString()}</p>
                    <p>Size: ${this.formatBytes(backup.size)}</p>
                </div>
                <div class="backup-item-actions">
                    <button class="action-btn secondary" onclick="dashboard.deleteBackup('${backup.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async deleteBackup(backupId) {
        const confirmed = await Modal.confirm({
            title: 'Delete Backup',
            message: 'Are you sure you want to delete this backup?',
            danger: true
        });

        if (confirmed) {
            try {
                await window.electronAPI.invoke('discord-delete-backup', backupId);
                this.showToast('Backup deleted', 'success');
                this.loadBackups();
            } catch (error) {
                this.showToast('Error deleting backup: ' + error.message, 'error');
            }
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async saveGeminiSettings() {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        const enabled = document.getElementById('gemini-enabled').checked;

        try {
            await window.electronAPI.invoke('discord-setup-gemini', apiKey);
            await window.electronAPI.invoke('discord-set-config', 'gemini.enabled', enabled);
            this.showToast('Gemini settings saved', 'success');
        } catch (error) {
            this.showToast('Error saving Gemini settings: ' + error.message, 'error');
        }
    }

    async testGeminiConnection() {
        try {
            const result = await window.electronAPI.getAIAssistance('Test connection');
            if (result.success) {
                this.showToast('Gemini connection successful', 'success');
            } else {
                this.showToast('Gemini connection failed: ' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('Error testing connection: ' + error.message, 'error');
        }
    }

    async viewAIStats() {
        try {
            const stats = await window.electronAPI.invoke('discord-get-ai-auto-talk-stats');
            const message = `AI Auto Talk Statistics:

Active Conversations: ${stats.activeConversations}
Total Responses Generated: ${stats.totalResponses}
Rate Limited Users: ${stats.rateLimitedUsers}`;

            Modal.alert({
                title: 'AI Auto Talk Statistics',
                message: message,
                type: 'info'
            });
        } catch (error) {
            this.showToast('Error loading AI stats: ' + error.message, 'error');
        }
    }

    async clearAIHistory() {
        const confirmed = await Modal.confirm({
            title: 'Clear AI Conversation History',
            message: 'Are you sure you want to clear all AI conversation history?',
            details: 'This will remove all stored conversation context for AI responses.',
            danger: true
        });

        if (confirmed) {
            try {
                await window.electronAPI.invoke('discord-clear-ai-conversation-history');
                this.showToast('AI conversation history cleared', 'success');
            } catch (error) {
                this.showToast('Error clearing AI history: ' + error.message, 'error');
            }
        }
    }

    switchPage(pageId) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageId}-page`).classList.add('active');

        this.currentPage = pageId;

        // Load page-specific data
        this.loadPageData(pageId);
    }

    loadPageData(pageId) {
        switch (pageId) {
            case 'friends':
                this.loadFriends();
                break;
            case 'servers':
                this.loadServers();
                break;
            case 'backup':
                this.loadBackups();
                this.populateServerSelects();
                break;
        }
    }

    async populateServerSelects() {
        try {
            const servers = await window.electronAPI.getServers();
            const selects = ['backup-server-select', 'clone-source-select'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                select.innerHTML = '<option value="">Choose a server...</option>';
                
                servers.forEach(server => {
                    const option = document.createElement('option');
                    option.value = server.id;
                    option.textContent = server.name;
                    select.appendChild(option);
                });
            });
        } catch (error) {
            console.error('Error populating server selects:', error);
        }
    }

    startUptimeCounter() {
        this.uptimeInterval = setInterval(() => {
            this.updateUptime();
        }, 1000);
    }

    updateUptime() {
        if (!this.stats) return;

        const uptime = Date.now() - this.stats.startTime;
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

        const uptimeDisplay = document.getElementById('uptime-display');
        if (uptimeDisplay) {
            uptimeDisplay.innerHTML = `<span>${hours}</span>h <span>${minutes}</span>m <span>${seconds}</span>s`;
        }
    }

    setupNotificationListener() {
        window.electronAPI.onDiscordNotification((event, notification) => {
            this.addNotification(notification);
        });
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        this.updateNotificationDisplay();
        
        // Show toast for important notifications
        if (notification.type === 'mention' || notification.type === 'warning') {
            this.showToast(notification.title, notification.type);
        }
    }

    updateNotificationDisplay() {
        const notificationsList = document.getElementById('notifications-list');
        const notificationCount = document.getElementById('notification-count');
        
        notificationCount.textContent = this.notifications.length;
        
        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="empty-state">
                    <p>No notifications yet</p>
                    <span>You'll see mentions, giveaways, and other events here</span>
                </div>
            `;
            return;
        }

        notificationsList.innerHTML = this.notifications.slice(0, 10).map(notification => `
            <div class="notification-item">
                <div class="notification-header">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
                <div class="notification-content">${notification.content}</div>
                <div class="notification-meta">
                    <span class="notification-type ${notification.type}">${notification.type}</span>
                    <span>${notification.guild || notification.channel}</span>
                </div>
            </div>
        `).join('');
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    showToast(message, type = 'info') {
        if (window.Modal) {
            Modal.toast({
                title: type.charAt(0).toUpperCase() + type.slice(1),
                message: message,
                type: type,
                duration: 3000
            });
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
});