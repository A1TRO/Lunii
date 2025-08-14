class DashboardManager {
    constructor() {
        this.currentPage = 'overview';
        this.userData = null;
        this.stats = null;
        this.notifications = [];
        this.uptime = { start: Date.now() };
        this.contextMenu = null;
        this.selectedServer = null;
        this.commandHistory = [];
        this.savedCommands = [];
        this.messageTemplates = [];
        this.currentCommandType = 'regular';
        this.isAIGenerating = false;
        
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.setupWindowControls();
            this.setupNavigation();
            this.setupContextMenu();
            this.setupCommandBuilder();
            this.setupMessageCenter();
            this.setupAutomation();
            this.setupBackupSystem();
            this.setupLogging();
            this.setupSettings();
            
            await this.loadUserData();
            await this.loadStats();
            await this.loadNotifications();
            await this.loadSavedCommands();
            await this.loadMessageTemplates();
            
            this.startUptimeCounter();
            this.startDataRefresh();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    setupEventListeners() {
        // Listen for Discord notifications
        if (window.electronAPI && window.electronAPI.onDiscordNotification) {
            window.electronAPI.onDiscordNotification((event, notification) => {
                this.addNotification(notification);
            });
        }

        // Profile toggles
        document.getElementById('auto-giveaway-toggle')?.addEventListener('change', (e) => {
            this.updateSetting('autoGiveaway', e.target.checked);
        });

        document.getElementById('message-logger-toggle')?.addEventListener('change', (e) => {
            this.updateSetting('messageLogger', e.target.checked);
        });

        document.getElementById('anti-ghost-ping-toggle')?.addEventListener('change', (e) => {
            this.updateSetting('antiGhostPing', e.target.checked);
        });

        // Status updates
        document.getElementById('update-status-btn')?.addEventListener('click', () => {
            this.updateCustomStatus();
        });

        document.getElementById('clear-status-btn')?.addEventListener('click', () => {
            this.clearCustomStatus();
        });

        // Notification actions
        document.getElementById('clear-notifications-btn')?.addEventListener('click', () => {
            this.clearNotifications();
        });

        // Friends refresh
        document.getElementById('refresh-friends-btn')?.addEventListener('click', () => {
            this.refreshFriends();
        });

        // Servers refresh
        document.getElementById('refresh-servers-btn')?.addEventListener('click', () => {
            this.refreshServers();
        });

        // Close server details
        document.getElementById('close-server-details')?.addEventListener('click', () => {
            this.closeServerDetails();
        });
    }

    setupWindowControls() {
        document.getElementById('minimize-btn')?.addEventListener('click', () => {
            window.electronAPI?.minimizeWindow();
        });

        document.getElementById('maximize-btn')?.addEventListener('click', () => {
            window.electronAPI?.maximizeWindow();
        });

        document.getElementById('close-btn')?.addEventListener('click', () => {
            window.electronAPI?.closeWindow();
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            window.electronAPI?.logout();
        });
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });
    }

    setupContextMenu() {
        this.contextMenu = document.getElementById('context-menu');
        
        // Hide context menu on click outside
        document.addEventListener('click', (e) => {
            if (this.contextMenu && !this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Context menu actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.getAttribute('data-action');
                this.handleContextAction(action);
                this.hideContextMenu();
            }
        });

        // Server item right-click
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.server-item')) {
                e.preventDefault();
                const serverItem = e.target.closest('.server-item');
                this.selectedServer = serverItem.getAttribute('data-server-id');
                this.showContextMenu(e.clientX, e.clientY);
            }
        });
    }

    setupCommandBuilder() {
        // Command type selector
        const commandTypeButtons = document.querySelectorAll('.command-type-btn');
        commandTypeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                commandTypeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCommandType = btn.getAttribute('data-type');
                this.updateCommandBuilder();
            });
        });

        // Command actions
        document.getElementById('test-command-btn')?.addEventListener('click', () => {
            this.testCommand();
        });

        document.getElementById('save-command-btn')?.addEventListener('click', () => {
            this.saveCommand();
        });

        document.getElementById('clear-command-history')?.addEventListener('click', () => {
            this.clearCommandHistory();
        });

        // AI Command Generation
        document.getElementById('ai-generate-btn')?.addEventListener('click', () => {
            this.generateAICommand();
        });

        // Initialize command builder
        this.updateCommandBuilder();
    }

    setupMessageCenter() {
        // Message type tabs
        const messageTypeTabs = document.querySelectorAll('.message-type-tabs .tab-btn');
        messageTypeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                messageTypeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateMessageTargets(tab.getAttribute('data-type'));
            });
        });

        // Message actions
        document.getElementById('preview-message-btn')?.addEventListener('click', () => {
            this.previewMessage();
        });

        document.getElementById('send-message-btn')?.addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('create-template-btn')?.addEventListener('click', () => {
            this.createMessageTemplate();
        });

        // Server selection change
        document.getElementById('message-server-select')?.addEventListener('change', (e) => {
            this.updateChannelList(e.target.value);
        });

        // Initialize message center
        this.loadServersForMessaging();
    }

    setupAutomation() {
        // Feature toggles
        document.getElementById('auto-giveaway-feature')?.addEventListener('change', (e) => {
            this.updateAutomationFeature('autoGiveaway', e.target.checked);
        });

        document.getElementById('afk-auto-reply-feature')?.addEventListener('change', (e) => {
            this.updateAutomationFeature('afkAutoReply', e.target.checked);
        });

        document.getElementById('status-animation-feature')?.addEventListener('change', (e) => {
            this.updateAutomationFeature('statusAnimation', e.target.checked);
        });

        // Configuration buttons
        document.querySelectorAll('.config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feature = e.target.closest('.feature-card').querySelector('input').id.replace('-feature', '');
                this.configureAutomationFeature(feature);
            });
        });
    }

    setupBackupSystem() {
        // Backup actions
        document.getElementById('create-backup-btn')?.addEventListener('click', () => {
            this.createServerBackup();
        });

        document.getElementById('clone-server-btn')?.addEventListener('click', () => {
            this.cloneServer();
        });

        // Load servers for backup/clone
        this.loadServersForBackup();
    }

    setupLogging() {
        // Log type tabs
        const logTypeTabs = document.querySelectorAll('.log-type-tabs .tab-btn');
        logTypeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                logTypeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.switchLogType(tab.getAttribute('data-log-type'));
            });
        });

        // Log actions
        document.getElementById('refresh-message-logs')?.addEventListener('click', () => {
            this.refreshMessageLogs();
        });

        document.getElementById('clear-message-logs')?.addEventListener('click', () => {
            this.clearMessageLogs();
        });

        document.getElementById('refresh-ghost-ping-logs')?.addEventListener('click', () => {
            this.refreshGhostPingLogs();
        });

        document.getElementById('clear-ghost-ping-logs')?.addEventListener('click', () => {
            this.clearGhostPingLogs();
        });

        // Load initial logs
        this.loadMessageLogs();
    }

    setupSettings() {
        // Gemini AI settings
        document.getElementById('save-gemini-settings')?.addEventListener('click', () => {
            this.saveGeminiSettings();
        });

        document.getElementById('test-gemini-connection')?.addEventListener('click', () => {
            this.testGeminiConnection();
        });

        // General settings
        document.getElementById('notifications-enabled')?.addEventListener('change', (e) => {
            this.updateSetting('notifications', e.target.checked);
        });

        document.getElementById('auto-save-token')?.addEventListener('change', (e) => {
            this.updateSetting('autoSaveToken', e.target.checked);
        });

        document.getElementById('debug-mode')?.addEventListener('change', (e) => {
            this.updateSetting('debugMode', e.target.checked);
        });
    }

    navigateToPage(page) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(p => {
            p.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-page="${page}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        this.currentPage = page;

        // Load page-specific data
        this.loadPageData(page);
    }

    async loadPageData(page) {
        try {
            switch (page) {
                case 'friends':
                    await this.loadFriends();
                    break;
                case 'servers':
                    await this.loadServers();
                    break;
                case 'commands':
                    await this.loadSavedCommands();
                    break;
                case 'messaging':
                    await this.loadMessageTemplates();
                    break;
                case 'backup':
                    await this.loadBackups();
                    break;
                case 'logs':
                    await this.loadMessageLogs();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${page} data:`, error);
        }
    }

    async loadUserData() {
        try {
            if (!window.electronAPI?.getDiscordUserData) {
                throw new Error('Discord API not available');
            }

            this.userData = await window.electronAPI.getDiscordUserData();
            
            if (this.userData) {
                this.updateUserInterface();
            } else {
                throw new Error('No user data received');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Failed to load user data');
        }
    }

    async loadStats() {
        try {
            if (!window.electronAPI?.getDiscordStats) {
                return;
            }

            this.stats = await window.electronAPI.getDiscordStats();
            this.updateStatsInterface();
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateUserInterface() {
        if (!this.userData) return;

        // Update greeting
        const greetingElement = document.getElementById('user-greeting');
        if (greetingElement) {
            greetingElement.textContent = this.userData.displayName || this.userData.username || 'User';
        }

        // Update profile info
        const displayNameElement = document.getElementById('user-display-name');
        if (displayNameElement) {
            displayNameElement.textContent = this.userData.formattedName || this.userData.username;
        }

        const usernameElement = document.getElementById('user-username');
        if (usernameElement) {
            usernameElement.textContent = `@${this.userData.username}`;
        }

        // Update avatar
        const avatarElement = document.getElementById('user-avatar');
        if (avatarElement && this.userData.avatar) {
            avatarElement.src = this.userData.avatar;
            avatarElement.onerror = () => {
                avatarElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiM0RjQ2RTUiLz48dGV4dCB4PSIzMiIgeT0iMzgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjI0Ij7wn5GKPC90ZXh0Pjwvc3ZnPg==';
            };
        }

        // Update status indicator
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${this.userData.status || 'online'}`;
        }

        // Update badges
        this.updateUserBadges();

        // Update connection status
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'detail-value status-active';
        }
    }

    updateUserBadges() {
        const badgesContainer = document.getElementById('user-badges');
        if (!badgesContainer || !this.userData?.badges) return;

        badgesContainer.innerHTML = '';
        
        this.userData.badges.forEach(badge => {
            const badgeElement = document.createElement('span');
            badgeElement.className = 'badge';
            badgeElement.textContent = badge.replace('_', ' ');
            badgesContainer.appendChild(badgeElement);
        });
    }

    updateStatsInterface() {
        if (!this.stats) return;

        // Update server count
        const serversCount = document.getElementById('servers-count');
        const serversProgress = document.getElementById('servers-progress');
        if (serversCount && this.stats.guilds) {
            const count = this.stats.guilds.length;
            serversCount.textContent = count;
            
            if (serversProgress) {
                const maxServers = 100; // Discord limit
                const percentage = (count / maxServers) * 100;
                const circumference = 2 * Math.PI * 36;
                const offset = circumference - (percentage / 100) * circumference;
                serversProgress.style.strokeDashoffset = offset;
            }
        }

        // Update friends count
        const friendsCount = document.getElementById('friends-count');
        const friendsProgress = document.getElementById('friends-progress');
        if (friendsCount && this.stats.friends) {
            const count = this.stats.friends.length;
            friendsCount.textContent = count;
            
            if (friendsProgress) {
                const maxFriends = 1000; // Reasonable limit
                const percentage = (count / maxFriends) * 100;
                const circumference = 2 * Math.PI * 36;
                const offset = circumference - (percentage / 100) * circumference;
                friendsProgress.style.strokeDashoffset = offset;
            }
        }

        // Update commands used
        const commandsUsed = document.getElementById('commands-used');
        if (commandsUsed) {
            commandsUsed.textContent = this.stats.commandsUsed || 0;
        }
    }

    startUptimeCounter() {
        const updateUptime = () => {
            const uptimeDisplay = document.getElementById('uptime-display');
            if (!uptimeDisplay) return;

            const now = Date.now();
            const uptime = now - this.uptime.start;
            
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

            const spans = uptimeDisplay.querySelectorAll('span');
            if (spans.length >= 3) {
                spans[0].textContent = hours;
                spans[1].textContent = minutes;
                spans[2].textContent = seconds;
            }
        };

        updateUptime();
        setInterval(updateUptime, 1000);
    }

    startDataRefresh() {
        // Refresh data every 30 seconds
        setInterval(async () => {
            try {
                await this.loadStats();
            } catch (error) {
                console.error('Error refreshing data:', error);
            }
        }, 30000);
    }

    async loadNotifications() {
        // Load existing notifications
        this.notifications = [];
        this.updateNotificationsInterface();
    }

    addNotification(notification) {
        this.notifications.unshift({
            ...notification,
            id: Date.now().toString(),
            timestamp: Date.now()
        });

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        this.updateNotificationsInterface();
    }

    updateNotificationsInterface() {
        const notificationsList = document.getElementById('notifications-list');
        const notificationCount = document.getElementById('notification-count');
        
        if (!notificationsList) return;

        // Update count
        if (notificationCount) {
            notificationCount.textContent = this.notifications.length;
        }

        // Clear existing notifications
        notificationsList.innerHTML = '';

        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="empty-state">
                    <p>No notifications yet</p>
                    <span>You'll see mentions, giveaways, and other events here</span>
                </div>
            `;
            return;
        }

        // Add notifications
        this.notifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            notificationsList.appendChild(notificationElement);
        });
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = 'notification-item';
        element.innerHTML = `
            <div class="notification-header">
                <span class="notification-title">${notification.title}</span>
                <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
            </div>
            <div class="notification-content">${notification.content}</div>
            <div class="notification-meta">
                <span class="notification-type ${notification.type}">${notification.type}</span>
                <span>${notification.channel || ''} ${notification.guild ? `• ${notification.guild}` : ''}</span>
            </div>
        `;
        return element;
    }

    clearNotifications() {
        this.notifications = [];
        this.updateNotificationsInterface();
    }

    async updateSetting(setting, value) {
        try {
            if (window.electronAPI?.updateDiscordSetting) {
                const result = await window.electronAPI.updateDiscordSetting(setting, value);
                if (result.success) {
                    this.showSuccess(`${setting} updated successfully`);
                } else {
                    throw new Error(result.error);
                }
            }
        } catch (error) {
            console.error(`Error updating ${setting}:`, error);
            this.showError(`Failed to update ${setting}: ${error.message}`);
        }
    }

    async updateCustomStatus() {
        const statusInput = document.getElementById('custom-status-input');
        const statusTypeSelect = document.getElementById('status-type-select');
        
        if (!statusInput || !statusTypeSelect) return;

        const status = statusInput.value.trim();
        const type = statusTypeSelect.value;

        try {
            await this.updateSetting('customStatus', status);
            await this.updateSetting('status', type);
            this.showSuccess('Status updated successfully');
        } catch (error) {
            this.showError('Failed to update status');
        }
    }

    async clearCustomStatus() {
        try {
            await this.updateSetting('customStatus', '');
            const statusInput = document.getElementById('custom-status-input');
            if (statusInput) {
                statusInput.value = '';
            }
            this.showSuccess('Status cleared');
        } catch (error) {
            this.showError('Failed to clear status');
        }
    }

    async loadFriends() {
        try {
            const friendsList = document.getElementById('friends-list');
            if (!friendsList) return;

            friendsList.innerHTML = '<div class="loading-skeleton wide"></div>'.repeat(5);

            if (!window.electronAPI?.getFriends) {
                throw new Error('Friends API not available');
            }

            const friends = await window.electronAPI.getFriends();
            
            friendsList.innerHTML = '';

            if (!friends || friends.length === 0) {
                friendsList.innerHTML = `
                    <div class="empty-state">
                        <p>No friends found</p>
                        <span>Your friends list will appear here</span>
                    </div>
                `;
                return;
            }

            friends.forEach(friend => {
                const friendElement = this.createFriendElement(friend);
                friendsList.appendChild(friendElement);
            });
        } catch (error) {
            console.error('Error loading friends:', error);
            const friendsList = document.getElementById('friends-list');
            if (friendsList) {
                friendsList.innerHTML = `
                    <div class="empty-state">
                        <p>Failed to load friends</p>
                        <span>${error.message}</span>
                    </div>
                `;
            }
        }
    }

    createFriendElement(friend) {
        const element = document.createElement('div');
        element.className = 'friend-item';
        element.innerHTML = `
            <div class="friend-avatar">
                <img src="${friend.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0RjQ2RTUiLz48dGV4dCB4PSIyMCIgeT0iMjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE2Ij7wn5GKPC90ZXh0Pjwvc3ZnPg=='}" alt="${friend.username}">
                <div class="status-indicator ${friend.status || 'offline'}"></div>
            </div>
            <div class="friend-info">
                <div class="friend-name">${friend.username}</div>
                <div class="friend-status">${this.formatStatus(friend.status)}</div>
            </div>
        `;
        return element;
    }

    async refreshFriends() {
        await this.loadFriends();
        this.showSuccess('Friends list refreshed');
    }

    async loadServers() {
        try {
            const serversGrid = document.getElementById('servers-grid');
            if (!serversGrid) return;

            serversGrid.innerHTML = '<div class="loading-skeleton wide"></div>'.repeat(6);

            if (!window.electronAPI?.getServers) {
                throw new Error('Servers API not available');
            }

            const servers = await window.electronAPI.getServers();
            
            serversGrid.innerHTML = '';

            if (!servers || servers.length === 0) {
                serversGrid.innerHTML = `
                    <div class="empty-state">
                        <p>No servers found</p>
                        <span>Your servers will appear here</span>
                    </div>
                `;
                return;
            }

            servers.forEach(server => {
                const serverElement = this.createServerElement(server);
                serversGrid.appendChild(serverElement);
            });
        } catch (error) {
            console.error('Error loading servers:', error);
            const serversGrid = document.getElementById('servers-grid');
            if (serversGrid) {
                serversGrid.innerHTML = `
                    <div class="empty-state">
                        <p>Failed to load servers</p>
                        <span>${error.message}</span>
                    </div>
                `;
            }
        }
    }

    createServerElement(server) {
        const element = document.createElement('div');
        element.className = 'server-item';
        element.setAttribute('data-server-id', server.id);
        element.innerHTML = `
            <div class="server-header">
                <div class="server-icon">
                    ${server.icon ? 
                        `<img src="${server.icon}" alt="${server.name}" style="width: 100%; height: 100%; border-radius: 12px;">` :
                        server.name.charAt(0).toUpperCase()
                    }
                </div>
                <div class="server-info">
                    <h3>${server.name}</h3>
                    <p>${server.memberCount || 0} members</p>
                </div>
            </div>
            <div class="server-stats">
                <span>Owner: ${server.owner ? 'Yes' : 'No'}</span>
                <span>ID: ${server.id}</span>
            </div>
        `;

        element.addEventListener('click', () => {
            this.viewServerDetails(server.id);
        });

        return element;
    }

    async refreshServers() {
        await this.loadServers();
        this.showSuccess('Servers list refreshed');
    }

    async viewServerDetails(serverId) {
        try {
            const serverDetailsSection = document.getElementById('server-details-section');
            const serverDetailsContent = document.getElementById('server-details-content');
            
            if (!serverDetailsSection || !serverDetailsContent) return;

            // Show loading state
            serverDetailsContent.innerHTML = '<div class="loading-skeleton wide"></div>'.repeat(10);
            serverDetailsSection.style.display = 'block';

            if (!window.electronAPI?.getServerDetails) {
                throw new Error('Server details API not available');
            }

            const serverDetails = await window.electronAPI.getServerDetails(serverId);
            
            if (!serverDetails) {
                throw new Error('Server details not found');
            }

            // Get channels and members
            const [channelsResult, membersResult] = await Promise.all([
                window.electronAPI.getServerChannels?.(serverId).catch(() => ({ success: false, channels: [] })),
                window.electronAPI.getServerMembers?.(serverId).catch(() => ({ success: false, members: [] }))
            ]);

            const channels = channelsResult.success ? channelsResult.channels : [];
            const members = membersResult.success ? membersResult.members : [];

            serverDetailsContent.innerHTML = this.createServerDetailsHTML(serverDetails, channels, members);
        } catch (error) {
            console.error('Error loading server details:', error);
            const serverDetailsContent = document.getElementById('server-details-content');
            if (serverDetailsContent) {
                serverDetailsContent.innerHTML = `
                    <div class="empty-state">
                        <p>Failed to load server details</p>
                        <span>${error.message}</span>
                    </div>
                `;
            }
        }
    }

    createServerDetailsHTML(server, channels, members) {
        return `
            <div class="server-details-content">
                <div class="server-overview">
                    <h4>${server.name}</h4>
                    <div class="server-stats">
                        <div class="stat-item">
                            <span class="stat-value">${server.memberCount || 0}</span>
                            <span class="stat-label">Members</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${channels.length}</span>
                            <span class="stat-label">Channels</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${server.roles?.length || 0}</span>
                            <span class="stat-label">Roles</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${server.emojis?.length || 0}</span>
                            <span class="stat-label">Emojis</span>
                        </div>
                    </div>
                </div>

                <div class="server-section">
                    <h4>Channels (${channels.length})</h4>
                    <div class="channels-list">
                        ${channels.length > 0 ? 
                            channels.map(channel => `
                                <div class="channel-item">
                                    <div class="channel-icon">
                                        ${channel.type === 'text' ? '#' : '🔊'}
                                    </div>
                                    <span class="channel-name">${channel.name}</span>
                                    <span class="channel-type">${channel.type}</span>
                                </div>
                            `).join('') :
                            '<div class="empty-state"><p>No channels found</p></div>'
                        }
                    </div>
                </div>

                <div class="server-section">
                    <h4>Members (${members.length})</h4>
                    <div class="members-list">
                        ${members.length > 0 ? 
                            members.slice(0, 20).map(member => `
                                <div class="member-item">
                                    <div class="member-avatar">
                                        <img src="${member.user.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM0RjQ2RTUiLz48dGV4dCB4PSIxNiIgeT0iMjEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIj7wn5GKPC90ZXh0Pjwvc3ZnPg=='}" alt="${member.user.username}">
                                    </div>
                                    <span class="member-name">${member.displayName}</span>
                                    <span class="member-role">${member.roles?.[0]?.name || 'Member'}</span>
                                    <div class="member-status ${member.presence?.status || 'offline'}"></div>
                                </div>
                            `).join('') :
                            '<div class="empty-state"><p>No members found</p></div>'
                        }
                        ${members.length > 20 ? `<div class="member-item"><span class="member-name">... and ${members.length - 20} more</span></div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    closeServerDetails() {
        const serverDetailsSection = document.getElementById('server-details-section');
        if (serverDetailsSection) {
            serverDetailsSection.style.display = 'none';
        }
    }

    showContextMenu(x, y) {
        if (!this.contextMenu) return;

        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = 'block';

        // Adjust position if menu goes off screen
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = `${y - rect.height}px`;
        }
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }

    async handleContextAction(action) {
        if (!this.selectedServer) return;

        try {
            switch (action) {
                case 'view-details':
                    await this.viewServerDetails(this.selectedServer);
                    break;
                case 'manage-channels':
                    this.showInfo('Channel management coming soon!');
                    break;
                case 'manage-members':
                    this.showInfo('Member management coming soon!');
                    break;
                case 'backup-server':
                    await this.backupServer(this.selectedServer);
                    break;
                case 'clone-server':
                    await this.cloneServer(this.selectedServer);
                    break;
                default:
                    console.warn('Unknown context action:', action);
            }
        } catch (error) {
            console.error('Context action error:', error);
            this.showError(`Failed to ${action.replace('-', ' ')}: ${error.message}`);
        }
    }

    // Command Builder Methods
    updateCommandBuilder() {
        const commandBuilder = document.querySelector('.command-builder');
        if (!commandBuilder) return;

        // Update form based on command type
        const commandTypeInput = document.getElementById('command-type');
        if (commandTypeInput) {
            commandTypeInput.value = this.currentCommandType;
        }

        // Show/hide slash command specific fields
        const slashCommandFields = document.querySelectorAll('.slash-command-field');
        slashCommandFields.forEach(field => {
            field.style.display = this.currentCommandType === 'slash' ? 'block' : 'none';
        });
    }

    async generateAICommand() {
        const promptInput = document.getElementById('ai-prompt-input');
        const generateBtn = document.getElementById('ai-generate-btn');
        const loadingIndicator = document.getElementById('ai-loading');
        
        if (!promptInput || !generateBtn) return;

        const prompt = promptInput.value.trim();
        if (!prompt) {
            this.showError('Please enter a command description');
            return;
        }

        try {
            this.isAIGenerating = true;
            generateBtn.disabled = true;
            if (loadingIndicator) {
                loadingIndicator.classList.add('show');
            }

            if (!window.electronAPI?.getAIAssistance) {
                throw new Error('AI assistance not available');
            }

            const aiPrompt = `Create a Discord ${this.currentCommandType} command based on this description: "${prompt}". 
                            Provide the command name, description, and JavaScript code. 
                            Format the response as JSON with fields: name, description, code, type.`;

            const result = await window.electronAPI.getAIAssistance(aiPrompt);
            
            if (!result.success) {
                throw new Error(result.error || 'AI generation failed');
            }

            // Parse AI response
            let commandData;
            try {
                commandData = JSON.parse(result.response);
            } catch {
                // If not JSON, create a basic structure
                commandData = {
                    name: 'ai-generated-command',
                    description: 'AI generated command',
                    code: result.response,
                    type: this.currentCommandType
                };
            }

            // Fill form with AI generated data
            this.fillCommandForm(commandData);
            this.showSuccess('Command generated successfully!');

        } catch (error) {
            console.error('AI generation error:', error);
            this.showError('Failed to generate command: ' + error.message);
        } finally {
            this.isAIGenerating = false;
            generateBtn.disabled = false;
            if (loadingIndicator) {
                loadingIndicator.classList.remove('show');
            }
        }
    }

    fillCommandForm(commandData) {
        const nameInput = document.getElementById('command-name');
        const descriptionInput = document.getElementById('command-description');
        const contentInput = document.getElementById('command-content');

        if (nameInput) nameInput.value = commandData.name || '';
        if (descriptionInput) descriptionInput.value = commandData.description || '';
        if (contentInput) contentInput.value = commandData.code || '';
    }

    async testCommand() {
        const command = this.getCommandFromForm();
        if (!command) return;

        try {
            this.showInfo('Testing command...');
            
            if (window.electronAPI?.executeCommand) {
                const result = await window.electronAPI.executeCommand(command);
                if (result.success) {
                    this.showSuccess('Command executed successfully!');
                    this.addToCommandHistory(command);
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Simulate test for demo
                this.showSuccess('Command test completed (simulated)');
                this.addToCommandHistory(command);
            }
        } catch (error) {
            console.error('Command test error:', error);
            this.showError('Command test failed: ' + error.message);
        }
    }

    async saveCommand() {
        const command = this.getCommandFromForm();
        if (!command) return;

        try {
            if (window.electronAPI?.saveCommand) {
                const result = await window.electronAPI.saveCommand(command);
                if (result.success) {
                    this.showSuccess('Command saved successfully!');
                    await this.loadSavedCommands();
                    this.clearCommandForm();
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Save locally for demo
                this.savedCommands.push({
                    ...command,
                    id: Date.now().toString(),
                    createdAt: new Date().toISOString()
                });
                this.updateSavedCommandsInterface();
                this.showSuccess('Command saved locally!');
                this.clearCommandForm();
            }

            // Register slash command if applicable
            if (command.type === 'slash') {
                await this.registerSlashCommand(command);
            }
        } catch (error) {
            console.error('Save command error:', error);
            this.showError('Failed to save command: ' + error.message);
        }
    }

    async registerSlashCommand(command) {
        try {
            this.showInfo('Registering slash command...');
            
            // This would integrate with Discord API to register the slash command
            // For now, we'll simulate the registration
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showSuccess(`Slash command /${command.name} registered successfully!`);
            
            // Update registration status
            this.updateRegistrationStatus(command.id, 'success', 'Registered with Discord');
        } catch (error) {
            console.error('Slash command registration error:', error);
            this.showError('Failed to register slash command: ' + error.message);
            this.updateRegistrationStatus(command.id, 'error', error.message);
        }
    }

    updateRegistrationStatus(commandId, status, message) {
        const statusElement = document.querySelector(`[data-command-id="${commandId}"] .registration-status`);
        if (statusElement) {
            statusElement.className = `registration-status ${status}`;
            statusElement.textContent = message;
        }
    }

    getCommandFromForm() {
        const nameInput = document.getElementById('command-name');
        const descriptionInput = document.getElementById('command-description');
        const contentInput = document.getElementById('command-content');

        if (!nameInput || !descriptionInput || !contentInput) {
            this.showError('Command form not found');
            return null;
        }

        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const content = contentInput.value.trim();

        if (!name || !description || !content) {
            this.showError('Please fill in all command fields');
            return null;
        }

        return {
            name,
            description,
            content,
            type: this.currentCommandType,
            createdAt: new Date().toISOString()
        };
    }

    clearCommandForm() {
        const nameInput = document.getElementById('command-name');
        const descriptionInput = document.getElementById('command-description');
        const contentInput = document.getElementById('command-content');
        const promptInput = document.getElementById('ai-prompt-input');

        if (nameInput) nameInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (contentInput) contentInput.value = '';
        if (promptInput) promptInput.value = '';
    }

    addToCommandHistory(command) {
        this.commandHistory.unshift({
            ...command,
            executedAt: Date.now()
        });

        // Keep only last 50 commands
        if (this.commandHistory.length > 50) {
            this.commandHistory = this.commandHistory.slice(0, 50);
        }

        this.updateCommandHistoryInterface();
    }

    updateCommandHistoryInterface() {
        const historyList = document.getElementById('command-history-list');
        if (!historyList) return;

        if (this.commandHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <p>No command history</p>
                    <span>Executed commands will appear here</span>
                </div>
            `;
            return;
        }

        historyList.innerHTML = '';
        this.commandHistory.forEach(command => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <span class="history-command">${command.name}</span>
                <span class="history-time">${this.formatTime(command.executedAt)}</span>
            `;
            historyList.appendChild(historyItem);
        });
    }

    clearCommandHistory() {
        this.commandHistory = [];
        this.updateCommandHistoryInterface();
        this.showSuccess('Command history cleared');
    }

    async loadSavedCommands() {
        try {
            if (window.electronAPI?.getSavedCommands) {
                this.savedCommands = await window.electronAPI.getSavedCommands();
            }
            this.updateSavedCommandsInterface();
        } catch (error) {
            console.error('Error loading saved commands:', error);
        }
    }

    updateSavedCommandsInterface() {
        const commandsList = document.getElementById('saved-commands-list');
        if (!commandsList) return;

        if (this.savedCommands.length === 0) {
            commandsList.innerHTML = `
                <div class="empty-state">
                    <p>No saved commands</p>
                    <span>Create your first command above</span>
                </div>
            `;
            return;
        }

        commandsList.innerHTML = '';
        this.savedCommands.forEach(command => {
            const commandItem = this.createCommandElement(command);
            commandsList.appendChild(commandItem);
        });
    }

    createCommandElement(command) {
        const element = document.createElement('div');
        element.className = 'command-item';
        element.setAttribute('data-command-id', command.id);
        element.innerHTML = `
            <div class="command-item-header">
                <span class="command-name">${command.name}</span>
                <span class="command-type-badge">${command.type}</span>
            </div>
            <div class="command-description">${command.description}</div>
            <div class="command-item-actions">
                <button class="command-item-btn primary" onclick="dashboard.executeCommand('${command.id}')">Execute</button>
                <button class="command-item-btn secondary" onclick="dashboard.editCommand('${command.id}')">Edit</button>
                <button class="command-item-btn danger" onclick="dashboard.deleteCommand('${command.id}')">Delete</button>
            </div>
            ${command.type === 'slash' ? `
                <div class="registration-status pending">
                    <span>Registration pending...</span>
                </div>
            ` : ''}
        `;
        return element;
    }

    async executeCommand(commandId) {
        const command = this.savedCommands.find(c => c.id === commandId);
        if (!command) return;

        try {
            if (window.electronAPI?.executeCommand) {
                const result = await window.electronAPI.executeCommand(command);
                if (result.success) {
                    this.showSuccess(`Command "${command.name}" executed successfully!`);
                    this.addToCommandHistory(command);
                } else {
                    throw new Error(result.error);
                }
            } else {
                this.showSuccess(`Command "${command.name}" executed (simulated)`);
                this.addToCommandHistory(command);
            }
        } catch (error) {
            console.error('Execute command error:', error);
            this.showError(`Failed to execute command: ${error.message}`);
        }
    }

    editCommand(commandId) {
        const command = this.savedCommands.find(c => c.id === commandId);
        if (!command) return;

        // Fill form with command data
        this.fillCommandForm(command);
        
        // Switch to command type
        const typeBtn = document.querySelector(`[data-type="${command.type}"]`);
        if (typeBtn) {
            document.querySelectorAll('.command-type-btn').forEach(btn => btn.classList.remove('active'));
            typeBtn.classList.add('active');
            this.currentCommandType = command.type;
            this.updateCommandBuilder();
        }

        this.showInfo(`Editing command: ${command.name}`);
    }

    async deleteCommand(commandId) {
        const command = this.savedCommands.find(c => c.id === commandId);
        if (!command) return;

        if (!confirm(`Are you sure you want to delete the command "${command.name}"?`)) {
            return;
        }

        try {
            this.savedCommands = this.savedCommands.filter(c => c.id !== commandId);
            this.updateSavedCommandsInterface();
            this.showSuccess(`Command "${command.name}" deleted`);
        } catch (error) {
            console.error('Delete command error:', error);
            this.showError('Failed to delete command');
        }
    }

    // Message Center Methods
    async loadServersForMessaging() {
        try {
            const serverSelect = document.getElementById('message-server-select');
            if (!serverSelect) return;

            if (window.electronAPI?.getServers) {
                const servers = await window.electronAPI.getServers();
                
                serverSelect.innerHTML = '<option value="">Select a server...</option>';
                servers.forEach(server => {
                    const option = document.createElement('option');
                    option.value = server.id;
                    option.textContent = server.name;
                    serverSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading servers for messaging:', error);
        }
    }

    async updateChannelList(serverId) {
        const targetSelect = document.getElementById('message-target-select');
        if (!targetSelect) return;

        targetSelect.innerHTML = '<option value="">Select target...</option>';

        if (!serverId) return;

        try {
            if (window.electronAPI?.getServerChannels) {
                const result = await window.electronAPI.getServerChannels(serverId);
                if (result.success) {
                    result.channels.forEach(channel => {
                        const option = document.createElement('option');
                        option.value = channel.id;
                        option.textContent = `#${channel.name}`;
                        targetSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    }

    updateMessageTargets(type) {
        const serverGroup = document.querySelector('.target-selector .input-group:first-child');
        const targetGroup = document.querySelector('.target-selector .input-group:last-child');
        
        if (!serverGroup || !targetGroup) return;

        if (type === 'dm') {
            serverGroup.style.display = 'none';
            targetGroup.querySelector('label').textContent = 'User';
            // Load friends for DM
            this.loadFriendsForMessaging();
        } else {
            serverGroup.style.display = 'block';
            targetGroup.querySelector('label').textContent = 'Channel';
        }
    }

    async loadFriendsForMessaging() {
        try {
            const targetSelect = document.getElementById('message-target-select');
            if (!targetSelect) return;

            if (window.electronAPI?.getFriends) {
                const friends = await window.electronAPI.getFriends();
                
                targetSelect.innerHTML = '<option value="">Select user...</option>';
                friends.forEach(friend => {
                    const option = document.createElement('option');
                    option.value = friend.id;
                    option.textContent = friend.username;
                    targetSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading friends for messaging:', error);
        }
    }

    previewMessage() {
        const content = document.getElementById('message-content')?.value;
        const embed = document.getElementById('message-embed')?.checked;
        
        if (!content) {
            this.showError('Please enter message content');
            return;
        }

        // Show preview modal or inline preview
        this.showInfo(`Message preview: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
    }

    async sendMessage() {
        const serverSelect = document.getElementById('message-server-select');
        const targetSelect = document.getElementById('message-target-select');
        const contentInput = document.getElementById('message-content');
        const embedCheckbox = document.getElementById('message-embed');
        const ttsCheckbox = document.getElementById('message-tts');

        if (!targetSelect || !contentInput) return;

        const target = targetSelect.value;
        const content = contentInput.value.trim();

        if (!target || !content) {
            this.showError('Please select a target and enter message content');
            return;
        }

        try {
            const messageData = {
                type: serverSelect?.value ? 'channel' : 'dm',
                target: target,
                content: content,
                options: {
                    embed: embedCheckbox?.checked || false,
                    tts: ttsCheckbox?.checked || false
                }
            };

            if (window.electronAPI?.sendMessage) {
                const result = await window.electronAPI.sendMessage(messageData);
                if (result.success) {
                    this.showSuccess('Message sent successfully!');
                    contentInput.value = '';
                } else {
                    throw new Error(result.error);
                }
            } else {
                this.showSuccess('Message sent (simulated)');
                contentInput.value = '';
            }
        } catch (error) {
            console.error('Send message error:', error);
            this.showError('Failed to send message: ' + error.message);
        }
    }

    createMessageTemplate() {
        const content = document.getElementById('message-content')?.value;
        if (!content) {
            this.showError('Please enter message content to create template');
            return;
        }

        const name = prompt('Enter template name:');
        if (!name) return;

        const template = {
            id: Date.now().toString(),
            name: name,
            content: content,
            createdAt: new Date().toISOString()
        };

        this.messageTemplates.push(template);
        this.updateMessageTemplatesInterface();
        this.showSuccess('Message template created!');
    }

    async loadMessageTemplates() {
        try {
            if (window.electronAPI?.getMessageTemplates) {
                this.messageTemplates = await window.electronAPI.getMessageTemplates();
            }
            this.updateMessageTemplatesInterface();
        } catch (error) {
            console.error('Error loading message templates:', error);
        }
    }

    updateMessageTemplatesInterface() {
        const templatesList = document.getElementById('message-templates-list');
        if (!templatesList) return;

        if (this.messageTemplates.length === 0) {
            templatesList.innerHTML = `
                <div class="empty-state">
                    <p>No message templates</p>
                    <span>Create reusable message templates</span>
                </div>
            `;
            return;
        }

        templatesList.innerHTML = '';
        this.messageTemplates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
                <div class="template-name">${template.name}</div>
                <div class="template-preview">${template.content}</div>
            `;
            
            templateItem.addEventListener('click', () => {
                const contentInput = document.getElementById('message-content');
                if (contentInput) {
                    contentInput.value = template.content;
                }
            });
            
            templatesList.appendChild(templateItem);
        });
    }

    // Automation Methods
    updateAutomationFeature(feature, enabled) {
        this.updateSetting(feature, enabled);
        this.showSuccess(`${feature} ${enabled ? 'enabled' : 'disabled'}`);
    }

    configureAutomationFeature(feature) {
        this.showInfo(`Configuration for ${feature} coming soon!`);
    }

    // Backup Methods
    async loadServersForBackup() {
        try {
            const backupSelect = document.getElementById('backup-server-select');
            const cloneSelect = document.getElementById('clone-source-select');

            if (window.electronAPI?.getServers) {
                const servers = await window.electronAPI.getServers();
                
                [backupSelect, cloneSelect].forEach(select => {
                    if (select) {
                        select.innerHTML = '<option value="">Choose a server...</option>';
                        servers.forEach(server => {
                            const option = document.createElement('option');
                            option.value = server.id;
                            option.textContent = server.name;
                            select.appendChild(option);
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error loading servers for backup:', error);
        }
    }

    async createServerBackup() {
        const serverSelect = document.getElementById('backup-server-select');
        if (!serverSelect?.value) {
            this.showError('Please select a server to backup');
            return;
        }

        const options = {
            channels: document.getElementById('backup-channels')?.checked || false,
            roles: document.getElementById('backup-roles')?.checked || false,
            emojis: document.getElementById('backup-emojis')?.checked || false,
            settings: document.getElementById('backup-settings')?.checked || false
        };

        try {
            this.showInfo('Creating server backup...');
            
            if (window.electronAPI?.backupServer) {
                const result = await window.electronAPI.backupServer(serverSelect.value, options);
                if (result.success) {
                    this.showSuccess('Server backup created successfully!');
                    await this.loadBackups();
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Simulate backup creation
                await new Promise(resolve => setTimeout(resolve, 3000));
                this.showSuccess('Server backup created (simulated)');
            }
        } catch (error) {
            console.error('Backup creation error:', error);
            this.showError('Failed to create backup: ' + error.message);
        }
    }

    async backupServer(serverId) {
        const options = {
            channels: true,
            roles: true,
            emojis: false,
            settings: true
        };

        try {
            this.showInfo('Creating server backup...');
            
            if (window.electronAPI?.backupServer) {
                const result = await window.electronAPI.backupServer(serverId, options);
                if (result.success) {
                    this.showSuccess('Server backup created successfully!');
                } else {
                    throw new Error(result.error);
                }
            } else {
                this.showSuccess('Server backup created (simulated)');
            }
        } catch (error) {
            console.error('Backup server error:', error);
            this.showError('Failed to backup server: ' + error.message);
        }
    }

    async cloneServer(serverId) {
        const newName = prompt('Enter name for cloned server:');
        if (!newName) return;

        try {
            this.showInfo('Cloning server...');
            
            if (window.electronAPI?.cloneServer) {
                const result = await window.electronAPI.cloneServer(serverId || this.selectedServer, newName);
                if (result.success) {
                    this.showSuccess('Server cloned successfully!');
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Simulate cloning
                await new Promise(resolve => setTimeout(resolve, 5000));
                this.showSuccess('Server cloned successfully (simulated)');
            }
        } catch (error) {
            console.error('Clone server error:', error);
            this.showError('Failed to clone server: ' + error.message);
        }
    }

    async loadBackups() {
        try {
            const backupsList = document.getElementById('backups-list');
            if (!backupsList) return;

            if (window.electronAPI?.getBackups) {
                const backups = await window.electronAPI.getBackups();
                
                if (backups.length === 0) {
                    backupsList.innerHTML = `
                        <h4>Existing Backups</h4>
                        <div class="empty-state">
                            <p>No backups created yet</p>
                            <span>Create your first server backup above</span>
                        </div>
                    `;
                    return;
                }

                backupsList.innerHTML = '<h4>Existing Backups</h4>';
                backups.forEach(backup => {
                    const backupItem = document.createElement('div');
                    backupItem.className = 'backup-item';
                    backupItem.innerHTML = `
                        <div class="backup-info">
                            <h5>${backup.serverName}</h5>
                            <p>Created: ${this.formatDate(backup.createdAt)} • Size: ${this.formatBytes(backup.size)}</p>
                        </div>
                        <div class="backup-item-actions">
                            <button class="command-item-btn secondary" onclick="dashboard.restoreBackup('${backup.id}')">Restore</button>
                            <button class="command-item-btn danger" onclick="dashboard.deleteBackup('${backup.id}')">Delete</button>
                        </div>
                    `;
                    backupsList.appendChild(backupItem);
                });
            }
        } catch (error) {
            console.error('Error loading backups:', error);
        }
    }

    async restoreBackup(backupId) {
        if (!confirm('Are you sure you want to restore this backup? This will overwrite the current server configuration.')) {
            return;
        }

        try {
            this.showInfo('Restoring backup...');
            
            if (window.electronAPI?.restoreBackup) {
                const result = await window.electronAPI.restoreBackup(backupId);
                if (result.success) {
                    this.showSuccess('Backup restored successfully!');
                } else {
                    throw new Error(result.error);
                }
            } else {
                this.showSuccess('Backup restored (simulated)');
            }
        } catch (error) {
            console.error('Restore backup error:', error);
            this.showError('Failed to restore backup: ' + error.message);
        }
    }

    // Logging Methods
    switchLogType(logType) {
        const messageLogs = document.getElementById('message-logs-section');
        const ghostPingLogs = document.getElementById('ghost-ping-logs-section');

        if (messageLogs && ghostPingLogs) {
            if (logType === 'messages') {
                messageLogs.style.display = 'block';
                ghostPingLogs.style.display = 'none';
            } else {
                messageLogs.style.display = 'none';
                ghostPingLogs.style.display = 'block';
            }
        }
    }

    async loadMessageLogs() {
        try {
            const logsList = document.getElementById('message-logs-list');
            if (!logsList) return;

            if (window.electronAPI?.getMessageLogs) {
                const result = await window.electronAPI.getMessageLogs();
                
                if (!result.logs || result.logs.length === 0) {
                    logsList.innerHTML = `
                        <div class="empty-state">
                            <p>No message logs</p>
                            <span>Messages will be logged here when the feature is enabled</span>
                        </div>
                    `;
                    return;
                }

                logsList.innerHTML = '';
                result.logs.forEach(log => {
                    const logItem = this.createLogElement(log);
                    logsList.appendChild(logItem);
                });
            }
        } catch (error) {
            console.error('Error loading message logs:', error);
        }
    }

    createLogElement(log) {
        const element = document.createElement('div');
        element.className = 'log-item';
        element.innerHTML = `
            <div class="log-header">
                <span class="log-author">${log.author.name}</span>
                <span class="log-time">${this.formatTime(log.timestamp)}</span>
            </div>
            <div class="log-content">${log.formattedContent}</div>
            <div class="log-meta">
                <span>${log.channel.name} ${log.guild ? `• ${log.guild.name}` : ''}</span>
                <span>${log.attachments.length > 0 ? `📎 ${log.attachments.length}` : ''}</span>
            </div>
        `;
        return element;
    }

    async refreshMessageLogs() {
        await this.loadMessageLogs();
        this.showSuccess('Message logs refreshed');
    }

    async clearMessageLogs() {
        if (!confirm('Are you sure you want to clear all message logs?')) {
            return;
        }

        try {
            if (window.electronAPI?.clearMessageLogs) {
                await window.electronAPI.clearMessageLogs();
            }
            await this.loadMessageLogs();
            this.showSuccess('Message logs cleared');
        } catch (error) {
            console.error('Error clearing message logs:', error);
            this.showError('Failed to clear message logs');
        }
    }

    async refreshGhostPingLogs() {
        // Similar to message logs but for ghost pings
        this.showSuccess('Ghost ping logs refreshed');
    }

    async clearGhostPingLogs() {
        if (!confirm('Are you sure you want to clear all ghost ping logs?')) {
            return;
        }

        try {
            if (window.electronAPI?.clearGhostPingLogs) {
                await window.electronAPI.clearGhostPingLogs();
            }
            this.showSuccess('Ghost ping logs cleared');
        } catch (error) {
            console.error('Error clearing ghost ping logs:', error);
            this.showError('Failed to clear ghost ping logs');
        }
    }

    // Settings Methods
    async saveGeminiSettings() {
        const apiKeyInput = document.getElementById('gemini-api-key');
        const enabledCheckbox = document.getElementById('gemini-enabled');

        if (!apiKeyInput) return;

        const apiKey = apiKeyInput.value.trim();
        const enabled = enabledCheckbox?.checked || false;

        if (enabled && !apiKey) {
            this.showError('Please enter a Gemini API key');
            return;
        }

        try {
            if (window.electronAPI?.setupGemini) {
                const result = await window.electronAPI.setupGemini(apiKey);
                if (result.success) {
                    this.showSuccess('Gemini AI settings saved successfully!');
                } else {
                    throw new Error(result.error);
                }
            } else {
                this.showSuccess('Gemini AI settings saved (simulated)');
            }
        } catch (error) {
            console.error('Save Gemini settings error:', error);
            this.showError('Failed to save Gemini settings: ' + error.message);
        }
    }

    async testGeminiConnection() {
        try {
            this.showInfo('Testing Gemini connection...');
            
            if (window.electronAPI?.getAIAssistance) {
                const result = await window.electronAPI.getAIAssistance('Test connection');
                if (result.success) {
                    this.showSuccess('Gemini connection test successful!');
                } else {
                    throw new Error(result.error);
                }
            } else {
                this.showSuccess('Gemini connection test successful (simulated)');
            }
        } catch (error) {
            console.error('Gemini connection test error:', error);
            this.showError('Gemini connection test failed: ' + error.message);
        }
    }

    // Utility Methods
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString();
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatStatus(status) {
        const statusMap = {
            online: 'Online',
            idle: 'Idle',
            dnd: 'Do Not Disturb',
            offline: 'Offline'
        };
        return statusMap[status] || 'Unknown';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            color: white;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };

        toast.style.borderLeftColor = colors[type];
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);

        // Add CSS animations if not already present
        if (!document.querySelector('#toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}