class DashboardManager {
    constructor() {
        this.currentPage = 'overview';
        this.notifications = [];
        this.maxNotifications = 50;
        this.uptime = { start: Date.now() };
        this.config = {};
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupWindowControls();
        this.setupEventListeners();
        this.loadUserData();
        this.startUptimeCounter();
        this.loadConfiguration();
        
        // Setup notification listener
        window.electronAPI.onDiscordNotification((event, notification) => {
            this.addNotification(notification);
        });
    }

    async loadConfiguration() {
        try {
            this.config = await window.electronAPI.invoke('discord-get-config');
            this.updateConfigurationUI();
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }

    updateConfigurationUI() {
        // Update giveaway settings
        if (this.config.giveaway) {
            const autoGiveawayToggle = document.getElementById('auto-giveaway-toggle');
            if (autoGiveawayToggle) {
                autoGiveawayToggle.checked = this.config.giveaway.enabled;
            }
        }

        // Update AFK settings
        if (this.config.afk) {
            // AFK settings will be updated in the settings page
        }

        // Update status animation settings
        if (this.config.statusAnimation) {
            // Status animation settings will be updated in the settings page
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pageContents = document.querySelectorAll('.page-content');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
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
        this.loadPageData(page);
    }

    async loadPageData(page) {
        switch (page) {
            case 'overview':
                await this.loadOverviewData();
                break;
            case 'friends':
                await this.loadFriendsData();
                break;
            case 'servers':
                await this.loadServersData();
                break;
            case 'commands':
                await this.loadCommandsData();
                break;
            case 'messaging':
                await this.loadMessagingData();
                break;
            case 'automation':
                await this.loadAutomationData();
                break;
            case 'backup':
                await this.loadBackupData();
                break;
            case 'logs':
                await this.loadLogsData();
                break;
            case 'settings':
                await this.loadSettingsData();
                break;
        }
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
        this.setupToggle('auto-giveaway-toggle', 'autoGiveaway');
        this.setupToggle('message-logger-toggle', 'messageLogger');
        this.setupToggle('anti-ghost-ping-toggle', 'antiGhostPing');

        // Status update
        document.getElementById('update-status-btn').addEventListener('click', () => {
            this.updateCustomStatus();
        });

        document.getElementById('clear-status-btn').addEventListener('click', () => {
            this.clearCustomStatus();
        });

        // Notification actions
        document.getElementById('clear-notifications-btn').addEventListener('click', () => {
            this.clearNotifications();
        });

        // Refresh buttons
        document.getElementById('refresh-friends-btn')?.addEventListener('click', () => {
            this.loadFriendsData();
        });

        document.getElementById('refresh-servers-btn')?.addEventListener('click', () => {
            this.loadServersData();
        });

        // Giveaway settings
        this.setupGiveawaySettings();
        
        // AFK settings
        this.setupAFKSettings();
        
        // Status animation settings
        this.setupStatusAnimationSettings();
    }

    setupGiveawaySettings() {
        // Giveaway configuration modal/panel setup would go here
        const giveawayToggle = document.getElementById('auto-giveaway-feature');
        if (giveawayToggle) {
            giveawayToggle.addEventListener('change', async (e) => {
                try {
                    await window.electronAPI.invoke('discord-set-giveaway-settings', {
                        enabled: e.target.checked
                    });
                    this.showToast('Giveaway settings updated', 'success');
                } catch (error) {
                    this.showToast('Failed to update giveaway settings', 'error');
                }
            });
        }
    }

    setupAFKSettings() {
        const afkToggle = document.getElementById('afk-auto-reply-feature');
        if (afkToggle) {
            afkToggle.addEventListener('change', async (e) => {
                try {
                    await window.electronAPI.invoke('discord-set-afk', {
                        enabled: e.target.checked
                    });
                    this.showToast('AFK settings updated', 'success');
                } catch (error) {
                    this.showToast('Failed to update AFK settings', 'error');
                }
            });
        }
    }

    setupStatusAnimationSettings() {
        const statusToggle = document.getElementById('status-animation-feature');
        if (statusToggle) {
            statusToggle.addEventListener('change', async (e) => {
                try {
                    await window.electronAPI.invoke('discord-set-status-animation', {
                        enabled: e.target.checked
                    });
                    this.showToast('Status animation updated', 'success');
                } catch (error) {
                    this.showToast('Failed to update status animation', 'error');
                }
            });
        }
    }

    setupToggle(toggleId, setting) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.addEventListener('change', async (e) => {
                try {
                    await window.electronAPI.updateDiscordSetting(setting, e.target.checked);
                } catch (error) {
                    console.error(`Error updating ${setting}:`, error);
                    e.target.checked = !e.target.checked; // Revert on error
                }
            });
        }
    }

    async loadUserData() {
        try {
            const userData = await window.electronAPI.getDiscordUserData();
            if (userData) {
                this.updateUserProfile(userData);
            }

            const stats = await window.electronAPI.getDiscordStats();
            if (stats) {
                this.updateStats(stats);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateUserProfile(userData) {
        // Update greeting
        const greeting = document.getElementById('user-greeting');
        if (greeting) {
            greeting.textContent = userData.displayName || userData.username;
        }

        // Update profile info
        const displayName = document.getElementById('user-display-name');
        const username = document.getElementById('user-username');
        const avatar = document.getElementById('user-avatar');

        if (displayName) displayName.textContent = userData.formattedName;
        if (username) username.textContent = `@${userData.username}`;
        if (avatar) avatar.src = userData.avatar;

        // Update badges
        const badgesContainer = document.getElementById('user-badges');
        if (badgesContainer && userData.badges) {
            badgesContainer.innerHTML = '';
            userData.badges.forEach(badge => {
                const badgeEl = document.createElement('span');
                badgeEl.className = 'badge';
                badgeEl.textContent = badge;
                badgesContainer.appendChild(badgeEl);
            });
        }

        // Update stats circles
        this.updateStatCircle('servers', userData.servers, 100);
        this.updateStatCircle('friends', userData.friends, 1000);
    }

    updateStatCircle(type, value, max) {
        const countEl = document.getElementById(`${type}-count`);
        const progressEl = document.getElementById(`${type}-progress`);

        if (countEl) countEl.textContent = value;
        if (progressEl) {
            const percentage = Math.min((value / max) * 100, 100);
            const circumference = 2 * Math.PI * 36; // radius = 36
            const offset = circumference - (percentage / 100) * circumference;
            progressEl.style.strokeDashoffset = offset;
        }
    }

    updateStats(stats) {
        // Update commands used
        const commandsUsed = document.getElementById('commands-used');
        if (commandsUsed) {
            commandsUsed.textContent = stats.commandsUsed || 0;
        }

        // Update connection status
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.textContent = stats.isReady ? 'Connected' : 'Disconnected';
            connectionStatus.className = stats.isReady ? 'detail-value status-active' : 'detail-value';
        }

        // Update additional stats if available
        if (stats.giveawaysJoined !== undefined) {
            const giveawayStats = document.getElementById('giveaways-joined');
            if (giveawayStats) {
                giveawayStats.textContent = stats.giveawaysJoined;
            }
        }

        if (stats.afkRepliesSent !== undefined) {
            const afkStats = document.getElementById('afk-replies-sent');
            if (afkStats) {
                afkStats.textContent = stats.afkRepliesSent;
            }
        }
    }

    startUptimeCounter() {
        setInterval(() => {
            this.updateUptime();
        }, 1000);
    }

    updateUptime() {
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
    }

    async updateCustomStatus() {
        const statusInput = document.getElementById('custom-status-input');
        const statusType = document.getElementById('status-type-select');
        
        if (!statusInput || !statusType) return;

        try {
            await window.electronAPI.updateDiscordSetting('customStatus', statusInput.value);
            await window.electronAPI.updateDiscordSetting('status', statusType.value);
            this.showToast('Status updated successfully', 'success');
        } catch (error) {
            this.showToast('Failed to update status', 'error');
        }
    }

    async clearCustomStatus() {
        try {
            await window.electronAPI.updateDiscordSetting('customStatus', '');
            document.getElementById('custom-status-input').value = '';
            this.showToast('Status cleared', 'success');
        } catch (error) {
            this.showToast('Failed to clear status', 'error');
        }
    }

    addNotification(notification) {
        this.notifications.unshift({
            ...notification,
            id: Date.now().toString()
        });

        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        this.updateNotificationsList();
        this.updateNotificationCount();
    }

    updateNotificationsList() {
        const notificationsList = document.getElementById('notifications-list');
        if (!notificationsList) return;

        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="empty-state">
                    <p>No notifications yet</p>
                    <span>You'll see mentions, giveaways, and other events here</span>
                </div>
            `;
            return;
        }

        notificationsList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item" data-id="${notification.id}">
                <div class="notification-header">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
                <div class="notification-content">${notification.content}</div>
                <div class="notification-meta">
                    <span class="notification-type ${notification.type}">${notification.type}</span>
                    <span>${notification.guild || notification.channel || ''}</span>
                </div>
            </div>
        `).join('');
    }

    updateNotificationCount() {
        const countEl = document.getElementById('notification-count');
        if (countEl) {
            countEl.textContent = this.notifications.length;
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

    async loadOverviewData() {
        await this.loadUserData();
    }

    async loadFriendsData() {
        try {
            const friends = await window.electronAPI.getFriends();
            this.updateFriendsList(friends);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    updateFriendsList(friends) {
        const friendsList = document.getElementById('friends-list');
        if (!friendsList) return;

        if (!friends || friends.length === 0) {
            friendsList.innerHTML = `
                <div class="empty-state">
                    <p>No friends found</p>
                    <span>Your friends will appear here</span>
                </div>
            `;
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
                    <div class="friend-name">${friend.username}</div>
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

    async loadServersData() {
        try {
            const servers = await window.electronAPI.getServers();
            this.updateServersList(servers);
        } catch (error) {
            console.error('Error loading servers:', error);
        }
    }

    updateServersList(servers) {
        const serversList = document.getElementById('servers-grid');
        if (!serversList) return;

        if (!servers || servers.length === 0) {
            serversList.innerHTML = `
                <div class="empty-state">
                    <p>No servers found</p>
                    <span>Your servers will appear here</span>
                </div>
            `;
            return;
        }

        serversList.innerHTML = servers.map(server => `
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
                    <span>Owner: ${server.owner ? 'Yes' : 'No'}</span>
                </div>
            </div>
        `).join('');

        // Add click handlers for server items
        document.querySelectorAll('.server-item').forEach(item => {
            item.addEventListener('click', () => {
                const serverId = item.dataset.serverId;
                this.showServerDetails(serverId);
            });
        });
    }

    async showServerDetails(serverId) {
        try {
            const serverDetails = await window.electronAPI.getServerDetails(serverId);
            if (serverDetails) {
                // Show server details panel
                const detailsSection = document.getElementById('server-details-section');
                const detailsContent = document.getElementById('server-details-content');
                
                if (detailsSection && detailsContent) {
                    detailsContent.innerHTML = this.generateServerDetailsHTML(serverDetails);
                    detailsSection.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error loading server details:', error);
        }
    }

    generateServerDetailsHTML(server) {
        return `
            <div class="server-details-content">
                <div class="server-overview">
                    <h4>${server.name}</h4>
                    <div class="server-stats">
                        <div class="stat-item">
                            <span class="stat-value">${server.memberCount}</span>
                            <span class="stat-label">Members</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${server.channels?.length || 0}</span>
                            <span class="stat-label">Channels</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${server.roles?.length || 0}</span>
                            <span class="stat-label">Roles</span>
                        </div>
                    </div>
                </div>
                
                <div class="channels-section">
                    <h4>Channels</h4>
                    <div class="channels-list">
                        ${server.channels?.slice(0, 10).map(channel => `
                            <div class="channel-item">
                                <div class="channel-icon">#</div>
                                <div class="channel-name">${channel.name}</div>
                                <div class="channel-type">${channel.type}</div>
                            </div>
                        `).join('') || '<p>No channels available</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    async loadCommandsData() {
        try {
            const commands = await window.electronAPI.getSavedCommands();
            this.updateCommandsList(commands);
        } catch (error) {
            console.error('Error loading commands:', error);
        }
    }

    updateCommandsList(commands) {
        const commandsList = document.getElementById('saved-commands-list');
        if (!commandsList) return;

        if (!commands || commands.length === 0) {
            commandsList.innerHTML = `
                <div class="empty-state">
                    <p>No saved commands</p>
                    <span>Create your first command above</span>
                </div>
            `;
            return;
        }

        commandsList.innerHTML = commands.map(command => `
            <div class="command-item">
                <div class="command-item-header">
                    <div class="command-name">${command.name}</div>
                    <div class="command-type-badge">${command.type}</div>
                </div>
                <div class="command-description">${command.description || 'No description'}</div>
                <div class="command-item-actions">
                    <button class="command-item-btn primary" onclick="executeCommand('${command.id}')">Execute</button>
                    <button class="command-item-btn secondary" onclick="editCommand('${command.id}')">Edit</button>
                    <button class="command-item-btn danger" onclick="deleteCommand('${command.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async loadMessagingData() {
        try {
            const servers = await window.electronAPI.getServers();
            this.updateServerSelect(servers);
            
            const templates = await window.electronAPI.getMessageTemplates();
            this.updateTemplatesList(templates);
        } catch (error) {
            console.error('Error loading messaging data:', error);
        }
    }

    updateServerSelect(servers) {
        const serverSelect = document.getElementById('message-server-select');
        if (!serverSelect) return;

        serverSelect.innerHTML = '<option value="">Select a server...</option>' +
            servers.map(server => `<option value="${server.id}">${server.name}</option>`).join('');
    }

    updateTemplatesList(templates) {
        const templatesList = document.getElementById('message-templates-list');
        if (!templatesList) return;

        if (!templates || templates.length === 0) {
            templatesList.innerHTML = `
                <div class="empty-state">
                    <p>No message templates</p>
                    <span>Create reusable message templates</span>
                </div>
            `;
            return;
        }

        templatesList.innerHTML = templates.map(template => `
            <div class="template-item" data-template-id="${template.id}">
                <div class="template-name">${template.name}</div>
                <div class="template-preview">${template.content.substring(0, 100)}...</div>
            </div>
        `).join('');
    }

    async loadAutomationData() {
        // Load current automation settings
        try {
            const stats = await window.electronAPI.getDiscordStats();
            if (stats) {
                // Update automation toggles based on current settings
                const autoGiveawayToggle = document.getElementById('auto-giveaway-feature');
                const afkToggle = document.getElementById('afk-auto-reply-feature');
                const statusToggle = document.getElementById('status-animation-feature');

                if (autoGiveawayToggle && stats.giveawaySettings) {
                    autoGiveawayToggle.checked = stats.giveawaySettings.enabled;
                }

                if (afkToggle && stats.afkSettings) {
                    afkToggle.checked = stats.afkSettings.enabled;
                }

                if (statusToggle && stats.statusAnimation) {
                    statusToggle.checked = stats.statusAnimation.enabled;
                }
            }
        } catch (error) {
            console.error('Error loading automation data:', error);
        }
    }

    async loadBackupData() {
        try {
            const servers = await window.electronAPI.getServers();
            const backups = await window.electronAPI.getBackups();
            
            this.updateBackupServerSelect(servers);
            this.updateBackupsList(backups);
        } catch (error) {
            console.error('Error loading backup data:', error);
        }
    }

    updateBackupServerSelect(servers) {
        const backupSelect = document.getElementById('backup-server-select');
        const cloneSelect = document.getElementById('clone-source-select');
        
        const options = '<option value="">Choose a server...</option>' +
            servers.map(server => `<option value="${server.id}">${server.name}</option>`).join('');
        
        if (backupSelect) backupSelect.innerHTML = options;
        if (cloneSelect) cloneSelect.innerHTML = options;
    }

    updateBackupsList(backups) {
        const backupsList = document.getElementById('backups-list');
        if (!backupsList) return;

        const listContainer = backupsList.querySelector('.empty-state')?.parentElement || backupsList;
        
        if (!backups || backups.length === 0) {
            listContainer.innerHTML = `
                <h4>Existing Backups</h4>
                <div class="empty-state">
                    <p>No backups created yet</p>
                    <span>Create your first server backup above</span>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = `
            <h4>Existing Backups</h4>
            ${backups.map(backup => `
                <div class="backup-item">
                    <div class="backup-info">
                        <h5>${backup.serverName}</h5>
                        <p>Created: ${new Date(backup.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="backup-item-actions">
                        <button class="action-btn secondary">Download</button>
                        <button class="action-btn danger">Delete</button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    async loadLogsData() {
        try {
            const messageLogs = await window.electronAPI.getMessageLogs();
            const ghostPingLogs = await window.electronAPI.getGhostPingLogs();
            const giveawayLogs = await window.electronAPI.invoke('discord-get-giveaway-logs');
            
            this.updateMessageLogs(messageLogs.logs);
            this.updateGhostPingLogs(ghostPingLogs.logs);
            this.updateGiveawayLogs(giveawayLogs);
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }

    updateMessageLogs(logs) {
        const logsList = document.getElementById('message-logs-list');
        if (!logsList) return;

        if (!logs || logs.length === 0) {
            logsList.innerHTML = `
                <div class="empty-state">
                    <p>No message logs</p>
                    <span>Messages will be logged here when the feature is enabled</span>
                </div>
            `;
            return;
        }

        logsList.innerHTML = logs.slice(0, 50).map(log => `
            <div class="log-item">
                <div class="log-header">
                    <div class="log-author">${log.author.name}</div>
                    <div class="log-time">${this.formatTime(log.timestamp)}</div>
                </div>
                <div class="log-content">${log.formattedContent}</div>
                <div class="log-meta">
                    <span>${log.guild?.name || 'DM'} - ${log.channel.name}</span>
                </div>
            </div>
        `).join('');
    }

    updateGhostPingLogs(logs) {
        const logsList = document.getElementById('ghost-ping-logs-list');
        if (!logsList) return;

        if (!logs || logs.length === 0) {
            logsList.innerHTML = `
                <div class="empty-state">
                    <p>No ghost pings detected</p>
                    <span>Deleted mentions will be logged here</span>
                </div>
            `;
            return;
        }

        logsList.innerHTML = logs.map(log => `
            <div class="log-item">
                <div class="log-header">
                    <div class="log-author">${log.author.name}</div>
                    <div class="log-time">${this.formatTime(log.timestamp)}</div>
                </div>
                <div class="log-content">${log.formattedContent}</div>
                <div class="log-meta">
                    <span class="log-type">${log.type}</span>
                    <span>${log.guild?.name || 'DM'} - ${log.channel.name}</span>
                </div>
            </div>
        `).join('');
    }

    updateGiveawayLogs(logs) {
        // Add giveaway logs section if it doesn't exist
        const logsContainer = document.querySelector('.logs-container');
        if (!logsContainer) return;

        let giveawaySection = document.getElementById('giveaway-logs-section');
        if (!giveawaySection) {
            giveawaySection = document.createElement('div');
            giveawaySection.id = 'giveaway-logs-section';
            giveawaySection.className = 'logs-section';
            giveawaySection.style.display = 'none';
            giveawaySection.innerHTML = `
                <div class="section-header">
                    <h3>Giveaway Logs</h3>
                    <div class="log-actions">
                        <button class="action-btn secondary" id="refresh-giveaway-logs">Refresh</button>
                        <button class="action-btn secondary" id="clear-giveaway-logs">Clear</button>
                    </div>
                </div>
                <div class="logs-list" id="giveaway-logs-list"></div>
            `;
            logsContainer.appendChild(giveawaySection);

            // Add tab for giveaway logs
            const logTabs = document.querySelector('.log-type-tabs');
            if (logTabs) {
                const giveawayTab = document.createElement('button');
                giveawayTab.className = 'tab-btn';
                giveawayTab.setAttribute('data-log-type', 'giveaways');
                giveawayTab.textContent = 'Giveaways';
                logTabs.appendChild(giveawayTab);
            }
        }

        const giveawayLogsList = document.getElementById('giveaway-logs-list');
        if (!giveawayLogsList) return;

        if (!logs || logs.length === 0) {
            giveawayLogsList.innerHTML = `
                <div class="empty-state">
                    <p>No giveaways joined</p>
                    <span>Joined giveaways will be logged here</span>
                </div>
            `;
            return;
        }

        giveawayLogsList.innerHTML = logs.map(log => `
            <div class="log-item">
                <div class="log-header">
                    <div class="log-author">Joined Giveaway</div>
                    <div class="log-time">${this.formatTime(log.timestamp)}</div>
                </div>
                <div class="log-content">${log.content}</div>
                <div class="log-meta">
                    <span class="log-type">giveaway</span>
                    <span>${log.guildName} - ${log.channelName}</span>
                    <span>Emoji: ${log.emoji}</span>
                </div>
            </div>
        `).join('');
    }

    async loadSettingsData() {
        try {
            const config = await window.electronAPI.invoke('discord-get-config');
            this.updateSettingsForm(config);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    updateSettingsForm(config) {
        // Update giveaway settings
        if (config.giveaway) {
            const giveawayEnabled = document.getElementById('giveaway-enabled');
            if (giveawayEnabled) giveawayEnabled.checked = config.giveaway.enabled;
        }

        // Update AFK settings
        if (config.afk) {
            const afkEnabled = document.getElementById('afk-enabled');
            const afkTimeout = document.getElementById('afk-timeout');
            const afkMessage = document.getElementById('afk-message');
            const afkAiEnabled = document.getElementById('afk-ai-enabled');

            if (afkEnabled) afkEnabled.checked = config.afk.enabled;
            if (afkTimeout) afkTimeout.value = config.afk.timeout / 1000; // Convert to seconds
            if (afkMessage) afkMessage.value = config.afk.message;
            if (afkAiEnabled) afkAiEnabled.checked = config.afk.aiEnabled;
        }

        // Update status animation settings
        if (config.statusAnimation) {
            const statusEnabled = document.getElementById('status-animation-enabled');
            const statusInterval = document.getElementById('status-interval');

            if (statusEnabled) statusEnabled.checked = config.statusAnimation.enabled;
            if (statusInterval) statusInterval.value = config.statusAnimation.interval / 1000; // Convert to seconds
        }
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;

        // Add to page
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Global functions for command actions
window.executeCommand = async (commandId) => {
    try {
        const result = await window.electronAPI.executeCommand({ id: commandId });
        if (result.success) {
            dashboard.showToast('Command executed successfully', 'success');
        } else {
            dashboard.showToast('Failed to execute command', 'error');
        }
    } catch (error) {
        dashboard.showToast('Error executing command', 'error');
    }
};

window.editCommand = (commandId) => {
    dashboard.showToast('Edit command functionality coming soon', 'info');
};

window.deleteCommand = async (commandId) => {
    if (confirm('Are you sure you want to delete this command?')) {
        dashboard.showToast('Delete command functionality coming soon', 'info');
    }
};

// Initialize dashboard
const dashboard = new DashboardManager();

// Export for use in other scripts
window.dashboard = dashboard;