const { Client } = require('discord.js-selfbot-v13');
const { ipcMain } = require('electron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class DiscordClient {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.userCache = new Map();
        this.guildCache = new Map();
        this.stats = {
            commandsUsed: 0,
            messagesReceived: 0,
            startTime: Date.now()
        };
        this.geminiAI = null;
        this.giveawayBots = new Set([
            '294882584201003009', // GiveawayBot
            '396464677032427530', // Carl-bot
            '235148962103951360', // Dyno
            '159985870458322944', // Mee6
            '270904126974590976', // Tatsumaki
            '155149108183695360', // Dank Memer
            '432610292342587392', // GiveawayBot (alternative)
            '716390085896962058', // Giveaway Boat
        ]);
        this.afkSettings = {
            enabled: false,
            message: "I'm currently AFK. I'll get back to you soon!",
            startTime: null
        };
        this.savedCommands = this.loadSavedCommands();
        this.messageLogger = {
            enabled: true,
            logs: [],
            maxLogs: 1000
        };
        this.antiGhostPing = {
            enabled: true,
            logs: []
        };
        this.messageTemplates = this.loadMessageTemplates();
        
        this.setupIPC();
    }

    setupIPC() {
        // Handle login requests
        ipcMain.handle('discord-login', async (event, token) => {
            try {
                return await this.login(token);
            } catch (error) {
                console.error('Discord login error:', error);
                return { success: false, error: error.message };
            }
        });

        // Handle logout requests
        ipcMain.handle('discord-logout', async () => {
            try {
                await this.logout();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Handle user data requests
        ipcMain.handle('discord-get-user-data', () => {
            return this.getUserData();
        });

        // Handle stats requests
        ipcMain.handle('discord-get-stats', () => {
            return this.getStats();
        });

        // Handle setting updates
        ipcMain.handle('discord-update-setting', async (event, setting, value) => {
            return await this.updateSetting(setting, value);
        });
        
        // Handle friends requests
        ipcMain.handle('discord-get-friends', () => {
            return this.getFriends();
        });
        
        // Handle servers requests
        ipcMain.handle('discord-get-servers', () => {
            return this.getServers();
        });
        
        // Handle server details
        ipcMain.handle('discord-get-server-details', (event, serverId) => {
            return this.getServerDetails(serverId);
        });
        
        // Handle messaging
        ipcMain.handle('discord-send-message', async (event, data) => {
            return await this.sendMessage(data);
        });
        
        // Handle command operations
        ipcMain.handle('discord-save-command', (event, command) => {
            return this.saveCommand(command);
        });
        
        ipcMain.handle('discord-get-saved-commands', () => {
            return this.getSavedCommands();
        });
        
        ipcMain.handle('discord-execute-command', async (event, command) => {
            return await this.executeCommand(command);
        });
        
        // Handle AI assistance
        ipcMain.handle('discord-ai-assist', async (event, prompt) => {
            return await this.getAIAssistance(prompt);
        });
        
        // Handle server backup/clone
        ipcMain.handle('discord-backup-server', async (event, serverId, options) => {
            return await this.backupServer(serverId, options);
        });
        
        ipcMain.handle('discord-clone-server', async (event, serverId, newName) => {
            return await this.cloneServer(serverId, newName);
        });
        
        // Handle AFK settings
        ipcMain.handle('discord-set-afk', (event, settings) => {
            return this.setAFK(settings);
        });
        
        // Handle message logging
        ipcMain.handle('discord-get-message-logs', () => {
            return this.getMessageLogs();
        });
        
        ipcMain.handle('discord-clear-message-logs', () => {
            return this.clearMessageLogs();
        });
        
        // Handle anti-ghost ping
        ipcMain.handle('discord-get-ghost-ping-logs', () => {
            return this.getGhostPingLogs();
        });
        
        ipcMain.handle('discord-clear-ghost-ping-logs', () => {
            return this.clearGhostPingLogs();
        });
        
        // Handle server management
        ipcMain.handle('discord-get-server-channels', (event, serverId) => {
            return this.getServerChannels(serverId);
        });
        
        ipcMain.handle('discord-get-server-members', (event, serverId) => {
            return this.getServerMembers(serverId);
        });
        
        ipcMain.handle('discord-kick-member', async (event, serverId, memberId, reason) => {
            return await this.kickMember(serverId, memberId, reason);
        });
        
        ipcMain.handle('discord-ban-member', async (event, serverId, memberId, reason) => {
            return await this.banMember(serverId, memberId, reason);
        });
        
        // Handle message templates
        ipcMain.handle('discord-get-message-templates', () => {
            return this.getMessageTemplates();
        });
        
        ipcMain.handle('discord-save-message-template', (event, template) => {
            return this.saveMessageTemplate(template);
        });
        
        ipcMain.handle('discord-delete-message-template', (event, templateId) => {
            return this.deleteMessageTemplate(templateId);
        });
        
        // Handle Gemini AI
        ipcMain.handle('discord-setup-gemini', (event, apiKey) => {
            return this.initializeGeminiAI(apiKey);
        });
        
        // Handle backup operations
        ipcMain.handle('discord-get-backups', () => {
            return this.getBackups();
        });
        
        ipcMain.handle('discord-restore-backup', async (event, backupId, serverId) => {
            return await this.restoreBackup(backupId, serverId);
        });
    }

    async login(token) {
        if (this.client) {
            await this.logout();
        }

        this.client = new Client({
            checkUpdate: false,
            syncStatus: false,
            autoRedeemNitro: false
        });

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ success: false, error: 'Login timeout' });
            }, 30000);

            this.client.once('ready', async () => {
                clearTimeout(timeout);
                this.isReady = true;
                this.stats.startTime = Date.now();

                
                
                // Cache user data
                await this.cacheUserData();
                
                // Setup event listeners
                this.setupEventListeners();
                
                resolve({ 
                    success: true, 
                    user: this.getUserData() 
                });
            });

            this.client.on('error', (error) => {
                clearTimeout(timeout);
                console.error('Discord client error:', error);
                resolve({ success: false, error: error.message });
            });

            // Attempt login
            this.client.login(token).catch((error) => {
                clearTimeout(timeout);
                console.error('Login failed:', error);
                resolve({ success: false, error: 'Invalid token or login failed' });
            });
        });
    }

    async logout() {
        if (this.client) {
            this.isReady = false;
            await this.client.destroy();
            this.client = null;
            this.userCache.clear();
            this.guildCache.clear();
        }
    }

    async cacheUserData() {
        if (!this.client || !this.isReady) return;

        try {
            // Cache guilds
            this.client.guilds.cache.forEach(guild => {
                this.guildCache.set(guild.id, {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL(),
                    memberCount: guild.memberCount,
                    owner: guild.ownerId === this.client.user.id
                });
            });

            // Cache friends
            if (this.client.relationships) {
                this.client.relationships.friendCache.forEach(relationship => {
                    
                    if (relationship) { // Friends
                        this.userCache.set(relationship.id, {
                            id: relationship.id,
                            username: relationship.username,
                            discriminator: relationship.discriminator,
                            avatar: relationship.displayAvatarURL()
                           
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error caching user data:', error);
        }
    }

    setupEventListeners() {
        if (!this.client) return;

        // Message events
        this.client.on('messageCreate', (message) => {
            this.stats.messagesReceived++;
            
            // Log message
            this.logMessage(message);
            
            // Check for mentions
            if (message.mentions.has(this.client.user)) {
                const formattedContent = this.formatMessageContent(message.content, message.guild);
                const authorName = this.formatUserName(message.author);
                
                this.sendNotification({
                    type: 'mention',
                    title: `${authorName} mentioned you!`,
                    content: formattedContent,
                    author: authorName,
                    channel: message.channel.name || 'DM',
                    guild: message.guild?.name || 'Direct Message',
                    timestamp: Date.now(),
                    messageId: message.id,
                    channelId: message.channel.id
                });
            }
            
            // Check for giveaway keywords
            const giveawayKeywords = ['🎉', 'giveaway', 'react', 'win', 'prize', 'enter', 'participate'];
            const hasGiveawayKeyword = giveawayKeywords.some(keyword => 
                message.content.toLowerCase().includes(keyword.toLowerCase())
            );
            
            // Enhanced giveaway detection
            if (hasGiveawayKeyword && message.guild && this.isVerifiedGiveawayBot(message.author)) {
                const formattedContent = this.formatMessageContent(message.content, message.guild);
                const authorName = this.formatUserName(message.author);
                
                this.sendNotification({
                    type: 'success',
                    title: 'Giveaway Detected',
                    content: formattedContent,
                    author: authorName,
                    channel: message.channel.name,
                    guild: message.guild.name,
                    timestamp: Date.now(),
                    messageId: message.id,
                    channelId: message.channel.id
                });
                
                // Auto-join if enabled
                if (this.settings?.autoGiveaway) {
                    this.autoJoinGiveaway(message);
                }
            }
            
            // AFK auto-reply
            if (this.afkSettings.enabled && message.mentions.has(this.client.user)) {
                this.handleAFKReply(message);
            }
        });
        
        // Message delete events for ghost ping detection
        this.client.on('messageDelete', (message) => {
            if (this.antiGhostPing.enabled && message.mentions?.has(this.client.user)) {
                this.logGhostPing(message);
            }
        });
        
        // Message update events
        this.client.on('messageUpdate', (oldMessage, newMessage) => {
            if (oldMessage.mentions?.has(this.client.user) && !newMessage.mentions?.has(this.client.user)) {
                // Mention was removed - potential ghost ping
                this.logGhostPing(oldMessage, 'edited');
            }
        });

        // Presence updates
        this.client.on('presenceUpdate', (oldPresence, newPresence) => {
            if (this.userCache.has(newPresence.userId)) {
                const cached = this.userCache.get(newPresence.userId);
                cached.status = newPresence.status;
                this.userCache.set(newPresence.userId, cached);
            }
        });

        // Guild events
        this.client.on('guildCreate', (guild) => {
            this.guildCache.set(guild.id, {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                memberCount: guild.memberCount,
                owner: guild.ownerId === this.client.user.id
            });
            
            this.sendNotification({
                type: 'success',
                title: 'Joined new server',
                content: `You joined ${guild.name}`,
                timestamp: Date.now()
            });
        });

        this.client.on('guildDelete', (guild) => {
            this.guildCache.delete(guild.id);
            
            this.sendNotification({
                type: 'warning',
                title: 'Left server',
                content: `You left ${guild.name}`,
                timestamp: Date.now()
            });
        });
        
        // Relationship events
        this.client.on('relationshipAdd', (relationship) => {
            if (relationship.type === 1) { // Friend
                this.userCache.set(relationship.user.id, {
                    id: relationship.user.id,
                    username: relationship.user.username,
                    discriminator: relationship.user.discriminator,
                    avatar: relationship.user.displayAvatarURL(),
                    status: relationship.user.presence?.status || 'offline'
                });
                
                this.sendNotification({
                    type: 'success',
                    title: 'New Friend',
                    content: `${relationship.user.username} is now your friend`,
                    timestamp: Date.now()
                });
            }
        });
        
        this.client.on('relationshipRemove', (relationship) => {
            if (relationship.type === 1) { // Friend
                this.userCache.delete(relationship.user.id);
                
                this.sendNotification({
                    type: 'error',
                    title: 'Friend Removed',
                    content: `${relationship.user.username} is no longer your friend`,
                    timestamp: Date.now()
                });
            }
        });
    }
    
    isVerifiedGiveawayBot(author) {
        return this.giveawayBots.has(author.id) || author.bot;
    }
    
    async autoJoinGiveaway(message) {
        try {
            // Look for reaction emojis in the message
            const reactionEmojis = ['🎉', '🎊', '🎁', '✨'];
            
            for (const emoji of reactionEmojis) {
                if (message.content.includes(emoji)) {
                    await message.react(emoji);
                    this.incrementCommandUsage();
                    break;
                }
            }
        } catch (error) {
            console.error('Error auto-joining giveaway:', error);
        }
    }
    
    async handleAFKReply(message) {
        try {
            const afkDuration = Date.now() - this.afkSettings.startTime;
            const hours = Math.floor(afkDuration / (1000 * 60 * 60));
            const minutes = Math.floor((afkDuration % (1000 * 60 * 60)) / (1000 * 60));
            
            let replyMessage = this.afkSettings.message;
            if (hours > 0) {
                replyMessage += ` (AFK for ${hours}h ${minutes}m)`;
            } else if (minutes > 0) {
                replyMessage += ` (AFK for ${minutes}m)`;
            }
            
            await message.reply(replyMessage);
        } catch (error) {
            console.error('Error sending AFK reply:', error);
        }
    }
    
    formatUserName(user) {
        if (!user) return 'Unknown User';
        
        // Handle different user types and formats
        const displayName = user.displayName || user.globalName;
        const username = user.username;
        
        if (displayName && displayName !== username) {
            return `${displayName} (@${username})`;
        }
        
        if (user.discriminator && user.discriminator !== '0') {
            return `${username}#${user.discriminator}`;
        }
        
        return username || 'Unknown User';
    }
    
    formatMessageContent(content, guild) {
        if (!content) return '';
        
        let formatted = content;
        
        // Replace user mentions
        formatted = formatted.replace(/<@!?(\d+)>/g, (match, userId) => {
            const user = this.client.users.cache.get(userId);
            if (user) {
                return `@${this.formatUserName(user)}`;
            }
            return match;
        });
        
        // Replace role mentions
        if (guild) {
            formatted = formatted.replace(/<@&(\d+)>/g, (match, roleId) => {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    return `@${role.name}`;
                }
                return match;
            });
        }
        
        // Replace channel mentions
        formatted = formatted.replace(/<#(\d+)>/g, (match, channelId) => {
            const channel = this.client.channels.cache.get(channelId);
            if (channel) {
                return `#${channel.name}`;
            }
            return match;
        });
        
        // Truncate if too long
        return formatted.length > 300 ? formatted.substring(0, 300) + '...' : formatted;
    }
    
    logMessage(message) {
        if (!this.messageLogger.enabled) return;
        
        const logEntry = {
            id: message.id,
            content: message.content,
            formattedContent: this.formatMessageContent(message.content, message.guild),
            author: {
                id: message.author.id,
                name: this.formatUserName(message.author),
                username: message.author.username,
                displayName: message.author.displayName || message.author.globalName,
                avatar: message.author.displayAvatarURL()
            },
            channel: {
                id: message.channel.id,
                name: message.channel.name || 'DM',
                type: message.channel.type
            },
            guild: message.guild ? {
                id: message.guild.id,
                name: message.guild.name
            } : null,
            timestamp: message.createdTimestamp,
            attachments: message.attachments.map(att => ({
                id: att.id,
                name: att.name,
                url: att.url,
                size: att.size
            })),
            embeds: message.embeds.length > 0,
            mentions: {
                users: message.mentions.users.map(user => ({
                    id: user.id,
                    name: this.formatUserName(user)
                })),
                roles: message.mentions.roles.map(role => ({
                    id: role.id,
                    name: role.name
                })),
                everyone: message.mentions.everyone
            }
        };
        
        this.messageLogger.logs.unshift(logEntry);
        
        // Keep only the most recent logs
        if (this.messageLogger.logs.length > this.messageLogger.maxLogs) {
            this.messageLogger.logs = this.messageLogger.logs.slice(0, this.messageLogger.maxLogs);
        }
    }
    
    logGhostPing(message, type = 'deleted') {
        if (!this.antiGhostPing.enabled) return;
        
        const ghostPingEntry = {
            id: Date.now().toString(),
            messageId: message.id,
            type: type, // 'deleted' or 'edited'
            content: message.content,
            formattedContent: this.formatMessageContent(message.content, message.guild),
            author: {
                id: message.author.id,
                name: this.formatUserName(message.author),
                avatar: message.author.displayAvatarURL()
            },
            channel: {
                id: message.channel.id,
                name: message.channel.name || 'DM'
            },
            guild: message.guild ? {
                id: message.guild.id,
                name: message.guild.name
            } : null,
            timestamp: Date.now(),
            originalTimestamp: message.createdTimestamp
        };
        
        this.antiGhostPing.logs.unshift(ghostPingEntry);
        
        // Keep only recent ghost pings
        if (this.antiGhostPing.logs.length > 100) {
            this.antiGhostPing.logs = this.antiGhostPing.logs.slice(0, 100);
        }
        
        // Send notification
        this.sendNotification({
            type: 'warning',
            title: 'Ghost Ping Detected!',
            content: `${this.formatUserName(message.author)} ${type} a message that mentioned you`,
            author: this.formatUserName(message.author),
            channel: message.channel.name || 'DM',
            guild: message.guild?.name || 'Direct Message',
            timestamp: Date.now()
        });
    }
    
    getMessageLogs() {
        return {
            logs: this.messageLogger.logs,
            enabled: this.messageLogger.enabled,
            maxLogs: this.messageLogger.maxLogs
        };
    }
    
    clearMessageLogs() {
        this.messageLogger.logs = [];
        return { success: true };
    }
    
    getGhostPingLogs() {
        return {
            logs: this.antiGhostPing.logs,
            enabled: this.antiGhostPing.enabled
        };
    }
    
    clearGhostPingLogs() {
        this.antiGhostPing.logs = [];
        return { success: true };
    }
    
    getServerChannels(serverId) {
        const guild = this.client.guilds.cache.get(serverId);
        if (!guild) return { success: false, error: 'Server not found' };
        
        const channels = guild.channels.cache
            .filter(channel => channel.type) // Text and Voice channels
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type === 0 ? 'text' : 'voice',
                position: channel.position,
                parentId: channel.parentId,
                nsfw: channel.nsfw || false,
                topic: channel.topic || null
            }))
            .sort((a, b) => a.position - b.position);
        return { success: true, channels };
    }
    
    getServerMembers(serverId) {
        const guild = this.client.guilds.cache.get(serverId);
        if (!guild) return { success: false, error: 'Server not found' };
        
        const members = guild.members.cache.map(member => ({
            id: member.id,
            user: {
                id: member.user.id,
                username: member.user.username,
                displayName: member.user.displayName || member.user.globalName,
                discriminator: member.user.discriminator,
                avatar: member.user.displayAvatarURL(),
                bot: member.user.bot
            },
            nickname: member.nickname,
            displayName: this.formatUserName(member.user),
            joinedAt: member.joinedAt,
            roles: member.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor
            })),
            permissions: member.permissions.toArray(),
            presence: member.presence ? {
                status: member.presence.status,
                activities: member.presence.activities.map(activity => ({
                    name: activity.name,
                    type: activity.type
                }))
            } : null
        }));
        
        return { success: true, members };
    }
    
    async kickMember(serverId, memberId, reason = 'No reason provided') {
        try {
            const guild = this.client.guilds.cache.get(serverId);
            if (!guild) return { success: false, error: 'Server not found' };
            
            const member = guild.members.cache.get(memberId);
            if (!member) return { success: false, error: 'Member not found' };
            
            await member.kick(reason);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async banMember(serverId, memberId, reason = 'No reason provided') {
        try {
            const guild = this.client.guilds.cache.get(serverId);
            if (!guild) return { success: false, error: 'Server not found' };
            
            await guild.members.ban(memberId, { reason });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    getMessageTemplates() {
        return this.messageTemplates;
    }
    
    saveMessageTemplate(template) {
        try {
            const newTemplate = {
                ...template,
                id: Date.now().toString(),
                createdAt: new Date().toISOString()
            };
            
            this.messageTemplates.push(newTemplate);
            this.saveMessageTemplates();
            
            return { success: true, template: newTemplate };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    deleteMessageTemplate(templateId) {
        try {
            const index = this.messageTemplates.findIndex(t => t.id === templateId);
            if (index === -1) return { success: false, error: 'Template not found' };
            
            this.messageTemplates.splice(index, 1);
            this.saveMessageTemplates();
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    loadMessageTemplates() {
        try {
            const templatesPath = path.join(require('electron').app.getPath('userData'), 'message-templates.json');
            if (fs.existsSync(templatesPath)) {
                return JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading message templates:', error);
        }
        return [];
    }
    
    saveMessageTemplates() {
        try {
            const templatesPath = path.join(require('electron').app.getPath('userData'), 'message-templates.json');
            fs.writeFileSync(templatesPath, JSON.stringify(this.messageTemplates, null, 2));
        } catch (error) {
            console.error('Error saving message templates:', error);
        }
    }
    
    getBackups() {
        try {
            const backupPath = path.join(require('electron').app.getPath('userData'), 'backups');
            if (!fs.existsSync(backupPath)) return [];
            
            const backupFiles = fs.readdirSync(backupPath)
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    try {
                        const backupData = JSON.parse(fs.readFileSync(path.join(backupPath, file), 'utf8'));
                        return {
                            id: backupData.id,
                            serverName: backupData.serverName,
                            createdAt: backupData.createdAt,
                            size: fs.statSync(path.join(backupPath, file)).size
                        };
                    } catch (error) {
                        return null;
                    }
                })
                .filter(backup => backup !== null)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return backupFiles;
        } catch (error) {
            console.error('Error loading backups:', error);
            return [];
        }
    }
    
    async restoreBackup(backupId, serverId) {
        try {
            const backupPath = path.join(require('electron').app.getPath('userData'), 'backups', `${backupId}.json`);
            if (!fs.existsSync(backupPath)) {
                return { success: false, error: 'Backup not found' };
            }
            
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            const guild = this.client.guilds.cache.get(serverId);
            
            if (!guild) {
                return { success: false, error: 'Target server not found' };
            }
            
            // This is a simplified restore - in practice, you'd need proper permissions
            // and careful handling of rate limits
            return { success: false, error: 'Backup restore requires additional permissions and careful implementation' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getUserData() {
        if (!this.client || !this.isReady || !this.client.user) {
            return null;
        }

        const user = this.client.user;
        const nitroType = user.premiumType;
        
        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.globalName,
            formattedName: this.formatUserName(user),
            discriminator: user.discriminator,
            handle: user.tag,
            avatar: user.displayAvatarURL({ size: 128 }),
            nitro: nitroType > 0,
            nitroType: nitroType,
            verified: user.verified,
            mfaEnabled: user.mfaEnabled,
            createdAt: user.createdAt,
            badges: this.getUserBadges(user),
            servers: this.guildCache.size,
            friends: this.userCache.size,
            status: user.presence?.status || 'online',
            customStatus: user.presence?.activities?.find(a => a.type === 'CUSTOM')?.state || null
        };
    }
    
    getUserBadges(user) {
        const badges = [];
        
        if (user.premiumType > 0) badges.push('NITRO');
        if (user.flags) {
            if (user.flags.has('EARLY_SUPPORTER')) badges.push('EARLY_SUPPORTER');
            if (user.flags.has('HYPESQUAD_EVENTS')) badges.push('HYPESQUAD_EVENTS');
            if (user.flags.has('HOUSE_BRAVERY')) badges.push('HOUSE_BRAVERY');
            if (user.flags.has('HOUSE_BRILLIANCE')) badges.push('HOUSE_BRILLIANCE');
            if (user.flags.has('HOUSE_BALANCE')) badges.push('HOUSE_BALANCE');
            //if (user.flags.has('VERIFIED_DEVELOPER')) badges.push('VERIFIED_DEVELOPER');
        }
        
        return badges;
    }
    
    getFriends() {
        return Array.from(this.userCache.values());
    }
    
    getServers() {
        return Array.from(this.guildCache.values());
    }
    
    getServerDetails(serverId) {
        const guild = this.client.guilds.cache.get(serverId);
        if (!guild) return null;
        
        return {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 128 }),
            memberCount: guild.memberCount,
            channels: guild.channels.cache.map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position
            })),
            emojis: guild.emojis.cache.map(emoji => ({
                id: emoji.id,
                name: emoji.name,
                url: emoji.url,
                animated: emoji.animated
            })),
            stickers: guild.stickers.cache.map(sticker => ({
                id: sticker.id,
                name: sticker.name,
                description: sticker.description,
                url: sticker.url
            })),
            roles: guild.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position
            }))
        };
    }
    
    async sendMessage(data) {
        try {
            const { type, target, content, options = {} } = data;
            let channel;
            
            if (type === 'channel') {
                channel = this.client.channels.cache.get(target);
            } else if (type === 'dm') {
                const user = this.client.users.cache.get(target);
                if (user) {
                    channel = await user.createDM();
                }
            }
            
            if (!channel) {
                return { success: false, error: 'Channel or user not found' };
            }
            
            const messageOptions = {
                content: content,
                tts: options.tts || false
            };
            
            if (options.embed) {
                messageOptions.embeds = [{
                    description: content,
                    color: 0x4F46E5
                }];
                messageOptions.content = '';
            }
            
            const sentMessage = await channel.send(messageOptions);
            this.incrementCommandUsage();
            
            return {
                success: true,
                messageId: sentMessage.id,
                channelId: sentMessage.channel.id
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    saveCommand(command) {
        try {
            this.savedCommands.push({
                ...command,
                id: Date.now().toString(),
                createdAt: new Date().toISOString()
            });
            
            this.saveSavedCommands();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    getSavedCommands() {
        return this.savedCommands;
    }
    
    async executeCommand(command) {
        try {
            // This would execute the saved command
            // Implementation depends on command type
            this.incrementCommandUsage();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async getAIAssistance(prompt) {
        try {
            if (!this.geminiAI) {
                return { success: false, error: 'Gemini AI not configured' };
            }
            
            const model = this.geminiAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            return {
                success: true,
                response: response.text()
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async backupServer(serverId, options) {
        try {
            const serverDetails = this.getServerDetails(serverId);
            if (!serverDetails) {
                return { success: false, error: 'Server not found' };
            }
            
            const backup = {
                id: Date.now().toString(),
                serverId: serverId,
                serverName: serverDetails.name,
                createdAt: new Date().toISOString(),
                data: {}
            };
            
            if (options.channels) backup.data.channels = serverDetails.channels;
            if (options.roles) backup.data.roles = serverDetails.roles;
            if (options.emojis) backup.data.emojis = serverDetails.emojis;
            if (options.settings) backup.data.settings = { /* server settings */ };
            
            // Save backup to file
            const backupPath = path.join(require('electron').app.getPath('userData'), 'backups');
            await fs.promises.mkdir(backupPath, { recursive: true });
            await fs.promises.writeFile(
                path.join(backupPath, `${backup.id}.json`),
                JSON.stringify(backup, null, 2)
            );
            
            return { success: true, backup };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async cloneServer(serverId, newName) {
        try {
            // This would create a new server based on the template
            // Note: This requires the bot to have server creation permissions
            return { success: false, error: 'Server cloning requires additional permissions' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    setAFK(settings) {
        this.afkSettings = {
            ...settings,
            startTime: settings.enabled ? Date.now() : null
        };
        return { success: true };
    }
    
    loadSavedCommands() {
        try {
            const commandsPath = path.join(require('electron').app.getPath('userData'), 'commands.json');
            if (fs.existsSync(commandsPath)) {
                return JSON.parse(fs.readFileSync(commandsPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading saved commands:', error);
        }
        return [];
    }
    
    saveSavedCommands() {
        try {
            const commandsPath = path.join(require('electron').app.getPath('userData'), 'commands.json');
            fs.writeFileSync(commandsPath, JSON.stringify(this.savedCommands, null, 2));
        } catch (error) {
            console.error('Error saving commands:', error);
        }
    }
    
    initializeGeminiAI(apiKey) {
        try {
            this.geminiAI = new GoogleGenerativeAI(apiKey);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getStats() {
        const uptime = Date.now() - this.stats.startTime;
        
        return {
            ...this.stats,
            uptime: {
                total: uptime,
                days: Math.floor(uptime / (1000 * 60 * 60 * 24)),
                hours: Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((uptime % (1000 * 60)) / 1000)
            },
            isReady: this.isReady,
            guilds: Array.from(this.guildCache.values()),
            friends: Array.from(this.userCache.values())
        };
    }

    async updateSetting(setting, value) {
        if (!this.client || !this.isReady) {
            return { success: false, error: 'Client not ready' };
        }

        try {
            switch (setting) {
                case 'status':
                    await this.client.user.setStatus(value);
                    break;
                case 'customStatus':
                    await this.client.user.setActivity(value, { type: 'CUSTOM' });
                    break;
                case 'afk':
                    await this.client.user.setAFK(value);
                    break;
                case 'customStatus':
                    if (value) {
                        await this.client.user.setActivity(value, { type: 'CUSTOM' });
                    } else {
                        await this.client.user.setActivity(null);
                    }
                    break;
                case 'autoGiveaway':
                    // Store setting for giveaway auto-join
                    this.settings = this.settings || {};
                    this.settings.autoGiveaway = value;
                    break;
                case 'statusAnimation':
                    this.settings = this.settings || {};
                    this.settings.statusAnimation = value;
                    break;
                default:
                    return { success: false, error: 'Unknown setting' };
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    sendNotification(notification) {
        // Send notification to all renderer processes
        const { BrowserWindow } = require('electron');
        const windows = BrowserWindow.getAllWindows();
        
        windows.forEach(window => {
            window.webContents.send('discord-notification', notification);
        });
    }

    incrementCommandUsage() {
        this.stats.commandsUsed++;
    }
}

module.exports = DiscordClient;