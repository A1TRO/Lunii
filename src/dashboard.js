class DashboardManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.userData = null;
        this.stats = null;
        this.friends = [];
        this.blockedUsers = [];
        this.pendingFriends = [];
        this.servers = [];
        this.notifications = [];
        this.currentChat = null;
        this.currentServer = null;
        this.currentChannel = null;
        this.messages = new Map();
        this.typingUsers = new Map();
        this.contextMenu = null;
        this.currentFriendsFilter = 'all';
        this.messageLogging = false;
        this.ghostPingLogging = false;
        this.automationSettings = {
            autoGiveaway: {
                enabled: false,
                keywords: ['🎉', 'giveaway', 'react', 'win', 'prize'],
                emojis: ['🎉', '🎊', '🎁', '✨'],
                minDelay: 1000,
                maxDelay: 5000,
                maxPerHour: 10,
                verifiedOnly: true,
                requireKeywords: true
            },
            afkAutoReply: {
                enabled: false,
                message: "I'm currently AFK. I'll get back to you soon!",
                timeout: 5,
                responseLimit: 3,
                autoDetection: true,
                aiEnabled: false
            },
            statusAnimation: {
                enabled: false,
                interval: 30,
                randomOrder: false,
                messages: []
            }
        };
        
        this.init();
    }

    init() {
        this.loadAutomationSettings();
        this.setupEventListeners();
        this.setupWindowControls();
        this.loadUserData();
        this.setupRealTimeUpdates();
        this.startStatsUpdater();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });

        // Switch account
        document.getElementById('switch-account-btn').addEventListener('click', () => {
            window.electronAPI.logout();
        });

        // Profile toggles
        document.getElementById('auto-giveaway-toggle').addEventListener('change', (e) => {
            window.electronAPI.updateDiscordSetting('autoGiveaway', e.target.checked);
        });

        document.getElementById('status-animation-toggle').addEventListener('change', (e) => {
            window.electronAPI.updateDiscordSetting('statusAnimation', e.target.checked);
        });

        // Custom status
        document.getElementById('set-status-btn').addEventListener('click', () => {
            this.setCustomStatus();
        });

        document.getElementById('clear-status-btn').addEventListener('click', () => {
            this.clearCustomStatus();
        });

        // Refresh buttons
        document.getElementById('refresh-friends-btn').addEventListener('click', () => {
            this.loadFriends();
        });

        document.getElementById('refresh-servers-btn').addEventListener('click', () => {
            this.loadServers();
        });

        // Clear notifications
        document.getElementById('clear-notifications-btn').addEventListener('click', () => {
            this.clearNotifications();
        });

        // Friends filter tabs
        this.setupFriendsFilter();

        // Close server view
        document.getElementById('close-server-btn').addEventListener('click', () => {
            this.closeServerView();
        });

        // Context menu
        document.addEventListener('contextmenu', (e) => {
            this.handleContextMenu(e);
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
                if (this.currentServer) {
                    this.closeServerView();
                }
            }
        });

        // Automation settings
        this.setupAutomationSettings();

        // Log type tabs
        this.setupLogTabs();

        // Settings
        this.setupSettings();
    }

    setupFriendsFilter() {
        // Create filter tabs if they don't exist
        const friendsPage = document.getElementById('friends-page');
        const headerActions = friendsPage.querySelector('.header-actions');
        
        if (!headerActions.querySelector('.friends-filter')) {
            const filterContainer = document.createElement('div');
            filterContainer.className = 'friends-filter';
            filterContainer.innerHTML = `
                <button class="filter-tab active" data-filter="all">All</button>
                <button class="filter-tab" data-filter="online">Online</button>
                <button class="filter-tab" data-filter="pending">Pending</button>
                <button class="filter-tab" data-filter="blocked">Blocked</button>
            `;
            
            headerActions.insertBefore(filterContainer, headerActions.firstChild);
            
            // Add event listeners
            filterContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-tab')) {
                    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
                    e.target.classList.add('active');
                    this.currentFriendsFilter = e.target.dataset.filter;
                    this.renderFriends();
                }
            });
        }
    }

    setupAutomationSettings() {
        // Auto Giveaway Configuration
        document.getElementById('configure-giveaway-btn').addEventListener('click', () => {
            this.showGiveawayConfig();
        });

        document.getElementById('giveaway-cancel-btn').addEventListener('click', () => {
            this.hideGiveawayConfig();
        });

        document.getElementById('giveaway-save-btn').addEventListener('click', () => {
            this.saveGiveawayConfig();
        });

        // AFK Auto Reply Configuration
        document.getElementById('configure-afk-btn').addEventListener('click', () => {
            this.showAfkConfig();
        });

        document.getElementById('afk-cancel-btn').addEventListener('click', () => {
            this.hideAfkConfig();
        });

        document.getElementById('afk-save-btn').addEventListener('click', () => {
            this.saveAfkConfig();
        });

        // Status Animation Configuration
        document.getElementById('configure-status-btn').addEventListener('click', () => {
            this.showStatusConfig();
        });

        document.getElementById('status-cancel-btn').addEventListener('click', () => {
            this.hideStatusConfig();
        });

        document.getElementById('status-save-btn').addEventListener('click', () => {
            this.saveStatusConfig();
        });

        document.getElementById('add-status-message-btn').addEventListener('click', () => {
            this.addStatusMessage();
        });

        // Feature toggles
        document.getElementById('auto-giveaway-feature').addEventListener('change', (e) => {
            this.automationSettings.autoGiveaway.enabled = e.target.checked;
            this.saveAutomationSettings();
        });

        document.getElementById('afk-auto-reply-feature').addEventListener('change', (e) => {
            this.automationSettings.afkAutoReply.enabled = e.target.checked;
            this.saveAutomationSettings();
        });

        document.getElementById('status-animation-feature').addEventListener('change', (e) => {
            this.automationSettings.statusAnimation.enabled = e.target.checked;
            this.saveAutomationSettings();
        });
    }

    setupLogTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logType = e.target.dataset.logType;
                this.switchLogTab(logType);
            });
        });

        // Log actions
        document.getElementById('refresh-message-logs').addEventListener('click', () => {
            this.refreshMessageLogs();
        });

        document.getElementById('clear-message-logs').addEventListener('click', () => {
            this.clearMessageLogs();
        });

        document.getElementById('refresh-ghost-ping-logs').addEventListener('click', () => {
            this.refreshGhostPingLogs();
        });

        document.getElementById('clear-ghost-ping-logs').addEventListener('click', () => {
            this.clearGhostPingLogs();
        });
    }

    setupSettings() {
        // Gemini AI settings
        document.getElementById('save-gemini-settings').addEventListener('click', () => {
            this.saveGeminiSettings();
        });

        document.getElementById('test-gemini-connection').addEventListener('click', () => {
            this.testGeminiConnection();
        });

        // Message logging toggle
        const messageLoggingToggle = document.createElement('div');
        messageLoggingToggle.className = 'setting-item';
        messageLoggingToggle.innerHTML = `
            <span>Message Logging</span>
            <div class="toggle-switch">
                <input type="checkbox" id="message-logging-toggle">
                <label for="message-logging-toggle"></label>
            </div>
        `;
        
        const generalSettings = document.querySelector('.settings-section');
        generalSettings.appendChild(messageLoggingToggle);

        // Ghost ping logging toggle
        const ghostPingLoggingToggle = document.createElement('div');
        ghostPingLoggingToggle.className = 'setting-item';
        ghostPingLoggingToggle.innerHTML = `
            <span>Ghost Ping Logging</span>
            <div class="toggle-switch">
                <input type="checkbox" id="ghost-ping-logging-toggle">
                <label for="ghost-ping-logging-toggle"></label>
            </div>
        `;
        
        generalSettings.appendChild(ghostPingLoggingToggle);

        // Add event listeners
        document.getElementById('message-logging-toggle').addEventListener('change', (e) => {
            this.messageLogging = e.target.checked;
            window.electronAPI.updateDiscordSetting('messageLogging', this.messageLogging);
        });

        document.getElementById('ghost-ping-logging-toggle').addEventListener('change', (e) => {
            this.ghostPingLogging = e.target.checked;
            window.electronAPI.updateDiscordSetting('ghostPingLogging', this.ghostPingLogging);
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
    }

    setupRealTimeUpdates() {
        // Message updates
        window.electronAPI.onDiscordMessageUpdate((event, data) => {
            this.handleMessageUpdate(data);
        });

        // Presence updates
        window.electronAPI.onDiscordPresenceUpdate((event, data) => {
            this.handlePresenceUpdate(data);
        });

        // Typing updates
        window.electronAPI.onDiscordTypingUpdate((event, data) => {
            this.handleTypingUpdate(data);
        });

        window.electronAPI.onDiscordTypingStop((event, data) => {
            this.handleTypingStop(data);
        });

        // Notifications
        window.electronAPI.onDiscordNotification((event, notification) => {
            this.addNotification(notification);
        });
    }

    async loadUserData() {
        try {
            this.userData = await window.electronAPI.getDiscordUserData();
            if (this.userData) {
                this.updateUserProfile();
                this.loadFriends();
                this.loadServers();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateUserProfile() {
        if (!this.userData) return;

        document.getElementById('user-display-name').textContent = this.userData.displayName || this.userData.username;
        document.getElementById('user-avatar').src = this.userData.avatar;
        document.getElementById('profile-username').textContent = this.userData.formattedName;
        document.getElementById('profile-handle').textContent = this.userData.handle;
        document.getElementById('user-status-indicator').className = `status-indicator ${this.userData.status}`;

        // Update badges
        const badgesContainer = document.getElementById('profile-badges');
        badgesContainer.innerHTML = '';
        this.userData.badges.forEach(badge => {
            const badgeEl = document.createElement('span');
            badgeEl.className = 'badge';
            badgeEl.textContent = badge;
            badgesContainer.appendChild(badgeEl);
        });
    }

    async loadFriends() {
        try {
            const friendsData = await window.electronAPI.getDiscordFriends();
            this.friends = friendsData.friends || [];
            this.blockedUsers = friendsData.blocked || [];
            this.pendingFriends = friendsData.pending || [];
            this.renderFriends();
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    async loadServers() {
        try {
            this.servers = await window.electronAPI.getDiscordServers();
            this.renderServers();
            this.updateStats();
        } catch (error) {
            console.error('Error loading servers:', error);
        }
    }

    renderFriends() {
        const friendsList = document.getElementById('friends-list');
        friendsList.innerHTML = '';

        let displayFriends = [];
        
        switch (this.currentFriendsFilter) {
            case 'all':
                displayFriends = this.friends;
                break;
            case 'online':
                displayFriends = this.friends.filter(friend => friend.status === 'online');
                break;
            case 'pending':
                displayFriends = this.pendingFriends;
                break;
            case 'blocked':
                displayFriends = this.blockedUsers;
                break;
        }

        if (displayFriends.length === 0) {
            friendsList.innerHTML = `
                <div class="empty-state">
                    <p>No ${this.currentFriendsFilter} friends found</p>
                    <span>${this.getFriendsEmptyMessage()}</span>
                </div>
            `;
            return;
        }

        displayFriends.forEach(friend => {
            const friendEl = this.createFriendElement(friend);
            friendsList.appendChild(friendEl);
        });
    }

    createFriendElement(friend) {
        const friendEl = document.createElement('div');
        friendEl.className = 'friend-item';
        friendEl.dataset.userId = friend.id;

        const statusText = this.getStatusText(friend);
        const activityText = this.getActivityText(friend);

        friendEl.innerHTML = `
            <div class="friend-avatar">
                ${friend.avatar ? 
                    `<img src="${friend.avatar}" alt="${friend.username}">` :
                    `<div class="friend-avatar-placeholder">${friend.username.charAt(0).toUpperCase()}</div>`
                }
                <div class="friend-status-indicator ${friend.status}"></div>
            </div>
            <div class="friend-info">
                <div class="friend-name">${friend.displayName || friend.username}</div>
                <div class="friend-status">
                    <span class="friend-status-text">${statusText}</span>
                </div>
                ${activityText ? `<div class="friend-activity">${activityText}</div>` : ''}
            </div>
            <div class="friend-actions">
                <button class="friend-action-btn message" title="Send Message">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path fill-rule="evenodd" d="M1.5 1.5A.5.5 0 012 1h12a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H5.707l-3.853 3.854a.5.5 0 01-.854-.353V1.5z"/>
                    </svg>
                </button>
                ${this.currentFriendsFilter === 'blocked' ? 
                    `<button class="friend-action-btn unblock" title="Unblock User">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zM8 2a6 6 0 0 0-4.24 10.24L12.24 3.76A5.98 5.98 0 0 0 8 2zm4.24 1.76L3.76 12.24A6 6 0 0 0 12.24 3.76z"/>
                        </svg>
                    </button>` :
                    this.currentFriendsFilter === 'pending' ?
                    `<button class="friend-action-btn accept" title="Accept Friend Request">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                        </svg>
                    </button>
                    <button class="friend-action-btn decline" title="Decline Friend Request">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>` : ''
                }
            </div>
        `;

        // Add event listeners
        friendEl.querySelector('.message').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDMChat(friend);
        });

        // Add listeners for blocked/pending actions
        const unblockBtn = friendEl.querySelector('.unblock');
        if (unblockBtn) {
            unblockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.unblockUser(friend);
            });
        }

        const acceptBtn = friendEl.querySelector('.accept');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.acceptFriendRequest(friend);
            });
        }

        const declineBtn = friendEl.querySelector('.decline');
        if (declineBtn) {
            declineBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.declineFriendRequest(friend);
            });
        }

        return friendEl;
    }

    renderServers() {
        const serversGrid = document.getElementById('servers-grid');
        serversGrid.innerHTML = '';

        if (this.servers.length === 0) {
            serversGrid.innerHTML = `
                <div class="empty-state">
                    <p>No servers found</p>
                    <span>Join some servers on Discord!</span>
                </div>
            `;
            return;
        }

        this.servers.forEach(server => {
            const serverEl = this.createServerElement(server);
            serversGrid.appendChild(serverEl);
        });
    }

    createServerElement(server) {
        const serverEl = document.createElement('div');
        serverEl.className = 'server-item';
        serverEl.dataset.serverId = server.id;

        serverEl.innerHTML = `
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
                <div class="server-actions">
                    <button class="server-action-btn" title="Create Invite" data-action="invite">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
                        </svg>
                    </button>
                    <button class="server-action-btn" title="Server Settings" data-action="settings">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="server-stats">
                <span>${server.channelCount || 0} channels</span>
                <span>${server.onlineCount || 0} online</span>
            </div>
        `;

        serverEl.addEventListener('click', () => {
            this.openServerView(server);
        });

        // Server action buttons
        serverEl.querySelector('[data-action="invite"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.createServerInvite(server);
        });

        serverEl.querySelector('[data-action="settings"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showServerSettings(server);
        });

        return serverEl;
    }

    async openServerView(server) {
        this.currentServer = server;
        
        // Load server data
        const [channelsResult, membersResult] = await Promise.all([
            window.electronAPI.getGuildChannels(server.id),
            window.electronAPI.getGuildMembers(server.id)
        ]);

        if (channelsResult.success && membersResult.success) {
            this.renderServerView(server, channelsResult.channels, membersResult.members);
            this.switchPage('server-view');
        }
    }

    renderServerView(server, channels, members) {
        document.getElementById('server-name').textContent = server.name;
        
        // Render channels
        const channelsList = document.getElementById('channels-list');
        channelsList.innerHTML = '';

        // Render categories
        channels.categories.forEach(category => {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'channel-category';
            categoryEl.innerHTML = `
                <div class="category-header">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M4 6l4-4v8l-4-4z"/>
                    </svg>
                    <span>${category.name.toUpperCase()}</span>
                </div>
                <div class="category-channels">
                    ${category.channels.map(channel => this.createChannelHTML(channel)).join('')}
                </div>
            `;
            channelsList.appendChild(categoryEl);
        });

        // Render uncategorized channels
        if (channels.uncategorized.length > 0) {
            const uncategorizedEl = document.createElement('div');
            uncategorizedEl.className = 'channel-category';
            uncategorizedEl.innerHTML = `
                <div class="category-channels">
                    ${channels.uncategorized.map(channel => this.createChannelHTML(channel)).join('')}
                </div>
            `;
            channelsList.appendChild(uncategorizedEl);
        }

        // Add channel click listeners
        channelsList.addEventListener('click', (e) => {
            const channelEl = e.target.closest('.channel-item');
            if (channelEl && channelEl.dataset.channelId) {
                const channelId = channelEl.dataset.channelId;
                const channel = this.findChannelById(channels, channelId);
                if (channel && channel.type === 'text') {
                    this.openChannelChat(channel);
                }
            }
        });

        // Render members
        this.renderServerMembers(members);
    }

    createChannelHTML(channel) {
        const icon = channel.type === 'text' ? '#' : '🔊';
        return `
            <div class="channel-item ${channel.type}" data-channel-id="${channel.id}">
                <span class="channel-icon">${icon}</span>
                <span class="channel-name">${channel.name}</span>
            </div>
        `;
    }

    findChannelById(channels, channelId) {
        for (const category of channels.categories) {
            const channel = category.channels.find(ch => ch.id === channelId);
            if (channel) return channel;
        }
        return channels.uncategorized.find(ch => ch.id === channelId);
    }

    renderServerMembers(members) {
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = '';

        // Group members by status
        const statusGroups = {
            online: members.filter(m => m.presence.status === 'online'),
            idle: members.filter(m => m.presence.status === 'idle'),
            dnd: members.filter(m => m.presence.status === 'dnd'),
            offline: members.filter(m => m.presence.status === 'offline')
        };

        Object.entries(statusGroups).forEach(([status, statusMembers]) => {
            if (statusMembers.length === 0) return;

            const statusHeader = document.createElement('div');
            statusHeader.className = 'members-status-header';
            statusHeader.innerHTML = `
                <span>${status.toUpperCase()} — ${statusMembers.length}</span>
            `;
            membersList.appendChild(statusHeader);

            statusMembers.forEach(member => {
                const memberEl = this.createMemberElement(member);
                membersList.appendChild(memberEl);
            });
        });
    }

    createMemberElement(member) {
        const memberEl = document.createElement('div');
        memberEl.className = 'member-item';
        memberEl.dataset.userId = member.user.id;

        const activityText = this.getMemberActivityText(member);

        memberEl.innerHTML = `
            <div class="member-avatar">
                ${member.user.avatar ? 
                    `<img src="${member.user.avatar}" alt="${member.displayName}">` :
                    `<div class="member-avatar-placeholder">${member.displayName.charAt(0).toUpperCase()}</div>`
                }
                <div class="member-status-indicator ${member.presence.status}"></div>
            </div>
            <div class="member-info">
                <div class="member-name">${member.displayName}</div>
                ${activityText ? `<div class="member-activity">${activityText}</div>` : ''}
            </div>
        `;

        return memberEl;
    }

    async openChannelChat(channel) {
        this.currentChannel = channel;
        
        // Load messages
        const result = await window.electronAPI.getChannelMessages(channel.id, 50);
        if (result.success) {
            this.renderChannelChat(channel, result.messages);
        }
    }

    renderChannelChat(channel, messages) {
        const chatMain = document.getElementById('channel-chat');
        chatMain.innerHTML = `
            <div class="chat-header">
                <div class="channel-info">
                    <span class="channel-icon">#</span>
                    <h3>${channel.name}</h3>
                    ${channel.topic ? `<p class="channel-topic">${channel.topic}</p>` : ''}
                </div>
            </div>
            <div class="chat-messages" id="channel-messages">
                ${messages.map(msg => this.createMessageHTML(msg)).join('')}
            </div>
        `;

        // Add chat input
        const chatInputTemplate = document.getElementById('chat-input-template');
        const chatInput = chatInputTemplate.content.cloneNode(true);
        chatMain.appendChild(chatInput);

        // Setup chat input functionality
        this.setupChatInput(chatMain, 'channel', channel.id);

        // Scroll to bottom
        const messagesContainer = document.getElementById('channel-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async openDMChat(friend) {
        this.currentChat = friend;
        this.switchPage('messaging');
        
        // Load messages
        const result = await window.electronAPI.getDMMessages(friend.id, 50);
        if (result.success) {
            this.renderDMChat(friend, result.messages);
        }
    }

    renderDMChat(friend, messages) {
        const chatMain = document.getElementById('chat-main');
        chatMain.innerHTML = `
            <div class="chat-header">
                <div class="chat-user-info">
                    <div class="chat-avatar">
                        ${friend.avatar ? 
                            `<img src="${friend.avatar}" alt="${friend.username}">` :
                            `<div class="chat-avatar-placeholder">${friend.username.charAt(0).toUpperCase()}</div>`
                        }
                        <div class="chat-status-indicator ${friend.status}"></div>
                    </div>
                    <div class="chat-user-details">
                        <h3>${friend.displayName || friend.username}</h3>
                        <p>${this.getStatusText(friend)}</p>
                    </div>
                </div>
            </div>
            <div class="chat-messages" id="dm-messages">
                ${messages.map(msg => this.createMessageHTML(msg)).join('')}
            </div>
        `;

        // Add chat input
        const chatInputTemplate = document.getElementById('chat-input-template');
        const chatInput = chatInputTemplate.content.cloneNode(true);
        chatMain.appendChild(chatInput);

        // Setup chat input functionality
        this.setupChatInput(chatMain, 'dm', friend.id);

        // Scroll to bottom
        const messagesContainer = document.getElementById('dm-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageHTML(message) {
        const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        let content = this.formatMessageContent(message.content);
        
        // Add attachments
        let attachmentsHTML = '';
        if (message.attachments && message.attachments.length > 0) {
            attachmentsHTML = message.attachments.map(att => {
                if (att.contentType?.startsWith('image/')) {
                    return `<img class="message-image" src="${att.url}" alt="${att.name}" loading="lazy" onclick="this.openImageModal('${att.url}')">`;
                } else if (att.contentType?.startsWith('video/')) {
                    return `<video class="message-video" src="${att.url}" controls></video>`;
                } else {
                    return `<div class="message-attachment">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 0h8a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2z"/>
                        </svg>
                        <a href="${att.url}" target="_blank">${att.name}</a>
                        <span class="attachment-size">${this.formatFileSize(att.size)}</span>
                    </div>`;
                }
            }).join('');
        }

        // Add embeds
        let embedsHTML = '';
        if (message.embeds && message.embeds.length > 0) {
            embedsHTML = message.embeds.map(embed => this.createEmbedHTML(embed)).join('');
        }

        // Add stickers
        let stickersHTML = '';
        if (message.stickers && message.stickers.length > 0) {
            stickersHTML = message.stickers.map(sticker => 
                `<img class="message-sticker" src="${sticker.url}" alt="${sticker.name}" title="${sticker.name}">`
            ).join('');
        }

        return `
            <div class="message" data-message-id="${message.id}">
                <div class="message-avatar">
                    ${message.author.avatar ? 
                        `<img src="${message.author.avatar}" alt="${message.author.username}">` :
                        `<div class="message-avatar-placeholder">${message.author.username.charAt(0).toUpperCase()}</div>`
                    }
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">${message.author.displayName || message.author.username}</span>
                        ${message.author.bot ? '<span class="bot-badge">BOT</span>' : ''}
                        <span class="message-timestamp">${timestamp}</span>
                        ${message.editedTimestamp ? '<span class="message-edited">(edited)</span>' : ''}
                    </div>
                    ${content ? `<div class="message-text">${content}</div>` : ''}
                    ${attachmentsHTML}
                    ${embedsHTML}
                    ${stickersHTML}
                    ${message.reactions && message.reactions.length > 0 ? this.createReactionsHTML(message.reactions) : ''}
                </div>
            </div>
        `;
    }

    formatMessageContent(content) {
        if (!content) return '';

        // Enhanced markdown and Discord formatting
        return content
            // Discord mentions
            .replace(/<@!?(\d+)>/g, '<span class="mention">@user</span>')
            .replace(/<@&(\d+)>/g, '<span class="mention role">@role</span>')
            .replace(/<#(\d+)>/g, '<span class="mention channel">#channel</span>')
            // Custom emojis
            .replace(/<a?:(\w+):(\d+)>/g, '<img class="custom-emoji" src="https://cdn.discordapp.com/emojis/$2.png" alt=":$1:" title=":$1:">')
            // Standard emojis (Unicode)
            .replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, '<span class="emoji">$1</span>')
            // Markdown formatting
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            // Code blocks
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            // Links
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    }

    createEmbedHTML(embed) {
        let embedHTML = '<div class="message-embed">';
        
        if (embed.color) {
            embedHTML += `<div class="embed-color-bar" style="background-color: #${embed.color.toString(16).padStart(6, '0')}"></div>`;
        }
        
        embedHTML += '<div class="embed-content">';
        
        if (embed.author) {
            embedHTML += `<div class="embed-author">${embed.author.name}</div>`;
        }
        
        if (embed.title) {
            embedHTML += `<div class="embed-title">${embed.title}</div>`;
        }
        
        if (embed.description) {
            embedHTML += `<div class="embed-description">${embed.description}</div>`;
        }
        
        if (embed.fields && embed.fields.length > 0) {
            embedHTML += '<div class="embed-fields">';
            embed.fields.forEach(field => {
                embedHTML += `
                    <div class="embed-field ${field.inline ? 'inline' : ''}">
                        <div class="embed-field-name">${field.name}</div>
                        <div class="embed-field-value">${field.value}</div>
                    </div>
                `;
            });
            embedHTML += '</div>';
        }
        
        if (embed.image) {
            embedHTML += `<img class="embed-image" src="${embed.image.url}" alt="Embed image">`;
        }
        
        if (embed.thumbnail) {
            embedHTML += `<img class="embed-thumbnail" src="${embed.thumbnail.url}" alt="Embed thumbnail">`;
        }
        
        embedHTML += '</div></div>';
        
        return embedHTML;
    }

    createReactionsHTML(reactions) {
        return `
            <div class="message-reactions">
                ${reactions.map(reaction => `
                    <div class="reaction ${reaction.me ? 'me' : ''}">
                        <span class="reaction-emoji">${reaction.emoji.name}</span>
                        <span class="reaction-count">${reaction.count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupChatInput(container, type, targetId) {
        const textarea = container.querySelector('.chat-input');
        const sendBtn = container.querySelector('.chat-send-btn');
        
        let typingTimeout;

        textarea.addEventListener('input', () => {
            // Auto-resize textarea
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

            // Handle typing indicator
            if (type === 'channel') {
                window.electronAPI.startTyping(targetId);
            }

            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                // Stop typing after 3 seconds of inactivity
            }, 3000);
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(type, targetId, textarea.value.trim());
                textarea.value = '';
                textarea.style.height = 'auto';
            }
        });

        sendBtn.addEventListener('click', () => {
            this.sendMessage(type, targetId, textarea.value.trim());
            textarea.value = '';
            textarea.style.height = 'auto';
        });
    }

    async sendMessage(type, targetId, content) {
        if (!content) return;

        try {
            let result;
            if (type === 'channel') {
                result = await window.electronAPI.sendChannelMessage(targetId, content);
            } else if (type === 'dm') {
                result = await window.electronAPI.sendDMMessage(targetId, content);
            }

            if (result.success) {
                // Message will be added via real-time update
                console.log('Message sent successfully');
            } else {
                console.error('Failed to send message:', result.error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    handleMessageUpdate(data) {
        const { type, message, channelId } = data;
        
        if (type === 'create') {
            this.addMessageToChat(message, channelId);
        } else if (type === 'update') {
            this.updateMessageInChat(message, channelId);
        } else if (type === 'delete') {
            this.removeMessageFromChat(message.id, channelId);
        }
    }

    addMessageToChat(message, channelId) {
        let messagesContainer;
        
        if (this.currentChannel && this.currentChannel.id === channelId) {
            messagesContainer = document.getElementById('channel-messages');
        } else if (this.currentChat) {
            // For DMs, we need to check if this is the right conversation
            messagesContainer = document.getElementById('dm-messages');
        }
        
        if (messagesContainer) {
            const messageHTML = this.createMessageHTML(message);
            messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    updateMessageInChat(message, channelId) {
        const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
        if (messageEl) {
            const newMessageHTML = this.createMessageHTML(message);
            messageEl.outerHTML = newMessageHTML;
        }
    }

    removeMessageFromChat(messageId, channelId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.remove();
        }
    }

    handlePresenceUpdate(data) {
        // Update friend status in friends list
        const friendEl = document.querySelector(`[data-user-id="${data.userId}"]`);
        if (friendEl) {
            const statusIndicator = friendEl.querySelector('.friend-status-indicator, .member-status-indicator');
            if (statusIndicator) {
                statusIndicator.className = statusIndicator.className.replace(/\b(online|idle|dnd|offline)\b/g, data.status);
            }
        }
    }

    handleTypingUpdate(data) {
        const { channelId, user } = data;
        
        if (this.currentChannel && this.currentChannel.id === channelId) {
            this.showTypingIndicator(user.displayName || user.username);
        }
    }

    handleTypingStop(data) {
        const { channelId, userId } = data;
        
        if (this.currentChannel && this.currentChannel.id === channelId) {
            this.hideTypingIndicator(userId);
        }
    }

    showTypingIndicator(username) {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            const typingText = typingIndicator.querySelector('.typing-text');
            typingText.textContent = `${username} is typing...`;
            typingIndicator.style.display = 'block';
        }
    }

    hideTypingIndicator(userId) {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }

    handleContextMenu(e) {
        const friendItem = e.target.closest('.friend-item');
        const memberItem = e.target.closest('.member-item');
        
        if (friendItem || memberItem) {
            e.preventDefault();
            const userId = (friendItem || memberItem).dataset.userId;
            const user = this.friends.find(f => f.id === userId) || 
                         this.getCurrentServerMembers().find(m => m.user.id === userId);
            
            if (user) {
                this.showContextMenu(e.clientX, e.clientY, user);
            }
        }
    }

    showContextMenu(x, y, user) {
        const contextMenu = document.getElementById('context-menu');
        
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="message">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M1.5 1.5A.5.5 0 012 1h12a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H5.707l-3.853 3.854a.5.5 0 01-.854-.353V1.5z"/>
                </svg>
                Send Message
            </div>
            <div class="context-menu-item" data-action="profile">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                </svg>
                View Profile
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="copy-id">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 1.5H3a2 2 0 00-2 2V14a2 2 0 002 2h10a2 2 0 002-2V3.5a2 2 0 00-2-2h-1v1h1a1 1 0 011 1V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1h1v-1z"/>
                    <path d="M9.5 1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h3zm-3-1A1.5 1.5 0 005 1.5v1A1.5 1.5 0 006.5 4h3A1.5 1.5 0 0011 2.5v-1A1.5 1.5 0 009.5 0h-3z"/>
                </svg>
                Copy User ID
            </div>
        `;

        // Position the context menu
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';

        // Add event listeners
        contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                this.handleContextMenuAction(action, user);
                this.hideContextMenu();
            }
        });

        this.contextMenu = contextMenu;
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.display = 'none';
        this.contextMenu = null;
    }

    handleContextMenuAction(action, user) {
        switch (action) {
            case 'message':
                this.openDMChat(user);
                break;
            case 'profile':
                // Show user profile modal (implement as needed)
                console.log('Show profile for:', user);
                break;
            case 'copy-id':
                navigator.clipboard.writeText(user.id);
                break;
        }
    }

    getCurrentServerMembers() {
        // Return current server members if in server view
        const membersList = document.getElementById('members-list');
        if (membersList) {
            return Array.from(membersList.querySelectorAll('.member-item')).map(el => ({
                user: { id: el.dataset.userId }
            }));
        }
        return [];
    }

    getStatusText(friend) {
        const statusMap = {
            online: 'Online',
            idle: 'Away',
            dnd: 'Do Not Disturb',
            offline: 'Offline'
        };
        return statusMap[friend.status] || 'Unknown';
    }

    getActivityText(friend) {
        if (friend.activities && friend.activities.length > 0) {
            const activity = friend.activities[0];
            return activity.name;
        }
        return null;
    }

    getMemberActivityText(member) {
        if (member.presence.activities && member.presence.activities.length > 0) {
            const activity = member.presence.activities[0];
            return activity.name;
        }
        return null;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFriendsEmptyMessage() {
        switch (this.currentFriendsFilter) {
            case 'all':
                return 'Add some friends on Discord!';
            case 'online':
                return 'No friends are currently online';
            case 'pending':
                return 'No pending friend requests';
            case 'blocked':
                return 'No blocked users';
            default:
                return 'No friends found';
        }
    }

    async unblockUser(user) {
        try {
            const result = await window.electronAPI.unblockUser(user.id);
            if (result.success) {
                this.loadFriends(); // Refresh friends list
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
        }
    }

    async acceptFriendRequest(user) {
        try {
            const result = await window.electronAPI.acceptFriendRequest(user.id);
            if (result.success) {
                this.loadFriends(); // Refresh friends list
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    }

    async declineFriendRequest(user) {
        try {
            const result = await window.electronAPI.declineFriendRequest(user.id);
            if (result.success) {
                this.loadFriends(); // Refresh friends list
            }
        } catch (error) {
            console.error('Error declining friend request:', error);
        }
    }

    async createServerInvite(server) {
        try {
            const result = await window.electronAPI.createServerInvite(server.id);
            if (result.success) {
                // Copy invite to clipboard
                navigator.clipboard.writeText(result.inviteUrl);
                this.showToast('Invite created and copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error creating server invite:', error);
            this.showToast('Failed to create invite', 'error');
        }
    }

    showServerSettings(server) {
        // Show server settings modal (implement as needed)
        console.log('Show server settings for:', server);
    }

    openImageModal(imageUrl) {
        // Create image modal
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="image-modal-overlay">
                <div class="image-modal-content">
                    <img src="${imageUrl}" alt="Full size image">
                    <button class="image-modal-close">×</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal on click
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('image-modal-close')) {
                modal.remove();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Automation Configuration Methods
    showGiveawayConfig() {
        const panel = document.getElementById('giveaway-config-panel');
        panel.style.display = 'block';
        
        // Populate current settings
        const settings = this.automationSettings.autoGiveaway;
        document.getElementById('giveaway-keywords').value = settings.keywords.join(', ');
        document.getElementById('giveaway-emojis').value = settings.emojis.join(', ');
        document.getElementById('giveaway-min-delay').value = settings.minDelay;
        document.getElementById('giveaway-max-delay').value = settings.maxDelay;
        document.getElementById('giveaway-max-hour').value = settings.maxPerHour;
        document.getElementById('giveaway-verified-only').checked = settings.verifiedOnly;
        document.getElementById('giveaway-require-keywords').checked = settings.requireKeywords;
    }

    hideGiveawayConfig() {
        document.getElementById('giveaway-config-panel').style.display = 'none';
    }

    saveGiveawayConfig() {
        const settings = this.automationSettings.autoGiveaway;
        settings.keywords = document.getElementById('giveaway-keywords').value.split(',').map(k => k.trim());
        settings.emojis = document.getElementById('giveaway-emojis').value.split(',').map(e => e.trim());
        settings.minDelay = parseInt(document.getElementById('giveaway-min-delay').value);
        settings.maxDelay = parseInt(document.getElementById('giveaway-max-delay').value);
        settings.maxPerHour = parseInt(document.getElementById('giveaway-max-hour').value);
        settings.verifiedOnly = document.getElementById('giveaway-verified-only').checked;
        settings.requireKeywords = document.getElementById('giveaway-require-keywords').checked;
        
        this.saveAutomationSettings();
        this.hideGiveawayConfig();
        this.showToast('Giveaway settings saved!', 'success');
    }

    showAfkConfig() {
        const panel = document.getElementById('afk-config-panel');
        panel.style.display = 'block';
        
        // Populate current settings
        const settings = this.automationSettings.afkAutoReply;
        document.getElementById('afk-message').value = settings.message;
        document.getElementById('afk-timeout').value = settings.timeout;
        document.getElementById('afk-response-limit').value = settings.responseLimit;
        document.getElementById('afk-auto-detection').checked = settings.autoDetection;
        document.getElementById('afk-ai-enabled').checked = settings.aiEnabled;
    }

    hideAfkConfig() {
        document.getElementById('afk-config-panel').style.display = 'none';
    }

    saveAfkConfig() {
        const settings = this.automationSettings.afkAutoReply;
        settings.message = document.getElementById('afk-message').value;
        settings.timeout = parseInt(document.getElementById('afk-timeout').value);
        settings.responseLimit = parseInt(document.getElementById('afk-response-limit').value);
        settings.autoDetection = document.getElementById('afk-auto-detection').checked;
        settings.aiEnabled = document.getElementById('afk-ai-enabled').checked;
        
        this.saveAutomationSettings();
        this.hideAfkConfig();
        this.showToast('AFK settings saved!', 'success');
    }

    showStatusConfig() {
        const panel = document.getElementById('status-config-panel');
        panel.style.display = 'block';
        
        // Populate current settings
        const settings = this.automationSettings.statusAnimation;
        document.getElementById('status-interval').value = settings.interval;
        document.getElementById('status-random-order').checked = settings.randomOrder;
        
        this.renderStatusMessages();
    }

    hideStatusConfig() {
        document.getElementById('status-config-panel').style.display = 'none';
    }

    saveStatusConfig() {
        const settings = this.automationSettings.statusAnimation;
        settings.interval = parseInt(document.getElementById('status-interval').value);
        settings.randomOrder = document.getElementById('status-random-order').checked;
        
        // Collect status messages
        const messageInputs = document.querySelectorAll('.status-message-item input');
        settings.messages = Array.from(messageInputs).map(input => input.value).filter(msg => msg.trim());
        
        this.saveAutomationSettings();
        this.hideStatusConfig();
        this.showToast('Status animation settings saved!', 'success');
    }

    renderStatusMessages() {
        const container = document.getElementById('status-messages-list');
        container.innerHTML = '';
        
        this.automationSettings.statusAnimation.messages.forEach((message, index) => {
            this.addStatusMessageElement(container, message, index);
        });
        
        // Add empty one if none exist
        if (this.automationSettings.statusAnimation.messages.length === 0) {
            this.addStatusMessageElement(container, '', 0);
        }
    }

    addStatusMessage() {
        const container = document.getElementById('status-messages-list');
        const index = container.children.length;
        this.addStatusMessageElement(container, '', index);
    }

    addStatusMessageElement(container, message, index) {
        const messageEl = document.createElement('div');
        messageEl.className = 'status-message-item';
        messageEl.innerHTML = `
            <input type="text" placeholder="Enter status message..." value="${message}">
            <button class="remove-status-btn" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(messageEl);
    }

    saveAutomationSettings() {
        // Save to localStorage or send to main process
        localStorage.setItem('automationSettings', JSON.stringify(this.automationSettings));
        window.electronAPI.updateDiscordSetting('automation', this.automationSettings);
    }

    loadAutomationSettings() {
        const saved = localStorage.getItem('automationSettings');
        if (saved) {
            this.automationSettings = { ...this.automationSettings, ...JSON.parse(saved) };
        }
    }

    // Log Management Methods
    switchLogTab(logType) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-log-type="${logType}"]`).classList.add('active');
        
        document.querySelectorAll('.logs-section').forEach(section => {
            section.style.display = 'none';
        });
        
        document.getElementById(`${logType}-logs-section`).style.display = 'block';
    }

    refreshMessageLogs() {
        // Implement message log refresh
        this.showToast('Message logs refreshed', 'info');
    }

    clearMessageLogs() {
        // Implement message log clearing
        this.showToast('Message logs cleared', 'info');
    }

    refreshGhostPingLogs() {
        // Implement ghost ping log refresh
        this.showToast('Ghost ping logs refreshed', 'info');
    }

    clearGhostPingLogs() {
        // Implement ghost ping log clearing
        this.showToast('Ghost ping logs cleared', 'info');
    }

    // Settings Methods
    saveGeminiSettings() {
        const apiKey = document.getElementById('gemini-api-key').value;
        const enabled = document.getElementById('gemini-enabled').checked;
        
        window.electronAPI.updateDiscordSetting('geminiApiKey', apiKey);
        window.electronAPI.updateDiscordSetting('geminiEnabled', enabled);
        
        this.showToast('Gemini settings saved!', 'success');
    }

    async testGeminiConnection() {
        const apiKey = document.getElementById('gemini-api-key').value;
        if (!apiKey) {
            this.showToast('Please enter an API key first', 'warning');
            return;
        }
        
        try {
            const result = await window.electronAPI.testGeminiConnection(apiKey);
            if (result.success) {
                this.showToast('Gemini connection successful!', 'success');
            } else {
                this.showToast('Gemini connection failed: ' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('Connection test failed', 'error');
        }
    }

    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(15, 23, 42, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    switchPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Update content
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });
        
        if (page === 'server-view') {
            document.getElementById('server-view-page').style.display = 'block';
            document.getElementById('server-view-page').classList.add('active');
        } else {
            document.getElementById('server-view-page').style.display = 'none';
            document.getElementById(`${page}-page`)?.classList.add('active');
        }

        this.currentPage = page;
    }

    closeServerView() {
        this.currentServer = null;
        this.currentChannel = null;
        this.switchPage('servers');
    }

    updateStats() {
        if (this.userData) {
            document.getElementById('servers-count').textContent = this.servers.length;
            document.getElementById('friends-count').textContent = this.friends.length;

            // Update progress circles
            const serversProgress = Math.min((this.servers.length / 100) * 226, 226);
            const friendsProgress = Math.min((this.friends.length / 100) * 226, 226);

            document.querySelector('.servers-fill').style.strokeDashoffset = 226 - serversProgress;
            document.querySelector('.friends-fill').style.strokeDashoffset = 226 - friendsProgress;
        }
    }

    async setCustomStatus() {
        const status = document.getElementById('custom-status-input').value;
        const type = document.getElementById('status-type-select').value;

        try {
            await window.electronAPI.updateDiscordSetting('customStatus', status);
            await window.electronAPI.updateDiscordSetting('status', type);
        } catch (error) {
            console.error('Error setting custom status:', error);
        }
    }

    async clearCustomStatus() {
        document.getElementById('custom-status-input').value = '';
        
        try {
            await window.electronAPI.updateDiscordSetting('customStatus', '');
        } catch (error) {
            console.error('Error clearing custom status:', error);
        }
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        this.renderNotifications();
    }

    renderNotifications() {
        const notificationsList = document.getElementById('notifications-list');
        const notificationCount = document.getElementById('notification-count');

        notificationCount.textContent = this.notifications.length;

        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="empty-state">
                    <p>No notifications</p>
                    <span>You're all caught up!</span>
                </div>
            `;
            return;
        }

        notificationsList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item">
                <div class="notification-header">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
                <div class="notification-content">${notification.content}</div>
                <div class="notification-meta">
                    <div class="notification-type ${notification.type}">${notification.type}</div>
                    <div class="notification-source">${notification.guild || notification.channel}</div>
                </div>
            </div>
        `).join('');
    }

    clearNotifications() {
        this.notifications = [];
        this.renderNotifications();
    }

    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    }

    startStatsUpdater() {
        setInterval(async () => {
            try {
                this.stats = await window.electronAPI.getDiscordStats();
                if (this.stats && this.stats.uptime) {
                    const uptime = this.stats.uptime;
                    document.getElementById('uptime-display').textContent = 
                        `${uptime.days}d ${uptime.hours}h ${uptime.minutes}m`;
                }
            } catch (error) {
                console.error('Error updating stats:', error);
            }
        }, 60000); // Update every minute
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});