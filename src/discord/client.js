const { Client } = require('discord.js-selfbot-v13');
const { ipcMain } = require('electron');

class DiscordClient {
    constructor() {
        this.client = null;
        this.isLoggedIn = false;
        this.userData = null;
        this.guilds = [];
        this.friends = [];
        this.blockedUsers = [];
        this.pendingFriends = [];
        this.messageLogging = false;
        this.ghostPingLogging = false;
        this.automationSettings = {};
        
        this.setupIPC();
    }

    setupIPC() {
        // Authentication
        ipcMain.handle('discord-get-user-data', () => this.getUserData());
        ipcMain.handle('discord-get-stats', () => this.getStats());
        ipcMain.handle('discord-update-setting', (event, setting, value) => this.updateSetting(setting, value));
        
        // Friends and relationships
        ipcMain.handle('discord-get-friends', () => this.getFriends());
        ipcMain.handle('discord-unblock-user', (event, userId) => this.unblockUser(userId));
        ipcMain.handle('discord-accept-friend-request', (event, userId) => this.acceptFriendRequest(userId));
        ipcMain.handle('discord-decline-friend-request', (event, userId) => this.declineFriendRequest(userId));
        
        // Servers
        ipcMain.handle('discord-get-servers', () => this.getServers());
        ipcMain.handle('discord-create-server-invite', (event, serverId) => this.createServerInvite(serverId));
        
        // Chat functionality
        ipcMain.handle('discord-get-channel-messages', (event, channelId, limit) => this.getChannelMessages(channelId, limit));
        ipcMain.handle('discord-get-dm-messages', (event, userId, limit) => this.getDMMessages(userId, limit));
        ipcMain.handle('discord-send-channel-message', (event, channelId, content, options) => this.sendChannelMessage(channelId, content, options));
        ipcMain.handle('discord-send-dm-message', (event, userId, content, options) => this.sendDMMessage(userId, content, options));
        ipcMain.handle('discord-start-typing', (event, channelId) => this.startTyping(channelId));
        ipcMain.handle('discord-get-guild-channels', (event, guildId) => this.getGuildChannels(guildId));
        ipcMain.handle('discord-get-guild-members', (event, guildId) => this.getGuildMembers(guildId));
        
        // AI Integration
        ipcMain.handle('test-gemini-connection', (event, apiKey) => this.testGeminiConnection(apiKey));
    }

    async login(token) {
        try {
            this.client = new Client();
            
            // Set up event listeners
            this.setupEventListeners();
            
            await this.client.login(token);
            
            // Wait for ready event
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Login timeout'));
                }, 30000);
                
                this.client.once('ready', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            
            this.isLoggedIn = true;
            await this.loadUserData();
            
            return {
                success: true,
                user: this.userData
            };
        } catch (error) {
            console.error('Discord login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    setupEventListeners() {
        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}`);
        });

        this.client.on('messageCreate', (message) => {
            this.handleMessageCreate(message);
        });

        this.client.on('messageUpdate', (oldMessage, newMessage) => {
            this.handleMessageUpdate(oldMessage, newMessage);
        });

        this.client.on('messageDelete', (message) => {
            this.handleMessageDelete(message);
        });

        this.client.on('typingStart', (typing) => {
            this.handleTypingStart(typing);
        });

        this.client.on('presenceUpdate', (oldPresence, newPresence) => {
            this.handlePresenceUpdate(oldPresence, newPresence);
        });
    }

    async loadUserData() {
        if (!this.client || !this.client.user) return;

        const user = this.client.user;
        
        this.userData = {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            displayName: user.displayName || user.username,
            formattedName: `${user.username}#${user.discriminator}`,
            handle: `@${user.username}`,
            avatar: user.displayAvatarURL({ size: 256 }),
            status: user.presence?.status || 'offline',
            badges: this.getUserBadges(user),
            createdAt: user.createdAt
        };
    }

    getUserBadges(user) {
        const badges = [];
        
        if (user.flags) {
            const flags = user.flags.toArray();
            flags.forEach(flag => {
                switch (flag) {
                    case 'Staff':
                        badges.push('Discord Staff');
                        break;
                    case 'Partner':
                        badges.push('Partner');
                        break;
                    case 'Hypesquad':
                        badges.push('HypeSquad');
                        break;
                    case 'BugHunterLevel1':
                        badges.push('Bug Hunter');
                        break;
                    case 'BugHunterLevel2':
                        badges.push('Bug Hunter Gold');
                        break;
                    case 'VerifiedDeveloper':
                        badges.push('Early Verified Bot Developer');
                        break;
                    case 'PremiumEarlySupporter':
                        badges.push('Early Supporter');
                        break;
                }
            });
        }
        
        return badges;
    }

    getUserData() {
        return this.userData;
    }

    getStats() {
        if (!this.client) return null;

        const uptime = this.client.uptime;
        const uptimeObj = {
            days: Math.floor(uptime / (1000 * 60 * 60 * 24)),
            hours: Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))
        };

        return {
            uptime: uptimeObj,
            guilds: this.client.guilds.cache.size,
            friends: this.friends.length,
            ping: this.client.ws.ping
        };
    }

    async getFriends() {
        if (!this.client) return { friends: [], blocked: [], pending: [] };

        try {
            const relationships = this.client.relationships.cache;
            
            const friends = [];
            const blocked = [];
            const pending = [];

            relationships.forEach(relationship => {
                const user = relationship.user;
                const userData = {
                    id: user.id,
                    username: user.username,
                    discriminator: user.discriminator,
                    displayName: user.displayName || user.username,
                    avatar: user.displayAvatarURL({ size: 128 }),
                    status: user.presence?.status || 'offline',
                    activities: user.presence?.activities || []
                };

                switch (relationship.type) {
                    case 'FRIEND':
                        friends.push(userData);
                        break;
                    case 'BLOCKED':
                        blocked.push(userData);
                        break;
                    case 'PENDING_INCOMING':
                    case 'PENDING_OUTGOING':
                        pending.push({
                            ...userData,
                            type: relationship.type === 'PENDING_INCOMING' ? 'incoming' : 'outgoing'
                        });
                        break;
                }
            });

            this.friends = friends;
            this.blockedUsers = blocked;
            this.pendingFriends = pending;

            return { friends, blocked, pending };
        } catch (error) {
            console.error('Error getting friends:', error);
            return { friends: [], blocked: [], pending: [] };
        }
    }

    async getServers() {
        if (!this.client) return [];

        try {
            const guilds = [];
            
            for (const [guildId, guild] of this.client.guilds.cache) {
                const guildData = {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL({ size: 128 }),
                    memberCount: guild.memberCount,
                    channelCount: guild.channels.cache.size,
                    onlineCount: guild.members.cache.filter(member => 
                        member.presence?.status === 'online'
                    ).size,
                    owner: guild.ownerId === this.client.user.id,
                    permissions: guild.members.cache.get(this.client.user.id)?.permissions.toArray() || []
                };
                
                guilds.push(guildData);
            }

            this.guilds = guilds;
            return guilds;
        } catch (error) {
            console.error('Error getting servers:', error);
            return [];
        }
    }

    async getGuildChannels(guildId) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return { success: false, error: 'Guild not found' };
            }

            const categories = [];
            const uncategorized = [];

            guild.channels.cache.forEach(channel => {
                if (channel.type === 'GUILD_CATEGORY') {
                    categories.push({
                        id: channel.id,
                        name: channel.name,
                        channels: []
                    });
                }
            });

            guild.channels.cache.forEach(channel => {
                if (channel.type === 'GUILD_TEXT' || channel.type === 'GUILD_VOICE') {
                    const channelData = {
                        id: channel.id,
                        name: channel.name,
                        type: channel.type === 'GUILD_TEXT' ? 'text' : 'voice',
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        position: channel.position
                    };

                    if (channel.parentId) {
                        const category = categories.find(cat => cat.id === channel.parentId);
                        if (category) {
                            category.channels.push(channelData);
                        } else {
                            uncategorized.push(channelData);
                        }
                    } else {
                        uncategorized.push(channelData);
                    }
                }
            });

            // Sort channels by position
            categories.forEach(category => {
                category.channels.sort((a, b) => a.position - b.position);
            });
            uncategorized.sort((a, b) => a.position - b.position);

            return {
                success: true,
                channels: {
                    categories: categories.filter(cat => cat.channels.length > 0),
                    uncategorized
                }
            };
        } catch (error) {
            console.error('Error getting guild channels:', error);
            return { success: false, error: error.message };
        }
    }

    async getGuildMembers(guildId) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return { success: false, error: 'Guild not found' };
            }

            // Fetch members if not cached
            if (guild.members.cache.size < guild.memberCount) {
                await guild.members.fetch({ limit: 100 });
            }

            const members = [];
            guild.members.cache.forEach(member => {
                members.push({
                    user: {
                        id: member.user.id,
                        username: member.user.username,
                        discriminator: member.user.discriminator,
                        avatar: member.user.displayAvatarURL({ size: 64 })
                    },
                    displayName: member.displayName,
                    nickname: member.nickname,
                    roles: member.roles.cache.map(role => ({
                        id: role.id,
                        name: role.name,
                        color: role.hexColor
                    })),
                    presence: {
                        status: member.presence?.status || 'offline',
                        activities: member.presence?.activities || []
                    },
                    joinedAt: member.joinedAt
                });
            });

            return { success: true, members };
        } catch (error) {
            console.error('Error getting guild members:', error);
            return { success: false, error: error.message };
        }
    }

    async getChannelMessages(channelId, limit = 50) {
        try {
            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                return { success: false, error: 'Channel not found' };
            }

            const messages = await channel.messages.fetch({ limit });
            const messageData = messages.map(message => this.formatMessage(message));

            return { success: true, messages: messageData.reverse() };
        } catch (error) {
            console.error('Error getting channel messages:', error);
            return { success: false, error: error.message };
        }
    }

    async getDMMessages(userId, limit = 50) {
        try {
            const user = await this.client.users.fetch(userId);
            const dmChannel = await user.createDM();
            
            const messages = await dmChannel.messages.fetch({ limit });
            const messageData = messages.map(message => this.formatMessage(message));

            return { success: true, messages: messageData.reverse() };
        } catch (error) {
            console.error('Error getting DM messages:', error);
            return { success: false, error: error.message };
        }
    }

    formatMessage(message) {
        return {
            id: message.id,
            content: message.content,
            author: {
                id: message.author.id,
                username: message.author.username,
                discriminator: message.author.discriminator,
                displayName: message.author.displayName || message.author.username,
                avatar: message.author.displayAvatarURL({ size: 64 }),
                bot: message.author.bot
            },
            timestamp: message.createdTimestamp,
            editedTimestamp: message.editedTimestamp,
            attachments: message.attachments.map(att => ({
                id: att.id,
                name: att.name,
                url: att.url,
                size: att.size,
                contentType: att.contentType
            })),
            embeds: message.embeds.map(embed => ({
                title: embed.title,
                description: embed.description,
                color: embed.color,
                author: embed.author,
                fields: embed.fields,
                image: embed.image,
                thumbnail: embed.thumbnail,
                footer: embed.footer
            })),
            stickers: message.stickers.map(sticker => ({
                id: sticker.id,
                name: sticker.name,
                url: sticker.url
            })),
            reactions: message.reactions.cache.map(reaction => ({
                emoji: {
                    name: reaction.emoji.name,
                    id: reaction.emoji.id,
                    animated: reaction.emoji.animated
                },
                count: reaction.count,
                me: reaction.me
            }))
        };
    }

    async sendChannelMessage(channelId, content, options = {}) {
        try {
            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                return { success: false, error: 'Channel not found' };
            }

            const message = await channel.send({ content, ...options });
            return { success: true, message: this.formatMessage(message) };
        } catch (error) {
            console.error('Error sending channel message:', error);
            return { success: false, error: error.message };
        }
    }

    async sendDMMessage(userId, content, options = {}) {
        try {
            const user = await this.client.users.fetch(userId);
            const dmChannel = await user.createDM();
            
            const message = await dmChannel.send({ content, ...options });
            return { success: true, message: this.formatMessage(message) };
        } catch (error) {
            console.error('Error sending DM message:', error);
            return { success: false, error: error.message };
        }
    }

    async startTyping(channelId) {
        try {
            const channel = this.client.channels.cache.get(channelId);
            if (channel) {
                await channel.sendTyping();
                return { success: true };
            }
            return { success: false, error: 'Channel not found' };
        } catch (error) {
            console.error('Error starting typing:', error);
            return { success: false, error: error.message };
        }
    }

    async unblockUser(userId) {
        try {
            const user = await this.client.users.fetch(userId);
            await user.unblock();
            return { success: true };
        } catch (error) {
            console.error('Error unblocking user:', error);
            return { success: false, error: error.message };
        }
    }

    async acceptFriendRequest(userId) {
        try {
            const user = await this.client.users.fetch(userId);
            await user.sendFriendRequest();
            return { success: true };
        } catch (error) {
            console.error('Error accepting friend request:', error);
            return { success: false, error: error.message };
        }
    }

    async declineFriendRequest(userId) {
        try {
            const user = await this.client.users.fetch(userId);
            await user.deleteFriend();
            return { success: true };
        } catch (error) {
            console.error('Error declining friend request:', error);
            return { success: false, error: error.message };
        }
    }

    async createServerInvite(serverId) {
        try {
            const guild = this.client.guilds.cache.get(serverId);
            if (!guild) {
                return { success: false, error: 'Server not found' };
            }

            // Find a suitable channel to create invite
            const channel = guild.channels.cache.find(ch => 
                ch.type === 'GUILD_TEXT' && ch.permissionsFor(this.client.user).has('CREATE_INSTANT_INVITE')
            );

            if (!channel) {
                return { success: false, error: 'No suitable channel found' };
            }

            const invite = await channel.createInvite({
                maxAge: 86400, // 24 hours
                maxUses: 0, // Unlimited uses
                unique: true
            });

            return { 
                success: true, 
                inviteUrl: invite.url,
                code: invite.code
            };
        } catch (error) {
            console.error('Error creating server invite:', error);
            return { success: false, error: error.message };
        }
    }

    async testGeminiConnection(apiKey) {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

            const result = await model.generateContent('Hello, this is a test message.');
            const response = await result.response;
            
            if (response.text()) {
                return { success: true };
            } else {
                return { success: false, error: 'No response from Gemini' };
            }
        } catch (error) {
            console.error('Gemini connection test failed:', error);
            return { success: false, error: error.message };
        }
    }

    updateSetting(setting, value) {
        switch (setting) {
            case 'messageLogging':
                this.messageLogging = value;
                break;
            case 'ghostPingLogging':
                this.ghostPingLogging = value;
                break;
            case 'automation':
                this.automationSettings = value;
                break;
            case 'customStatus':
                this.setCustomStatus(value);
                break;
            case 'status':
                this.setStatus(value);
                break;
            default:
                console.log(`Setting ${setting} updated to:`, value);
        }
    }

    async setCustomStatus(status) {
        try {
            if (this.client && this.client.user) {
                await this.client.user.setActivity(status);
            }
        } catch (error) {
            console.error('Error setting custom status:', error);
        }
    }

    async setStatus(status) {
        try {
            if (this.client && this.client.user) {
                await this.client.user.setStatus(status);
            }
        } catch (error) {
            console.error('Error setting status:', error);
        }
    }

    // Event handlers
    handleMessageCreate(message) {
        if (this.messageLogging) {
            // Log message creation
            console.log('Message created:', message.content);
        }

        // Check for automation triggers
        this.checkAutomationTriggers(message);
    }

    handleMessageUpdate(oldMessage, newMessage) {
        // Handle message updates
    }

    handleMessageDelete(message) {
        if (this.ghostPingLogging && message.mentions.users.has(this.client.user.id)) {
            // Log ghost ping
            console.log('Ghost ping detected:', message);
        }
    }

    handleTypingStart(typing) {
        // Handle typing events
    }

    handlePresenceUpdate(oldPresence, newPresence) {
        // Handle presence updates
    }

    checkAutomationTriggers(message) {
        if (!this.automationSettings.autoGiveaway?.enabled) return;

        const settings = this.automationSettings.autoGiveaway;
        const content = message.content.toLowerCase();

        // Check if message contains giveaway keywords
        const hasKeywords = settings.requireKeywords ? 
            settings.keywords.some(keyword => content.includes(keyword.toLowerCase())) : true;

        if (hasKeywords && message.author.bot && settings.verifiedOnly) {
            // Auto-react to giveaway
            this.autoReactToGiveaway(message, settings);
        }
    }

    async autoReactToGiveaway(message, settings) {
        try {
            const delay = Math.random() * (settings.maxDelay - settings.minDelay) + settings.minDelay;
            
            setTimeout(async () => {
                const emoji = settings.emojis[Math.floor(Math.random() * settings.emojis.length)];
                await message.react(emoji);
            }, delay);
        } catch (error) {
            console.error('Error auto-reacting to giveaway:', error);
        }
    }

    logout() {
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
        this.isLoggedIn = false;
        this.userData = null;
    }
}

module.exports = DiscordClient;