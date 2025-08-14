const Modal = require('./modal-manager.js');

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.discordStats = null;
        this.currentPage = 'home';
        this.uptime = {
            start: Date.now(),
            days: 0,
            hours: 0,
            minutes: 1,
            seconds: 45
        };
        this.notifications = [];
        
        this.init();
    }

    init() {
        this.setupWindowControls();
        this.setupNavigation();
        this.setupUserInterface();
        this.setupDiscordListeners();
        this.loadDiscordData();
        this.startDataRefresh();
        this.setupCustomStatus();
        this.setupTestModal();
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
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all items
                navItems.forEach(nav => nav.classList.remove('active'));
                
                // Add active class to clicked item
                item.classList.add('active');
                
                // Handle page switching
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
    }

    setupUserInterface() {
        // Account switcher
        document.querySelector('.switch-account-btn').addEventListener('click', () => {
            this.showAccountSwitcher();
        });

        // Add account
        document.querySelector('.add-account-btn').addEventListener('click', () => {
            this.addNewAccount();
        });

        // Toggle switches
        this.setupToggles();

        // Notification actions
        this.setupNotifications();
        
        // Custom status
        this.setupCustomStatusActions();
        
        // Quick actions
        this.setupQuickActions();
    }

    setupDiscordListeners() {
        // Listen for Discord notifications
        window.electronAPI.onDiscordNotification((event, notification) => {
            this.addNotification(notification);
        });
        
        // Listen for update notifications
        window.electronAPI.onUpdateAvailable((event, updateData) => {
            this.showUpdateNotification(updateData);
        });
        
        window.electronAPI.onUpdateDismissed(() => {
            // Handle update dismissed if needed
        });
    }

    setupToggles() {
        const discoverableToggle = document.getElementById('discoverable-toggle');
        const privateToggle = document.getElementById('private-toggle');

        discoverableToggle.addEventListener('change', (e) => {
            this.updateDiscordSetting('discoverable', e.target.checked);
        });

        privateToggle.addEventListener('change', (e) => {
            this.updateDiscordSetting('privateMode', e.target.checked);
        });
        
        const giveawayToggle = document.getElementById('giveaway-toggle');
        const statusAnimationToggle = document.getElementById('status-animation-toggle');
        
        giveawayToggle.addEventListener('change', (e) => {
            this.updateDiscordSetting('autoGiveaway', e.target.checked);
        });
        
        statusAnimationToggle.addEventListener('change', (e) => {
            this.updateDiscordSetting('statusAnimation', e.target.checked);
        });
    }

    setupNotifications() {
        const notificationActions = document.querySelectorAll('.notification-action');
        
        notificationActions.forEach(action => {
            action.addEventListener('click', (e) => {
                const notificationItem = e.target.closest('.notification-item');
                this.dismissNotification(notificationItem);
            });
        });
    }

    setupCustomStatusActions() {
        const setStatusBtn = document.getElementById('set-status-btn');
        const clearStatusBtn = document.getElementById('clear-status-btn');
        
        setStatusBtn.addEventListener('click', () => {
            this.setCustomStatus();
        });
        
        clearStatusBtn.addEventListener('click', () => {
            this.clearCustomStatus();
        });
    }
    
    setupQuickActions() {
        const clearNotificationsBtn = document.getElementById('clear-notifications-btn');
        
        clearNotificationsBtn.addEventListener('click', () => {
            this.clearAllNotifications();
        });
    }
    
    setupTestModal() {
        const testModalBtn = document.getElementById('test-modal-btn');
        
        testModalBtn.addEventListener('click', () => {
            this.showTestModal();
        });
    }
    
    setupCustomStatus() {
        // Setup animated status rotation if enabled
        this.statusRotationInterval = null;
        this.statusMessages = [
            "🎮 Gaming with Lunii",
            "💻 Coding something cool",
            "🎵 Vibing to music",
            "☕ Powered by coffee",
            "🌙 Night owl mode",
            "⚡ High energy"
        ];
        this.currentStatusIndex = 0;
    }

    startDataRefresh() {
        // Refresh Discord data every 5 seconds
        setInterval(() => {
            this.refreshDiscordStats();
        }, 5000);
        
        // Update uptime display every second
        setInterval(() => {
            this.updateUptimeFromStats();
        }, 1000);
    }

    async loadDiscordData() {
        try {
            const userData = await window.electronAPI.getDiscordUserData();
            const stats = await window.electronAPI.getDiscordStats();
            
            if (userData) {
                this.currentUser = userData;
                this.updateUserInterface(userData);
            }
            
            if (stats) {
                this.discordStats = stats;
                this.updateStatsInterface(stats);
            }
        } catch (error) {
            console.error('Error loading Discord data:', error);
        }
    }

    async refreshDiscordStats() {
        try {
            const stats = await window.electronAPI.getDiscordStats();
            if (stats) {
                this.discordStats = stats;
                this.updateStatsInterface(stats);
            }
        } catch (error) {
            console.error('Error refreshing Discord stats:', error);
        }
    }

    updateUptimeFromStats() {
        if (this.discordStats && this.discordStats.uptime) {
            const uptime = this.discordStats.uptime;
            document.getElementById('uptime-days').textContent = 
                uptime.days.toString().padStart(2, '0');
            document.getElementById('uptime-hours').textContent = 
                uptime.hours.toString().padStart(2, '0');
            document.getElementById('uptime-minutes').textContent = 
                uptime.minutes.toString().padStart(2, '0');
            document.getElementById('uptime-seconds').textContent = 
                uptime.seconds.toString().padStart(2, '0');
        }
    }

    updateUserInterface(userData) {
        // Update greeting
        document.getElementById('username').textContent = userData.username;
        
        // Update profile section
        document.getElementById('profile-username').textContent = userData.username;
        document.getElementById('profile-handle').textContent = userData.handle || userData.username;
        document.getElementById('user-id').textContent = userData.id;
        
        // Update avatar
        if (userData.avatar) {
            document.querySelector('.avatar').src = userData.avatar;
        }
        
        // Update stats circles
        this.updateStatCircles(userData.servers, userData.friends);
        
        // Update nitro status
        const nitroStatus = document.querySelector('.status-inactive');
        if (userData.nitro) {
            nitroStatus.textContent = 'Active';
            nitroStatus.className = 'detail-value status-active';
            
            // Show nitro badge
            const nitroBadge = document.querySelector('.badge.nitro');
            if (nitroBadge) nitroBadge.style.display = 'flex';
        } else {
            nitroStatus.textContent = 'Inactive';
            nitroStatus.className = 'detail-value status-inactive';
        }
        
        // Update account creation date
        if (userData.createdAt) {
            const createdDate = new Date(userData.createdAt);
            document.getElementById('account-created').textContent = 
                createdDate.toLocaleDateString();
        }
        
        // Update mutual servers count
        document.getElementById('mutual-servers').textContent = userData.servers || 0;
        
        // Show additional badges based on user data
        if (userData.badges) {
            this.updateUserBadges(userData.badges);
        }
    }
    
    updateUserBadges(badges) {
        const boostBadge = document.querySelector('.badge.boost');
        const supporterBadge = document.querySelector('.badge.early-supporter');
        
        if (badges.includes('SERVER_BOOSTER')) {
            boostBadge.style.display = 'flex';
        }
        
        if (badges.includes('EARLY_SUPPORTER')) {
            supporterBadge.style.display = 'flex';
        }
    }

    updateStatsInterface(stats) {
        // Update command count
        const commandsCount = document.querySelector('.commands-count');
        if (commandsCount) {
            commandsCount.textContent = stats.commandsUsed || 0;
        }
        
        // Update version (static for now)
        const versionNumber = document.querySelector('.version-number');
        if (versionNumber) {
            versionNumber.textContent = '2.4.16';
        }
    }

    updateStatCircles(servers, friends) {
        // Update servers circle
        const serversFill = document.querySelector('.servers-fill');
        const serversPercentage = Math.min((servers / 100) * 100, 100);
        serversFill.style.strokeDasharray = `${serversPercentage}, 100`;
        
        // Update friends circle
        const friendsFill = document.querySelector('.friends-fill');
        const friendsPercentage = Math.min((friends / 1000) * 100, 100);
        friendsFill.style.strokeDasharray = `${friendsPercentage}, 100`;
        
        // Update text values
        const statValues = document.querySelectorAll('.stat-value');
        if (statValues[0]) statValues[0].textContent = servers || 0;
        if (statValues[1]) statValues[1].textContent = friends || 0;
    }

    switchPage(page) {
        // Hide current page content
        const currentPageContent = document.querySelector('.page-content:not([style*="display: none"])');
        if (currentPageContent) {
            currentPageContent.style.display = 'none';
        }
        
        // Hide dashboard grid for non-home pages
        const dashboardGrid = document.querySelector('.dashboard-grid');
        
        if (page === 'home') {
            dashboardGrid.style.display = 'grid';
        } else {
            dashboardGrid.style.display = 'none';
            
            // Show the corresponding page
            const pageContent = document.getElementById(`${page}-page`);
            if (pageContent) {
                pageContent.style.display = 'block';
                this.loadPageData(page);
            }
        }
        
        this.currentPage = page;
    }
    
    loadPageData(page) {
        switch (page) {
            case 'friends':
                this.loadFriendsData();
                break;
            case 'servers':
                this.loadServersData();
                break;
            case 'commands':
                this.loadCommandHistory();
                break;
        }
    }
    
    async loadFriendsData() {
        try {
            const friends = await window.electronAPI.invoke('discord-get-friends');
            this.updateFriendsList(friends);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }
    
    async loadServersData() {
        try {
            const servers = await window.electronAPI.invoke('discord-get-servers');
            this.updateServersList(servers);
        } catch (error) {
            console.error('Error loading servers:', error);
        }
    }
    
    loadCommandHistory() {
        // Load command history from local storage or API
        const history = JSON.parse(localStorage.getItem('commandHistory') || '[]');
        this.updateCommandHistory(history);
    }
    
    updateFriendsList(friends) {
        const friendsList = document.querySelector('.friends-list');
        if (!friends || friends.length === 0) return;
        
        friendsList.innerHTML = '';
        friends.forEach(friend => {
            const friendElement = this.createFriendElement(friend);
            friendsList.appendChild(friendElement);
        });
    }
    
    createFriendElement(friend) {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.innerHTML = `
            <div class="friend-avatar">
                <img src="${friend.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${friend.username}">
                <div class="status-dot ${friend.status || 'offline'}"></div>
            </div>
            <div class="friend-info">
                <span class="friend-name">${friend.username}</span>
                <span class="friend-status">${friend.status || 'Offline'}</span>
            </div>
        `;
        return div;
    }
    
    updateServersList(servers) {
        const serversGrid = document.querySelector('.servers-grid');
        if (!servers || servers.length === 0) return;
        
        serversGrid.innerHTML = '';
        servers.forEach(server => {
            const serverElement = this.createServerElement(server);
            serversGrid.appendChild(serverElement);
        });
    }
    
    createServerElement(server) {
        const div = document.createElement('div');
        div.className = 'server-card';
        div.innerHTML = `
            <div class="server-icon">
                <img src="${server.icon || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${server.name}">
            </div>
            <div class="server-info">
                <h4>${server.name}</h4>
                <p>${server.memberCount || 0} members</p>
            </div>
        `;
        return div;
    }
    
    updateCommandHistory(history) {
        const commandHistory = document.querySelector('.command-history');
        
        if (history.length === 0) {
            commandHistory.innerHTML = `
                <div class="command-item">
                    <span class="command-text">No commands executed yet</span>
                    <span class="command-time">-</span>
                </div>
            `;
            return;
        }
        
        commandHistory.innerHTML = '';
        history.forEach(cmd => {
            const cmdElement = document.createElement('div');
            cmdElement.className = 'command-item';
            cmdElement.innerHTML = `
                <span class="command-text">${cmd.command}</span>
                <span class="command-time">${this.getTimeAgo(cmd.timestamp)}</span>
            `;
            commandHistory.appendChild(cmdElement);
        });
    }

    showAccountSwitcher() {
        Modal.confirm({
            title: 'Switch Account',
            message: 'Do you want to logout and switch to a different Discord account?',
            details: 'You will need to enter a new token to login with a different account.',
            type: 'question',
            confirmText: 'Switch Account',
            cancelText: 'Cancel'
        }).then(confirmed => {
            if (confirmed) {
                this.addNewAccount();
            }
        });
    }

    addNewAccount() {
        Modal.confirm({
            title: 'Add New Account',
            message: 'This will logout your current account and return to the login screen.',
            details: 'Make sure you have saved any important work before proceeding.',
            type: 'warning',
            confirmText: 'Continue',
            cancelText: 'Cancel',
            danger: false
        }).then(confirmed => {
            if (confirmed) {
                const loading = Modal.loading({
                    title: 'Logging out...',
                    message: 'Disconnecting from Discord...'
                });
                
                setTimeout(() => {
                    loading.close();
                    window.electronAPI.logout();
                    Modal.toast({
                        title: 'Logged out',
                        message: 'Successfully disconnected from Discord',
                        type: 'success'
                    });
                }, 1500);
            }
        });
    }

    async setCustomStatus() {
        const statusText = document.getElementById('custom-status-text').value;
        const statusEmoji = document.getElementById('status-emoji').value;
        
        if (!statusText.trim()) {
            Modal.toast({
                title: 'Invalid Status',
                message: 'Please enter a status message',
                type: 'warning',
                duration: 3000
            });
            return;
        }
        
        const fullStatus = statusEmoji ? `${statusEmoji} ${statusText}` : statusText;
        
        try {
            const result = await window.electronAPI.updateDiscordSetting('customStatus', fullStatus);
            if (result.success) {
                Modal.toast({
                    title: 'Status Updated',
                    message: 'Custom status has been set successfully',
                    type: 'success',
                    duration: 3000
                });
            }
        } catch (error) {
            Modal.toast({
                title: 'Status Error',
                message: 'Failed to update custom status',
                type: 'error',
                duration: 5000
            });
        }
    }
    
    async clearCustomStatus() {
        try {
            const result = await window.electronAPI.updateDiscordSetting('customStatus', '');
            if (result.success) {
                document.getElementById('custom-status-text').value = '';
                document.getElementById('status-emoji').value = '';
                
                Modal.toast({
                    title: 'Status Cleared',
                    message: 'Custom status has been cleared',
                    type: 'success',
                    duration: 3000
                });
            }
        } catch (error) {
            Modal.toast({
                title: 'Clear Error',
                message: 'Failed to clear custom status',
                type: 'error',
                duration: 5000
            });
        }
    }
    
    clearAllNotifications() {
        Modal.confirm({
            title: 'Clear Notifications',
            message: 'Are you sure you want to clear all notifications?',
            type: 'question',
            confirmText: 'Clear All',
            cancelText: 'Cancel'
        }).then(confirmed => {
            if (confirmed) {
                this.notifications = [];
                this.updateNotificationsList();
                this.updateNotificationCount();
                
                Modal.toast({
                    title: 'Notifications Cleared',
                    message: 'All notifications have been cleared',
                    type: 'success',
                    duration: 3000
                });
            }
        });
    }
    
    showTestModal() {
        Modal.confirm({
            title: 'Test Modal System',
            message: 'This is a test of the modal system. Everything is working correctly!',
            details: 'You can use modals for confirmations, alerts, prompts, and more. The system supports different types and styles.',
            type: 'info',
            confirmText: 'Show Toast',
            cancelText: 'Close'
        }).then(confirmed => {
            if (confirmed) {
                Modal.toast({
                    title: 'Modal Test',
                    message: 'Toast notification is working perfectly!',
                    type: 'success',
                    duration: 4000
                });
            }
        });
    }

    async updateDiscordSetting(setting, value) {
        console.log(`Setting ${setting} to ${value}`);
        
        try {
            const result = await window.electronAPI.updateDiscordSetting(setting, value);
            if (result.success) {
                Modal.toast({
                    title: 'Setting Updated',
                    message: `${setting} has been updated successfully`,
                    type: 'success',
                    duration: 3000
                });
            } else {
                Modal.toast({
                    title: 'Update Failed',
                    message: result.error || 'Failed to update setting',
                    type: 'error',
                    duration: 5000
                });
            }
        } catch (error) {
            Modal.toast({
                title: 'Connection Error',
                message: 'Failed to communicate with Discord',
                type: 'error',
                duration: 5000
            });
        }
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Keep only last 10 notifications
        if (this.notifications.length > 10) {
            this.notifications = this.notifications.slice(0, 10);
        }
        
        this.updateNotificationCount();
        
        // Show toast for important notifications
        if (notification.type === 'mention') {
            Modal.toast({
                title: 'New Mention',
                message: `${notification.author}: ${notification.content.substring(0, 50)}...`,
                type: 'info',
                duration: 8000
            });
        }
        
        this.updateNotificationsList();
    }

    updateNotificationCount() {
        const countElement = document.getElementById('notification-count');
        if (countElement) {
            countElement.textContent = this.notifications.length;
            countElement.style.display = this.notifications.length > 0 ? 'inline' : 'none';
        }
    }

    updateNotificationsList() {
        const notificationsList = document.querySelector('.notifications-list');
        if (!notificationsList) return;
        
        notificationsList.innerHTML = '';
        
        this.notifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            notificationsList.appendChild(notificationElement);
        });
    }

    createNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = 'notification-item';
        
        const iconClass = notification.type === 'mention' ? 'info' : 
                         notification.type === 'success' ? 'success' : 
                         notification.type === 'error' ? 'error' : 'info';
        
        const timeAgo = this.getTimeAgo(notification.timestamp);
        
        div.innerHTML = `
            <div class="notification-icon ${iconClass}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    ${this.getNotificationIcon(notification.type)}
                </svg>
            </div>
            <div class="notification-content">
                <div class="notification-text">${notification.content}</div>
                <div class="notification-meta">
                    <span class="notification-time">${timeAgo}</span>
                    <span class="notification-channel">${notification.channel || ''}, ${notification.guild || ''}</span>
                </div>
            </div>
            <div class="notification-actions">
                <button class="notification-action">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" fill="none"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Add dismiss functionality
        const dismissBtn = div.querySelector('.notification-action');
        dismissBtn.addEventListener('click', () => {
            this.dismissNotification(div);
        });
        
        return div;
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'mention':
            case 'info':
                return '<circle cx="8" cy="8" r="7" stroke="currentColor" fill="none"/><path d="M8 11V8M8 5V5.01" stroke="currentColor" stroke-linecap="round"/>';
            case 'success':
                return '<circle cx="8" cy="8" r="7" stroke="currentColor" fill="none"/><path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            case 'error':
                return '<circle cx="8" cy="8" r="7" stroke="currentColor" fill="none"/><path d="M8 4V8M8 12V12.01" stroke="currentColor" stroke-linecap="round"/>';
            default:
                return '<circle cx="8" cy="8" r="7" stroke="currentColor" fill="none"/>';
        }
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000);
        
        if (diff < 60) return `${diff} seconds ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return `${Math.floor(diff / 86400)} days ago`;
    }

    dismissNotification(notificationItem) {
        notificationItem.style.opacity = '0';
        notificationItem.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            notificationItem.remove();
        }, 300);
    }
    
    showUpdateNotification(updateData) {
        Modal.confirm({
            title: 'Update Available',
            message: `Lunii ${updateData.latestVersion} is now available!`,
            details: `You're currently running version ${updateData.currentVersion}. Would you like to download and install the update now?`,
            type: 'info',
            confirmText: 'Update Now',
            cancelText: 'Later'
        }).then(confirmed => {
            if (confirmed) {
                window.electronAPI.invoke('updater-show-update-window');
            } else {
                window.electronAPI.invoke('updater-dismiss-notification');
            }
        });
    }
    
    // Add method to handle guild/friend events
    handleGuildLeave(guild) {
        this.addNotification({
            type: 'warning',
            title: 'Left Server',
            content: `You left ${guild.name}`,
            timestamp: Date.now()
        });
    }
    
    handleFriendRemove(friend) {
        this.addNotification({
            type: 'error',
            title: 'Friend Removed',
            content: `${friend.username} is no longer your friend`,
            timestamp: Date.now()
        });
    }
    
    handleFriendAdd(friend) {
        this.addNotification({
            type: 'success',
            title: 'New Friend',
            content: `${friend.username} is now your friend`,
            timestamp: Date.now()
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});

// Add smooth scrolling for notifications
document.addEventListener('DOMContentLoaded', () => {
    const notificationsList = document.querySelector('.notifications-list');
    
    // Add scroll behavior
    if (notificationsList) {
        notificationsList.style.scrollBehavior = 'smooth';
    }
    
    // Add hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('.nav-item, .toggle-switch, .notification-action');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Initialize notification count
    const dashboard = new DashboardManager();
    dashboard.updateNotificationCount();
});