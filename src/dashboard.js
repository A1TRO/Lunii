const Modal = require('./modal-manager.js');

class DashboardManager {
    constructor() {
        this.currentPage = 'overview';
        this.userData = null;
        this.stats = null;
        this.notifications = [];
        this.contextMenu = null;
        this.selectedServer = null;
        this.messageType = 'channel';
        this.logType = 'messages';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupWindowControls();
        this.setupNavigation();
        this.setupContextMenu();
        await this.loadUserData();
        await this.loadInitialData();
        this.startPeriodicUpdates();
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            window.electronAPI.logout();
        });

        // Status update
        document.getElementById('update-status-btn').addEventListener('click', () => {
            this.updateCustomStatus();
        });

        document.getElementById('clear-status-btn').addEventListener('click', () => {
            this.clearCustomStatus();
        });

        // Toggles
        document.getElementById('auto-giveaway-toggle').addEventListener('change', (e) => {
            window.electronAPI.updateDiscordSetting('autoGiveaway', e.target.checked);
        });

        // Clear notifications
        document.getElementById('clear-notifications-btn').addEventListener('click', () => {
            this.clearNotifications();
        });

        // Friends refresh
        document.getElementById('refresh-friends-btn').addEventListener('click', () => {
            this.loadFriends();
        });

        // Servers refresh
        document.getElementById('refresh-servers-btn').addEventListener('click', () => {
            this.loadServers();
        });

        // Command center
        document.getElementById('save-command-btn').addEventListener('click', () => {
            this.saveCommand();
        });

        document.getElementById('test-command-btn').addEventListener('click', () => {
            this.testCommand();
        });

        // Message center
        document.getElementById('send-message-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('preview-message-btn').addEventListener('click', () => {
            this.previewMessage();
        });

        // Message type tabs
        document.querySelectorAll('.message-type-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMessageType(e.target.dataset.type);
            });
        });

        // Server selection for messaging
        document.getElementById('message-server-select').addEventListener('change', (e) => {
            this.loadChannelsForMessaging(e.target.value);
        });

        // Message templates
        document.getElementById('create-template-btn').addEventListener('click', () => {
            this.createMessageTemplate();
        });

        // Backup and clone
        document.getElementById('create-backup-btn').addEventListener('click', () => {
            this.createServerBackup();
        });

        document.getElementById('clone-server-btn').addEventListener('click', () => {
            this.cloneServer();
        });

        // Log type tabs
        document.querySelectorAll('.log-type-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchLogType(e.target.dataset.logType);
            });
        });

        // Log actions
        document.getElementById('refresh-message-logs').addEventListener('click', () => {
            this.loadMessageLogs();
        });

        document.getElementById('clear-message-logs').addEventListener('click', () => {
            this.clearMessageLogs();
        });

        document.getElementById('refresh-ghost-ping-logs').addEventListener('click', () => {
            this.loadGhostPingLogs();
        });

        document.getElementById('clear-ghost-ping-logs').addEventListener('click', () => {
            this.clearGhostPingLogs();
        });

        // Gemini AI settings
        document.getElementById('save-gemini-settings').addEventListener('click', () => {
            this.saveGeminiSettings();
        });

        document.getElementById('test-gemini-connection').addEventListener('click', () => {
            this.testGeminiConnection();
        });

        // Listen for Discord notifications
        window.electronAPI.onDiscordNotification((event, notification) => {
            this.addNotification(notification);
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

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page-content');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetPage = item.dataset.page;
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update active page
                pages.forEach(page => page.classList.remove('active'));
                document.getElementById(`${targetPage}-page`).classList.add('active');
                
                this.currentPage = targetPage;
                this.onPageChange(targetPage);
            });
        });
    }

    setupContextMenu() {
        this.contextMenu = document.getElementById('context-menu');
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', () => {
            this.contextMenu.style.display = 'none';
        });

        // Context menu actions
        this.contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action && this.selectedServer) {
                this.handleContextMenuAction(action, this.selectedServer);
            }
            this.contextMenu.style.display = 'none';
        });
    }

    async loadUserData() {
        try {
            this.userData = await window.electronAPI.getDiscordUserData();
            if (this.userData) {
                this.updateUserProfile();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateUserProfile() {
        if (!this.userData) return;

        // Update greeting
        const greeting = document.getElementById('user-greeting');
        if (greeting) {
            greeting.textContent = this.userData.displayName || this.userData.username || 'User';
        }

        // Update profile section
        document.getElementById('user-avatar').src = this.userData.avatar;
        document.getElementById('user-display-name').textContent = this.userData.formattedName || this.userData.username;
        document.getElementById('user-username').textContent = `@${this.userData.username}`;

        // Update badges
        const badgesContainer = document.getElementById('user-badges');
        badgesContainer.innerHTML = '';
        
        if (this.userData.badges && this.userData.badges.length > 0) {
            this.userData.badges.forEach(badge => {
                const badgeEl = document.createElement('div');
                badgeEl.className = `badge ${badge.toLowerCase().replace('_', '-')}`;
                badgeEl.title = badge.replace('_', ' ');
                badgeEl.textContent = badge.charAt(0);
                badgesContainer.appendChild(badgeEl);
            });
        }

        // Update stats
        document.getElementById('servers-count').textContent = this.userData.servers || 0;
        document.getElementById('friends-count').textContent = this.userData.friends || 0;

        // Update progress circles
        this.updateProgressCircle('servers-progress', this.userData.servers, 100);
        this.updateProgressCircle('friends-progress', this.userData.friends, 1000);
    }

    updateProgressCircle(elementId, value, max) {
        const circle = document.getElementById(elementId);
        if (!circle) return;

        const percentage = Math.min((value / max) * 100, 100);
        const circumference = 2 * Math.PI * 36; // radius = 36
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        circle.style.strokeDasharray = strokeDasharray;
        circle.style.strokeDashoffset = strokeDashoffset;
    }

    async loadInitialData() {
        await this.loadStats();
        await this.loadFriends();
        await this.loadServers();
        await this.loadSavedCommands();
        await this.loadMessageTemplates();
        await this.loadBackups();
    }

    async loadStats() {
        try {
            this.stats = await window.electronAPI.getDiscordStats();
            if (this.stats) {
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStats() {
        if (!this.stats) return;

        // Update uptime
        const uptimeDisplay = document.getElementById('uptime-display');
        if (uptimeDisplay && this.stats.uptime) {
            const { days, hours, minutes, seconds } = this.stats.uptime;
            uptimeDisplay.innerHTML = `
                <span>${days}</span>d 
                <span>${hours}</span>h 
                <span>${minutes}</span>m 
                <span>${seconds}</span>s
            `;
        }

        // Update commands used
        document.getElementById('commands-used').textContent = this.stats.commandsUsed || 0;
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
        
        if (!friends || friends.length === 0) {
            friendsList.innerHTML = `
                <div class="empty-state">
                    <p>No friends found</p>
                    <span>Your Discord friends will appear here</span>
                </div>
            `;
            return;
        }

        friendsList.innerHTML = friends.map(friend => `
            <div class="friend-item">
                <div class="friend-avatar">
                    <img src="${friend.avatar}" alt="${friend.username}">
                    <div class="status-dot ${friend.status}"></div>
                </div>
                <div class="friend-info">
                    <div class="friend-name">${friend.username}</div>
                    <div class="friend-status">${friend.status}</div>
                </div>
            </div>
        `).join('');
    }

    async loadServers() {
        try {
            const servers = await window.electronAPI.getServers();
            this.displayServers(servers);
            this.populateServerSelects(servers);
        } catch (error) {
            console.error('Error loading servers:', error);
        }
    }

    displayServers(servers) {
        const serversGrid = document.getElementById('servers-grid');
        
        if (!servers || servers.length === 0) {
            serversGrid.innerHTML = `
                <div class="empty-state">
                    <p>No servers found</p>
                    <span>Your Discord servers will appear here</span>
                </div>
            `;
            return;
        }

        serversGrid.innerHTML = servers.map(server => `
            <div class="server-card" data-server-id="${server.id}">
                <div class="server-icon">
                    <img src="${server.icon || '../assets/lunii-icon.png'}" alt="${server.name}">
                </div>
                <div class="server-info">
                    <h4>${server.name}</h4>
                    <p>${server.memberCount} members</p>
                </div>
            </div>
        `).join('');

        // Add click and context menu listeners
        serversGrid.querySelectorAll('.server-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectServer(card.dataset.serverId);
            });

            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, card.dataset.serverId);
            });
        });
    }

    populateServerSelects(servers) {
        const selects = [
            'message-server-select',
            'backup-server-select',
            'clone-source-select'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select a server...</option>' +
                    servers.map(server => `
                        <option value="${server.id}">${server.name}</option>
                    `).join('');
            }
        });
    }

    async selectServer(serverId) {
        try {
            const serverDetails = await window.electronAPI.getServerDetails(serverId);
            if (serverDetails) {
                this.displayServerDetails(serverDetails);
                this.selectedServer = serverId;
            }
        } catch (error) {
            console.error('Error loading server details:', error);
        }
    }

    displayServerDetails(server) {
        const detailsSection = document.getElementById('server-details-section');
        const detailsContent = document.getElementById('server-details-content');
        
        detailsContent.innerHTML = `
            <div class="server-overview">
                <div class="server-avatar">
                    <img src="${server.icon || '../assets/lunii-icon.png'}" alt="${server.name}">
                </div>
                <div class="server-meta">
                    <h4>${server.name}</h4>
                    <p>ID: ${server.id}</p>
                    <p>Members: ${server.memberCount}</p>
                    <p>Channels: ${server.channels?.length || 0}</p>
                </div>
            </div>
            
            <div class="server-actions-grid">
                <button class="server-action-btn" onclick="dashboard.manageChannels('${server.id}')">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M1.5 1.5A.5.5 0 012 1h12a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5v-2z"/>
                    </svg>
                    Manage Channels
                </button>
                <button class="server-action-btn" onclick="dashboard.manageMembers('${server.id}')">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7z"/>
                    </svg>
                    Manage Members
                </button>
                <button class="server-action-btn" onclick="dashboard.backupServer('${server.id}')">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 1.5H3a2 2 0 00-2 2V14a2 2 0 002 2h10a2 2 0 002-2V3.5a2 2 0 00-2-2h-1v1h1a1 1 0 011 1V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1h1v-1z"/>
                    </svg>
                    Backup Server
                </button>
                <button class="server-action-btn" onclick="dashboard.cloneServer('${server.id}')">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V2z"/>
                    </svg>
                    Clone Server
                </button>
            </div>
        `;
        
        detailsSection.style.display = 'block';
        
        // Close button
        document.getElementById('close-server-details').addEventListener('click', () => {
            detailsSection.style.display = 'none';
        });
    }

    showContextMenu(event, serverId) {
        this.selectedServer = serverId;
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = event.pageX + 'px';
        this.contextMenu.style.top = event.pageY + 'px';
    }

    async handleContextMenuAction(action, serverId) {
        switch (action) {
            case 'view-details':
                await this.selectServer(serverId);
                break;
            case 'manage-channels':
                await this.manageChannels(serverId);
                break;
            case 'manage-members':
                await this.manageMembers(serverId);
                break;
            case 'backup-server':
                await this.backupServer(serverId);
                break;
            case 'clone-server':
                await this.cloneServer(serverId);
                break;
        }
    }

    async manageChannels(serverId) {
        try {
            const result = await window.electronAPI.getServerChannels(serverId);
            if (result.success) {
                const channels = result.channels;
                
                const channelsList = channels.map(channel => 
                    `<div class="channel-item">
                        <span class="channel-name">#${channel.name}</span>
                        <span class="channel-type">${channel.type}</span>
                    </div>`
                ).join('');
                
                await Modal.alert({
                    title: 'Server Channels',
                    message: `Found ${channels.length} channels:`,
                    details: channelsList,
                    type: 'info'
                });
            }
        } catch (error) {
            await Modal.alert({
                title: 'Error',
                message: 'Failed to load server channels',
                details: error.message,
                type: 'error'
            });
        }
    }

    async manageMembers(serverId) {
        try {
            const result = await window.electronAPI.getServerMembers(serverId);
            if (result.success) {
                const members = result.members.slice(0, 10); // Show first 10 members
                
                const membersList = members.map(member => 
                    `<div class="member-item">
                        <span class="member-name">${member.displayName}</span>
                        <span class="member-status">${member.user.bot ? 'Bot' : 'User'}</span>
                    </div>`
                ).join('');
                
                await Modal.alert({
                    title: 'Server Members',
                    message: `Showing first 10 of ${result.members.length} members:`,
                    details: membersList,
                    type: 'info'
                });
            }
        } catch (error) {
            await Modal.alert({
                title: 'Error',
                message: 'Failed to load server members',
                details: error.message,
                type: 'error'
            });
        }
    }

    async loadSavedCommands() {
        try {
            const commands = await window.electronAPI.getSavedCommands();
            this.displaySavedCommands(commands);
        } catch (error) {
            console.error('Error loading saved commands:', error);
        }
    }

    displaySavedCommands(commands) {
        const commandsList = document.getElementById('saved-commands-list');
        
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
            <div class="saved-command-item">
                <div class="command-info">
                    <h5>${command.name}</h5>
                    <p>${command.description || 'No description'}</p>
                </div>
                <div class="command-item-actions">
                    <button class="command-item-btn" onclick="dashboard.executeCommand('${command.id}')">Run</button>
                    <button class="command-item-btn" onclick="dashboard.editCommand('${command.id}')">Edit</button>
                    <button class="command-item-btn" onclick="dashboard.deleteCommand('${command.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async saveCommand() {
        const name = document.getElementById('command-name').value.trim();
        const type = document.getElementById('command-type').value;
        const description = document.getElementById('command-description').value.trim();
        const content = document.getElementById('command-content').value.trim();

        if (!name || !content) {
            await Modal.alert({
                title: 'Validation Error',
                message: 'Please fill in the command name and content.',
                type: 'warning'
            });
            return;
        }

        try {
            const result = await window.electronAPI.saveCommand({
                name,
                type,
                description,
                content
            });

            if (result.success) {
                await Modal.toast({
                    title: 'Success',
                    message: 'Command saved successfully!',
                    type: 'success'
                });
                
                // Clear form
                document.getElementById('command-name').value = '';
                document.getElementById('command-description').value = '';
                document.getElementById('command-content').value = '';
                
                // Reload commands
                await this.loadSavedCommands();
            }
        } catch (error) {
            await Modal.alert({
                title: 'Error',
                message: 'Failed to save command',
                details: error.message,
                type: 'error'
            });
        }
    }

    async testCommand() {
        const content = document.getElementById('command-content').value.trim();
        
        if (!content) {
            await Modal.alert({
                title: 'No Content',
                message: 'Please enter command content to test.',
                type: 'warning'
            });
            return;
        }

        await Modal.alert({
            title: 'Test Command',
            message: 'Command test functionality would execute here.',
            details: `Content: ${content}`,
            type: 'info'
        });
    }

    async executeCommand(commandId) {
        try {
            const result = await window.electronAPI.executeCommand(commandId);
            if (result.success) {
                await Modal.toast({
                    title: 'Command Executed',
                    message: 'Command executed successfully!',
                    type: 'success'
                });
            }
        } catch (error) {
            await Modal.alert({
                title: 'Execution Error',
                message: 'Failed to execute command',
                details: error.message,
                type: 'error'
            });
        }
    }

    switchMessageType(type) {
        this.messageType = type;
        
        // Update tab buttons
        document.querySelectorAll('.message-type-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // Update UI based on type
        const serverGroup = document.querySelector('#message-server-select').parentElement;
        const targetLabel = document.querySelector('#message-target-select').previousElementSibling;
        
        if (type === 'dm') {
            serverGroup.style.display = 'none';
            targetLabel.textContent = 'User';
            this.loadUsersForMessaging();
        } else {
            serverGroup.style.display = 'block';
            targetLabel.textContent = 'Channel';
        }
    }

    async loadChannelsForMessaging(serverId) {
        if (!serverId) {
            document.getElementById('message-target-select').innerHTML = '<option value="">Select target...</option>';
            return;
        }

        try {
            const result = await window.electronAPI.getServerChannels(serverId);
            if (result.success) {
                const select = document.getElementById('message-target-select');
                select.innerHTML = '<option value="">Select a channel...</option>' +
                    result.channels
                        .filter(channel => channel.type === 'text')
                        .map(channel => `<option value="${channel.id}">#${channel.name}</option>`)
                        .join('');
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    }

    async loadUsersForMessaging() {
        try {
            const friends = await window.electronAPI.getFriends();
            const select = document.getElementById('message-target-select');
            select.innerHTML = '<option value="">Select a user...</option>' +
                friends.map(friend => `<option value="${friend.id}">${friend.username}</option>`).join('');
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async sendMessage() {
        const serverId = document.getElementById('message-server-select').value;
        const targetId = document.getElementById('message-target-select').value;
        const content = document.getElementById('message-content').value.trim();
        const embed = document.getElementById('message-embed').checked;
        const tts = document.getElementById('message-tts').checked;

        if (!targetId || !content) {
            await Modal.alert({
                title: 'Validation Error',
                message: 'Please select a target and enter message content.',
                type: 'warning'
            });
            return;
        }

        try {
            const result = await window.electronAPI.sendMessage({
                type: this.messageType,
                target: targetId,
                content,
                options: { embed, tts }
            });

            if (result.success) {
                await Modal.toast({
                    title: 'Message Sent',
                    message: 'Your message was sent successfully!',
                    type: 'success'
                });
                
                // Clear content
                document.getElementById('message-content').value = '';
            }
        } catch (error) {
            await Modal.alert({
                title: 'Send Error',
                message: 'Failed to send message',
                details: error.message,
                type: 'error'
            });
        }
    }

    async previewMessage() {
        const content = document.getElementById('message-content').value.trim();
        const embed = document.getElementById('message-embed').checked;
        
        if (!content) {
            await Modal.alert({
                title: 'No Content',
                message: 'Please enter message content to preview.',
                type: 'warning'
            });
            return;
        }

        await Modal.alert({
            title: 'Message Preview',
            message: embed ? 'Embed Preview:' : 'Message Preview:',
            details: content,
            type: 'info'
        });
    }

    async loadMessageTemplates() {
        try {
            const templates = await window.electronAPI.getMessageTemplates();
            this.displayMessageTemplates(templates);
        } catch (error) {
            console.error('Error loading message templates:', error);
        }
    }

    displayMessageTemplates(templates) {
        const templatesList = document.getElementById('message-templates-list');
        
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
            <div class="template-item">
                <div class="template-info">
                    <h5>${template.name}</h5>
                    <p>${template.content.substring(0, 100)}${template.content.length > 100 ? '...' : ''}</p>
                </div>
                <div class="template-actions">
                    <button class="template-btn" onclick="dashboard.useTemplate('${template.id}')">Use</button>
                    <button class="template-btn" onclick="dashboard.deleteTemplate('${template.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async createMessageTemplate() {
        const name = await Modal.prompt({
            title: 'Create Template',
            message: 'Enter template name:',
            placeholder: 'Template name'
        });

        if (!name) return;

        const content = await Modal.prompt({
            title: 'Template Content',
            message: 'Enter template content:',
            placeholder: 'Template content...',
            multiline: true
        });

        if (!content) return;

        try {
            const result = await window.electronAPI.saveMessageTemplate({
                name,
                content
            });

            if (result.success) {
                await Modal.toast({
                    title: 'Template Created',
                    message: 'Message template created successfully!',
                    type: 'success'
                });
                
                await this.loadMessageTemplates();
            }
        } catch (error) {
            await Modal.alert({
                title: 'Error',
                message: 'Failed to create template',
                details: error.message,
                type: 'error'
            });
        }
    }

    async useTemplate(templateId) {
        try {
            const templates = await window.electronAPI.getMessageTemplates();
            const template = templates.find(t => t.id === templateId);
            
            if (template) {
                document.getElementById('message-content').value = template.content;
                
                await Modal.toast({
                    title: 'Template Applied',
                    message: 'Template content loaded into message composer.',
                    type: 'success'
                });
            }
        } catch (error) {
            console.error('Error using template:', error);
        }
    }

    async deleteTemplate(templateId) {
        const confirmed = await Modal.confirm({
            title: 'Delete Template',
            message: 'Are you sure you want to delete this template?',
            confirmText: 'Delete',
            danger: true
        });

        if (confirmed) {
            try {
                const result = await window.electronAPI.deleteMessageTemplate(templateId);
                if (result.success) {
                    await this.loadMessageTemplates();
                    
                    await Modal.toast({
                        title: 'Template Deleted',
                        message: 'Message template deleted successfully.',
                        type: 'success'
                    });
                }
            } catch (error) {
                await Modal.alert({
                    title: 'Error',
                    message: 'Failed to delete template',
                    details: error.message,
                    type: 'error'
                });
            }
        }
    }

    switchLogType(type) {
        this.logType = type;
        
        // Update tab buttons
        document.querySelectorAll('.log-type-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.logType === type);
        });

        // Show/hide log sections
        document.getElementById('message-logs-section').style.display = type === 'messages' ? 'block' : 'none';
        document.getElementById('ghost-ping-logs-section').style.display = type === 'ghost-pings' ? 'block' : 'none';

        // Load appropriate logs
        if (type === 'messages') {
            this.loadMessageLogs();
        } else {
            this.loadGhostPingLogs();
        }
    }

    async loadMessageLogs() {
        try {
            const result = await window.electronAPI.getMessageLogs();
            this.displayMessageLogs(result.logs);
        } catch (error) {
            console.error('Error loading message logs:', error);
        }
    }

    displayMessageLogs(logs) {
        const logsList = document.getElementById('message-logs-list');
        
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
                    <span class="log-author">${log.author.name}</span>
                    <span class="log-channel">#${log.channel.name}</span>
                    <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="log-content">${log.formattedContent}</div>
                ${log.guild ? `<div class="log-guild">${log.guild.name}</div>` : ''}
            </div>
        `).join('');
    }

    async loadGhostPingLogs() {
        try {
            const result = await window.electronAPI.getGhostPingLogs();
            this.displayGhostPingLogs(result.logs);
        } catch (error) {
            console.error('Error loading ghost ping logs:', error);
        }
    }

    displayGhostPingLogs(logs) {
        const logsList = document.getElementById('ghost-ping-logs-list');
        
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
            <div class="log-item ghost-ping">
                <div class="log-header">
                    <span class="log-author">${log.author.name}</span>
                    <span class="log-channel">#${log.channel.name}</span>
                    <span class="log-type">${log.type}</span>
                    <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="log-content">${log.formattedContent}</div>
                ${log.guild ? `<div class="log-guild">${log.guild.name}</div>` : ''}
            </div>
        `).join('');
    }

    async clearMessageLogs() {
        const confirmed = await Modal.confirm({
            title: 'Clear Message Logs',
            message: 'Are you sure you want to clear all message logs?',
            confirmText: 'Clear',
            danger: true
        });

        if (confirmed) {
            try {
                await window.electronAPI.clearMessageLogs();
                await this.loadMessageLogs();
                
                await Modal.toast({
                    title: 'Logs Cleared',
                    message: 'Message logs cleared successfully.',
                    type: 'success'
                });
            } catch (error) {
                await Modal.alert({
                    title: 'Error',
                    message: 'Failed to clear message logs',
                    details: error.message,
                    type: 'error'
                });
            }
        }
    }

    async clearGhostPingLogs() {
        const confirmed = await Modal.confirm({
            title: 'Clear Ghost Ping Logs',
            message: 'Are you sure you want to clear all ghost ping logs?',
            confirmText: 'Clear',
            danger: true
        });

        if (confirmed) {
            try {
                await window.electronAPI.clearGhostPingLogs();
                await this.loadGhostPingLogs();
                
                await Modal.toast({
                    title: 'Logs Cleared',
                    message: 'Ghost ping logs cleared successfully.',
                    type: 'success'
                });
            } catch (error) {
                await Modal.alert({
                    title: 'Error',
                    message: 'Failed to clear ghost ping logs',
                    details: error.message,
                    type: 'error'
                });
            }
        }
    }

    async loadBackups() {
        try {
            const backups = await window.electronAPI.getBackups();
            this.displayBackups(backups);
        } catch (error) {
            console.error('Error loading backups:', error);
        }
    }

    displayBackups(backups) {
        const backupsList = document.getElementById('backups-list');
        
        if (!backups || backups.length === 0) {
            backupsList.innerHTML = `
                <h4>Existing Backups</h4>
                <div class="empty-state">
                    <p>No backups created yet</p>
                    <span>Create your first server backup above</span>
                </div>
            `;
            return;
        }

        backupsList.innerHTML = `
            <h4>Existing Backups</h4>
            ${backups.map(backup => `
                <div class="backup-item">
                    <div class="backup-info">
                        <h5>${backup.serverName}</h5>
                        <p>Created: ${new Date(backup.createdAt).toLocaleString()}</p>
                        <p>Size: ${this.formatBytes(backup.size)}</p>
                    </div>
                    <div class="backup-actions">
                        <button class="backup-btn" onclick="dashboard.restoreBackup('${backup.id}')">Restore</button>
                        <button class="backup-btn danger" onclick="dashboard.deleteBackup('${backup.id}')">Delete</button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async createServerBackup() {
        const serverId = document.getElementById('backup-server-select').value;
        
        if (!serverId) {
            await Modal.alert({
                title: 'No Server Selected',
                message: 'Please select a server to backup.',
                type: 'warning'
            });
            return;
        }

        const options = {
            channels: document.getElementById('backup-channels').checked,
            roles: document.getElementById('backup-roles').checked,
            emojis: document.getElementById('backup-emojis').checked,
            settings: document.getElementById('backup-settings').checked
        };

        try {
            const loading = Modal.loading({
                title: 'Creating Backup',
                message: 'Please wait while we backup your server...'
            });

            const result = await window.electronAPI.backupServer(serverId, options);
            loading.close();

            if (result.success) {
                await Modal.alert({
                    title: 'Backup Created',
                    message: 'Server backup created successfully!',
                    type: 'success'
                });
                
                await this.loadBackups();
            } else {
                await Modal.alert({
                    title: 'Backup Failed',
                    message: result.error || 'Failed to create backup',
                    type: 'error'
                });
            }
        } catch (error) {
            await Modal.alert({
                title: 'Error',
                message: 'Failed to create backup',
                details: error.message,
                type: 'error'
            });
        }
    }

    async saveGeminiSettings() {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        
        if (!apiKey) {
            await Modal.alert({
                title: 'API Key Required',
                message: 'Please enter your Gemini API key.',
                type: 'warning'
            });
            return;
        }

        try {
            const result = await window.electronAPI.setupGemini(apiKey);
            
            if (result.success) {
                await Modal.toast({
                    title: 'Settings Saved',
                    message: 'Gemini AI settings saved successfully!',
                    type: 'success'
                });
                
                document.getElementById('gemini-enabled').checked = true;
            } else {
                await Modal.alert({
                    title: 'Setup Failed',
                    message: result.error || 'Failed to setup Gemini AI',
                    type: 'error'
                });
            }
        } catch (error) {
            await Modal.alert({
                title: 'Error',
                message: 'Failed to save Gemini settings',
                details: error.message,
                type: 'error'
            });
        }
    }

    async testGeminiConnection() {
        try {
            const loading = Modal.loading({
                title: 'Testing Connection',
                message: 'Testing Gemini AI connection...'
            });

            const result = await window.electronAPI.getAIAssistance('Hello, this is a test message.');
            loading.close();

            if (result.success) {
                await Modal.alert({
                    title: 'Connection Successful',
                    message: 'Gemini AI is working correctly!',
                    details: `Response: ${result.response}`,
                    type: 'success'
                });
            } else {
                await Modal.alert({
                    title: 'Connection Failed',
                    message: result.error || 'Failed to connect to Gemini AI',
                    type: 'error'
                });
            }
        } catch (error) {
            await Modal.alert({
                title: 'Test Failed',
                message: 'Failed to test Gemini connection',
                details: error.message,
                type: 'error'
            });
        }
    }

    async updateCustomStatus() {
        const status = document.getElementById('custom-status-input').value.trim();
        const type = document.getElementById('status-type-select').value;

        try {
            await window.electronAPI.updateDiscordSetting('customStatus', status);
            await window.electronAPI.updateDiscordSetting('status', type);
            
            await Modal.toast({
                title: 'Status Updated',
                message: 'Your custom status has been updated!',
                type: 'success'
            });
        } catch (error) {
            await Modal.alert({
                title: 'Update Failed',
                message: 'Failed to update status',
                details: error.message,
                type: 'error'
            });
        }
    }

    async clearCustomStatus() {
        try {
            await window.electronAPI.updateDiscordSetting('customStatus', '');
            document.getElementById('custom-status-input').value = '';
            
            await Modal.toast({
                title: 'Status Cleared',
                message: 'Your custom status has been cleared.',
                type: 'success'
            });
        } catch (error) {
            await Modal.alert({
                title: 'Clear Failed',
                message: 'Failed to clear status',
                details: error.message,
                type: 'error'
            });
        }
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Keep only recent notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        this.updateNotificationDisplay();
        
        // Show toast for important notifications
        if (notification.type === 'mention' || notification.type === 'warning') {
            Modal.toast({
                title: notification.title,
                message: notification.content.substring(0, 100),
                type: notification.type === 'mention' ? 'info' : notification.type,
                duration: 5000
            });
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

        notificationsList.innerHTML = this.notifications.slice(0, 20).map(notification => `
            <div class="notification-item">
                <div class="notification-icon ${notification.type}">
                    ${this.getNotificationIcon(notification.type)}
                </div>
                <div class="notification-content">
                    <div class="notification-text">${notification.title}</div>
                    <div class="notification-meta">
                        <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                        <span class="notification-channel">${notification.channel}</span>
                        ${notification.guild ? `<span class="notification-guild">${notification.guild}</span>` : ''}
                    </div>
                </div>
                <div class="notification-actions">
                    <button class="notification-action" onclick="dashboard.removeNotification(${notification.timestamp})">×</button>
                </div>
            </div>
        `).join('');
    }

    getNotificationIcon(type) {
        const icons = {
            mention: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 100-2 1 1 0 000 2z"/></svg>',
            success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0 1A8 8 0 108 0a8 8 0 000 16z"/><path d="M10.97 4.97a.235.235 0 00-.02.022L7.477 9.417 5.384 7.323a.75.75 0 00-1.06 1.061L6.97 11.03a.75.75 0 001.079-.02l3.992-4.99a.75.75 0 00-1.071-1.05z"/></svg>',
            warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8.982 1.566a1.13 1.13 0 00-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 100 2 1 1 0 000-2z"/></svg>',
            error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0 1A8 8 0 108 0a8 8 0 000 16z"/><path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/></svg>'
        };
        return icons[type] || icons.info;
    }

    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(timestamp).toLocaleDateString();
    }

    removeNotification(timestamp) {
        this.notifications = this.notifications.filter(n => n.timestamp !== timestamp);
        this.updateNotificationDisplay();
    }

    clearNotifications() {
        this.notifications = [];
        this.updateNotificationDisplay();
    }

    onPageChange(page) {
        // Load page-specific data when switching pages
        switch (page) {
            case 'friends':
                this.loadFriends();
                break;
            case 'servers':
                this.loadServers();
                break;
            case 'commands':
                this.loadSavedCommands();
                break;
            case 'messaging':
                this.loadServers(); // For server selection
                this.loadMessageTemplates();
                break;
            case 'logs':
                if (this.logType === 'messages') {
                    this.loadMessageLogs();
                } else {
                    this.loadGhostPingLogs();
                }
                break;
            case 'backup':
                this.loadServers(); // For server selection
                this.loadBackups();
                break;
        }
    }

    startPeriodicUpdates() {
        // Update stats every 30 seconds
        setInterval(() => {
            this.loadStats();
        }, 30000);

        // Update uptime display every second
        setInterval(() => {
            if (this.stats && this.stats.uptime) {
                this.updateStats();
            }
        }, 1000);
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardManager();
});

// Make dashboard available globally for onclick handlers
window.dashboard = dashboard;