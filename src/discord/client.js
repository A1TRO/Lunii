const { Client } = require('discord.js-selfbot-v13');
const { ipcMain } = require('electron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ConfigManager = require('../config/config-manager');
const AutoGiveaway = require('../features/auto-giveaway');
const AFKAutoReply = require('../features/afk-auto-reply');
const StatusAnimation = require('../features/status-animation');
const CustomRPC = require('../features/custom-rpc');
const ServerBackup = require('../features/server-backup');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configure HTTPS agent to handle SSL certificates
const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // For development - in production, use proper certificates
    secureProtocol: 'TLSv1_2_method'
});

class DiscordClient {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.userCache = new Map();
        this.configManager = new ConfigManager();
        this.autoGiveaway = new AutoGiveaway(this, this.configManager);
        this.afkAutoReply = new AFKAutoReply(this, this.configManager);
        this.statusAnimation = new StatusAnimation(this, this.configManager);
        this.customRPC = new CustomRPC(this.configManager);
        this.serverBackup = new ServerBackup(this, this.configManager);
        this.guildCache = new Map();
        this.httpsAgent = httpsAgent;
        this.stats = {
            commandsUsed: 0,
            messagesReceived: 0,
            startTime: Date.now()
        };
        this.customStatusInterval = null;
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
        this.messageLogger = {
            enabled: true,
            logs: [],
            maxLogs: 1000
        };
        this.antiGhostPing = {
            enabled: true,
            logs: []
        };
        this.savedCommands = this.loadSavedCommands();
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
        
        // Handle configuration
        ipcMain.handle('discord-get-config', (event, key) => {
            return key ? this.configManager.get(key) : this.configManager.getAll();
        });
        
        ipcMain.handle('discord-set-config', (event, key, value) => {
            return this.configManager.set(key, value);
        });
        
        // Handle feature configurations
        ipcMain.handle('discord-configure-auto-giveaway', (event, config) => {
            this.autoGiveaway.updateConfig(config);
            return { success: true };
        });
        
        ipcMain.handle('discord-configure-afk-auto-reply', (event, config) => {
            this.afkAutoReply.updateConfig(config);
            return { success: true };
        });
        
        ipcMain.handle('discord-configure-status-animation', (event, config) => {
            this.statusAnimation.updateConfig(config);
            return { success: true };
        });
        
        ipcMain.handle('discord-configure-custom-rpc', async (event, config) => {
            try {
                await this.customRPC.updateConfig(config);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        // Handle custom status
        ipcMain.handle('discord-set-custom-status', async (event, status, type) => {
            return await this.setCustomStatus(status, type);
        });
    }

    async login(token) {
        if (this.client) {
            await this.logout();
        }

        this.client = new Client({
            checkUpdate: false,
            syncStatus: false,
            autoRedeemNitro: false,
            http: {
                agent: httpsAgent,
                timeout: 30000
            },
            ws: {
                agent: httpsAgent
            }
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
                
                // Start features
                this.statusAnimation.start();
                this.customRPC.connect().catch(console.error);
                
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
            this.statusAnimation.stop();
            this.customRPC.disconnect().catch(console.error);
            if (this.customStatusInterval) {
                clearInterval(this.customStatusInterval);
            }
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
            
            // Handle auto giveaway
            this.autoGiveaway.handleMessage(message);
            
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
            
            // Handle AFK auto-reply
            this.afkAutoReply.handleMention(message);
            
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
                if (this.configManager.get('autoGiveaway.enabled')) {
                    this.autoJoinGiveaway(message);
                }
            }
        });
        
        // Message delete events for ghost ping detection
        this.client.on('messageDelete', (message) => {
            if (this.antiGhostPing.enabled && message.mentions?.has(this.client.user)) {
                this.logGhostPing(message);
            }
        });

        // Guild events
        this.client.on('guildCreate', (guild) => {
            this.cacheGuild(guild);
        });

        this.client.on('guildDelete', (guild) => {
            this.guildCache.delete(guild.id);
        });

        // User events
        this.client.on('userUpdate', (oldUser, newUser) => {
            if (newUser.id === this.client.user.id) {
                // User's own profile updated
                this.sendNotification({
                    type: 'info',
                    title: 'Profile Updated',
                    content: 'Your Discord profile has been updated',
                    timestamp: Date.now()
                });
            }
        });
    }

    getUserData() {
        if (!this.client || !this.isReady || !this.client.user) {
            return null;
        }

        const user = this.client.user;
        return {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            displayName: user.displayName || user.username,
            formattedName: user.discriminator === '0' ? user.username : `${user.username}#${user.discriminator}`,
            avatar: user.displayAvatarURL({ size: 128 }),
            status: user.presence?.status || 'offline',
            badges: this.getUserBadges(user),
            createdAt: user.createdAt,
            verified: user.verified,
            mfaEnabled: user.mfaEnabled
        };
    }

    getUserBadges(user) {
        const badges = [];
        if (user.flags) {
            const flags = user.flags.toArray();
            badges.push(...flags.map(flag => flag.replace(/_/g, ' ').toLowerCase()));
        }
        return badges;
    }

    getStats() {
        if (!this.client || !this.isReady) {
            return {
                guilds: [],
                friends: [],
                commandsUsed: 0,
                messagesReceived: 0,
                startTime: Date.now()
            };
        }

        return {
            guilds: Array.from(this.guildCache.values()),
            friends: Array.from(this.userCache.values()),
            commandsUsed: this.stats.commandsUsed,
            messagesReceived: this.stats.messagesReceived,
            startTime: this.stats.startTime
        };
    }

    async updateSetting(setting, value) {
        try {
            this.configManager.set(setting, value);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getFriends() {
        if (!this.client || !this.isReady) return [];

        const friends = [];
        if (this.client.relationships) {
            this.client.relationships.friendCache.forEach(relationship => {
                if (relationship) {
                    friends.push({
                        id: relationship.id,
                        username: relationship.username,
                        discriminator: relationship.discriminator,
                        displayName: relationship.displayName || relationship.username,
                        avatar: relationship.displayAvatarURL(),
                        status: relationship.presence?.status || 'offline',
                        activity: relationship.presence?.activities?.[0]?.name || null
                    });
                }
            });
        }

        return friends;
    }

    getServers() {
        if (!this.client || !this.isReady) return [];

        const servers = [];
        this.client.guilds.cache.forEach(guild => {
            servers.push({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                memberCount: guild.memberCount,
                channels: guild.channels.cache.size,
                roles: guild.roles.cache.size,
                owner: guild.ownerId === this.client.user.id,
                permissions: guild.members.me?.permissions.toArray() || []
            });
        });

        return servers;
    }

    async getServerDetails(serverId) {
        if (!this.client || !this.isReady) return null;

        const guild = this.client.guilds.cache.get(serverId);
        if (!guild) return null;

        try {
            return {
                id: guild.id,
                name: guild.name,
                description: guild.description,
                icon: guild.iconURL({ size: 256 }),
                banner: guild.bannerURL({ size: 1024 }),
                memberCount: guild.memberCount,
                channels: this.getServerChannels(serverId),
                roles: guild.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor,
                    position: role.position,
                    permissions: role.permissions.toArray()
                })),
                emojis: guild.emojis.cache.map(emoji => ({
                    id: emoji.id,
                    name: emoji.name,
                    animated: emoji.animated,
                    url: emoji.url
                })),
                owner: guild.ownerId === this.client.user.id,
                permissions: guild.members.me?.permissions.toArray() || []
            };
        } catch (error) {
            console.error('Error getting server details:', error);
            return null;
        }
    }

    getServerChannels(serverId) {
        if (!this.client || !this.isReady) return [];

        const guild = this.client.guilds.cache.get(serverId);
        if (!guild) return [];

        const channels = [];
        guild.channels.cache.forEach(channel => {
            channels.push({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parentId: channel.parentId,
                topic: channel.topic,
                nsfw: channel.nsfw
            });
        });

        return channels;
    }

    getServerMembers(serverId) {
        if (!this.client || !this.isReady) return [];

        const guild = this.client.guilds.cache.get(serverId);
        if (!guild) return [];

        const members = [];
        guild.members.cache.forEach(member => {
            members.push({
                id: member.id,
                username: member.user.username,
                discriminator: member.user.discriminator,
                displayName: member.displayName,
                avatar: member.user.displayAvatarURL(),
                status: member.presence?.status || 'offline',
                roles: member.roles.cache.map(role => role.name),
                joinedAt: member.joinedAt,
                permissions: member.permissions.toArray()
            });
        });

        return members;
    }

    async sendMessage(data) {
        if (!this.client || !this.isReady) {
            return { success: false, error: 'Client not ready' };
        }

        try {
            const { channelId, content, embed, tts } = data;
            const channel = this.client.channels.cache.get(channelId);
            
            if (!channel) {
                return { success: false, error: 'Channel not found' };
            }

            const messageOptions = {
                content: content || undefined,
                tts: tts || false
            };

            if (embed) {
                messageOptions.embeds = [embed];
            }

            const message = await channel.send(messageOptions);
            this.stats.commandsUsed++;

            return {
                success: true,
                messageId: message.id,
                timestamp: message.createdTimestamp
            };
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    }

    // Command management
    loadSavedCommands() {
        try {
            const commandsPath = path.join(process.cwd(), 'data', 'commands.json');
            if (fs.existsSync(commandsPath)) {
                const data = fs.readFileSync(commandsPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading saved commands:', error);
        }
        return [];
    }

    saveCommand(command) {
        try {
            const commandsPath = path.join(process.cwd(), 'data', 'commands.json');
            const commands = this.loadSavedCommands();
            
            command.id = Date.now().toString();
            command.createdAt = new Date().toISOString();
            
            commands.push(command);
            
            // Ensure data directory exists
            const dataDir = path.dirname(commandsPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(commandsPath, JSON.stringify(commands, null, 2));
            this.savedCommands = commands;
            
            return { success: true, command };
        } catch (error) {
            console.error('Error saving command:', error);
            return { success: false, error: error.message };
        }
    }

    getSavedCommands() {
        return this.savedCommands;
    }

    async executeCommand(command) {
        try {
            this.stats.commandsUsed++;
            
            switch (command.type) {
                case 'message':
                    return await this.sendMessage({
                        channelId: command.channelId,
                        content: command.content
                    });
                    
                case 'reaction':
                    return await this.addReaction(command.messageId, command.emoji);
                    
                case 'status':
                    return await this.setCustomStatus(command.status, command.statusType);
                    
                default:
                    return { success: false, error: 'Unknown command type' };
            }
        } catch (error) {
            console.error('Error executing command:', error);
            return { success: false, error: error.message };
        }
    }

    // Message templates
    loadMessageTemplates() {
        try {
            const templatesPath = path.join(process.cwd(), 'data', 'templates.json');
            if (fs.existsSync(templatesPath)) {
                const data = fs.readFileSync(templatesPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading message templates:', error);
        }
        return [];
    }

    getMessageTemplates() {
        return this.messageTemplates;
    }

    saveMessageTemplate(template) {
        try {
            const templatesPath = path.join(process.cwd(), 'data', 'templates.json');
            const templates = this.loadMessageTemplates();
            
            template.id = Date.now().toString();
            template.createdAt = new Date().toISOString();
            
            templates.push(template);
            
            // Ensure data directory exists
            const dataDir = path.dirname(templatesPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2));
            this.messageTemplates = templates;
            
            return { success: true, template };
        } catch (error) {
            console.error('Error saving template:', error);
            return { success: false, error: error.message };
        }
    }

    deleteMessageTemplate(templateId) {
        try {
            const templatesPath = path.join(process.cwd(), 'data', 'templates.json');
            let templates = this.loadMessageTemplates();
            
            templates = templates.filter(t => t.id !== templateId);
            
            fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2));
            this.messageTemplates = templates;
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting template:', error);
            return { success: false, error: error.message };
        }
    }

    // AI Integration
    initializeGeminiAI(apiKey) {
        try {
            if (!apiKey) {
                return { success: false, error: 'API key is required' };
            }

            this.geminiAI = new GoogleGenerativeAI(apiKey);
            return { success: true };
        } catch (error) {
            console.error('Error initializing Gemini AI:', error);
            return { success: false, error: error.message };
        }
    }

    async getAIAssistance(prompt) {
        if (!this.geminiAI) {
            return { success: false, error: 'Gemini AI not initialized' };
        }

        try {
            const model = this.geminiAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return { success: true, response: text };
        } catch (error) {
            console.error('Error getting AI assistance:', error);
            return { success: false, error: error.message };
        }
    }

    // Backup operations
    async backupServer(serverId, options) {
        return await this.serverBackup.backupServer(serverId, options);
    }

    async cloneServer(serverId, newName) {
        return await this.serverBackup.cloneServer(serverId, newName, {});
    }

    getBackups() {
        return this.serverBackup.getBackups();
    }

    // AFK functionality
    setAFK(settings) {
        return this.afkAutoReply.setAFK(settings.enabled, settings.message);
    }

    // Message logging
    logMessage(message) {
        if (!this.messageLogger.enabled) return;

        const logEntry = {
            id: message.id,
            content: message.content,
            author: {
                id: message.author.id,
                username: message.author.username,
                discriminator: message.author.discriminator
            },
            channel: {
                id: message.channel.id,
                name: message.channel.name
            },
            guild: message.guild ? {
                id: message.guild.id,
                name: message.guild.name
            } : null,
            timestamp: message.createdTimestamp,
            attachments: message.attachments.map(att => ({
                id: att.id,
                name: att.name,
                url: att.url
            }))
        };

        this.messageLogger.logs.unshift(logEntry);
        
        // Keep only the latest messages
        if (this.messageLogger.logs.length > this.messageLogger.maxLogs) {
            this.messageLogger.logs = this.messageLogger.logs.slice(0, this.messageLogger.maxLogs);
        }
    }

    getMessageLogs() {
        return this.messageLogger.logs;
    }

    clearMessageLogs() {
        this.messageLogger.logs = [];
        return { success: true };
    }

    // Ghost ping detection
    logGhostPing(message) {
        const ghostPing = {
            id: message.id,
            content: message.content,
            author: {
                id: message.author.id,
                username: message.author.username,
                discriminator: message.author.discriminator
            },
            channel: {
                id: message.channel.id,
                name: message.channel.name
            },
            guild: message.guild ? {
                id: message.guild.id,
                name: message.guild.name
            } : null,
            timestamp: message.createdTimestamp,
            deletedAt: Date.now()
        };

        this.antiGhostPing.logs.unshift(ghostPing);
        
        // Keep only the latest 100 ghost pings
        if (this.antiGhostPing.logs.length > 100) {
            this.antiGhostPing.logs = this.antiGhostPing.logs.slice(0, 100);
        }

        // Send notification
        this.sendNotification({
            type: 'warning',
            title: 'Ghost Ping Detected',
            content: `${this.formatUserName(message.author)} deleted a message that mentioned you`,
            author: this.formatUserName(message.author),
            channel: message.channel.name,
            guild: message.guild?.name || 'Direct Message',
            timestamp: Date.now()
        });
    }

    getGhostPingLogs() {
        return this.antiGhostPing.logs;
    }

    clearGhostPingLogs() {
        this.antiGhostPing.logs = [];
        return { success: true };
    }

    // Custom status
    async setCustomStatus(status, type = 'CUSTOM') {
        if (!this.client || !this.isReady) {
            return { success: false, error: 'Client not ready' };
        }

        try {
            if (status === null || status === '') {
                await this.client.user.setActivity(null);
            } else {
                await this.client.user.setActivity(status, { type });
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error setting custom status:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    isVerifiedGiveawayBot(user) {
        return this.giveawayBots.has(user.id);
    }

    async autoJoinGiveaway(message) {
        try {
            const config = this.configManager.get('autoGiveaway');
            const reactions = config.reactions || ['🎉'];
            
            for (const reaction of reactions) {
                if (message.content.includes(reaction)) {
                    await message.react(reaction);
                    break;
                }
            }
        } catch (error) {
            console.error('Error auto-joining giveaway:', error);
        }
    }

    formatMessageContent(content, guild) {
        if (!content) return '';
        
        // Limit content length
        if (content.length > 100) {
            content = content.substring(0, 100) + '...';
        }
        
        return content;
    }

    formatUserName(user) {
        if (!user) return 'Unknown User';
        
        if (user.discriminator === '0') {
            return user.username;
        }
        
        return `${user.username}#${user.discriminator}`;
    }

    cacheGuild(guild) {
        this.guildCache.set(guild.id, {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount,
            owner: guild.ownerId === this.client.user.id
        });
    }

    sendNotification(notification) {
        // Send notification to main window
        if (this.client) {
            // Use ipcMain to send to renderer process
            const { BrowserWindow } = require('electron');
            const mainWindow = BrowserWindow.getAllWindows().find(win => !win.isDestroyed());
            
            if (mainWindow) {
                mainWindow.webContents.send('discord-notification', notification);
            }
        }
    }
}

module.exports = DiscordClient;