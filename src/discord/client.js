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
                if (this.settings?.autoGiveaway) {
                    this.autoJoinGiveaway(message);
                }
            }
        });
        
        // Message delete events for ghost ping detection
        this.client.on('messageDelete', (message) => {
            if (this.antiGhostPing.enabled && message.mentions?.has(this.client.user))