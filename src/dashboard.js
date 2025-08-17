class DashboardManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.userData = null;
        this.stats = null;
        this.friends = [];
        this.servers = [];
        this.notifications = [];
        this.currentChat = null;
        this.currentServer = null;
        this.currentChannel = null;
        this.messages = new Map();
        this.typingUsers = new Map();
        this.contextMenu = null;
        
        this.init();
    }

    init() {
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
            this.friends = await window.electronAPI.getDiscordFriends();
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

        if (this.friends.length === 0) {
            friendsList.innerHTML = `
                <div class="empty-state">
                    <p>No friends found</p>
                    <span>Add some friends on Discord!</span>
                </div>
            `;
            return;
        }

        this.friends.forEach(friend => {
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
            </div>
        `;

        // Add event listeners
        friendEl.querySelector('.message').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDMChat(friend);
        });

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
            </div>
            <div class="server-stats">
                <span>Click to view channels</span>
            </div>
        `;

        serverEl.addEventListener('click', () => {
            this.openServerView(server);
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
                    return `<img class="message-image" src="${att.url}" alt="${att.name}" loading="lazy">`;
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

        // Format mentions, emojis, etc.
        return content
            .replace(/<@!?(\d+)>/g, '<span class="mention">@user</span>')
            .replace(/<@&(\d+)>/g, '<span class="mention role">@role</span>')
            .replace(/<#(\d+)>/g, '<span class="mention channel">#channel</span>')
            .replace(/:\w+:/g, (match) => {
                // Simple emoji replacement - in a real app you'd have an emoji database
                return `<span class="emoji">${match}</span>`;
            })
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
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