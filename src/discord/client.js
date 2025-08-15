const { Client } = require('discord.js-selfbot-v13');
const { ipcMain } = require('electron');
const https = require('https');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const winston = require('winston');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class DiscordClient {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.token = null;
        this.userData = null;
        this.stats = {
            commandsUsed: 0,
            giveawaysJoined: 0,
            afkRepliesSent: 0,
            isReady: false
        };
        
        // Configuration
        this.config = null;
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        
        // Feature systems
        this.giveawaySystem = null;
        this.afkSystem = null;
        this.statusAnimationSystem = null;
        this.messageLogger = null;
        this.ghostPingDetector = null;
        
        // AI Integration
        this.geminiAI = null;
        
        // Logging
        this.logger = this.setupLogger();
        
        // SSL Configuration
        this.setupSSL();
        
        this.setupIPC();
        this.loadConfiguration();
    }

    setupSSL() {
        // Create custom HTTPS agent with SSL bypass
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            secureProtocol: 'TLSv1_2_method',
            timeout: 30000,
            keepAlive: true,
            maxSockets: 10
        });

        // Configure axios defaults
        axios.defaults.httpsAgent = httpsAgent;
        axios.defaults.timeout = 30000;
        
        // Set Node.js environment variables for SSL
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        
        this.logger.info('SSL configuration applied with certificate validation bypass');
    }

    setupLogger() {
        const logDir = path.join(app.getPath('userData'), 'logs');
        
        return winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(logDir, 'discord.log'),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),
                new winston.transports.File({ 
                    filename: path.join(logDir, 'error.log'), 
                    level: 'error',
                    maxsize: 5242880,
                    maxFiles: 3
                }),
                new winston.transports.Console({
                    format: winston.format.simple()
                })
            ]
        });
    }

    async loadConfiguration() {
        try {
            // Ensure config directory exists
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });
            
            // Load or create default configuration
            try {
                const configData = await fs.readFile(this.configPath, 'utf8');
                this.config = JSON.parse(configData);
            } catch (error) {
                this.config = await this.createDefaultConfig();
            }
            
            this.logger.info('Configuration loaded successfully');
        } catch (error) {
            this.logger.error('Error loading configuration:', error);
            this.config = await this.createDefaultConfig();
        }
    }

    async createDefaultConfig() {
        const defaultConfig = {
            ssl: {
                rejectUnauthorized: false,
                timeout: 30000,
                secureProtocol: 'TLSv1_2_method'
            },
            giveaway: {
                enabled: false,
                keywords: [
                    '🎉', 'giveaway', 'react', 'win', 'prize',
                    'enter', 'participate', 'free', 'contest'
                ],
                reactionEmojis: ['🎉', '🎊', '🎁', '✨', '🏆'],
                channelWhitelist: [],
                channelBlacklist: [],
                minDelay: 1000,
                maxDelay: 5000,
                maxPerHour: 10,
                verifiedBotsOnly: true,
                requireKeywords: true
            },
            afk: {
                enabled: false,
                timeout: 300000, // 5 minutes
                message: "I'm currently AFK. I'll get back to you soon!",
                aiEnabled: false,
                aiPrompt: "You are helping respond to messages while the user is away. Be friendly, brief, and helpful. Mention that the user is currently away.",
                responseLimit: 3,
                autoDetection: true
            },
            statusAnimation: {
                enabled: false,
                interval: 30000, // 30 seconds
                messages: [
                    {
                        text: 'Discord Self-Bot',
                        type: 'PLAYING'
                    },
                    {
                        text: 'with Lunii Dashboard',
                        type: 'PLAYING'
                    },
                    {
                        text: 'your messages',
                        type: 'WATCHING'
                    },
                    {
                        text: 'to music',
                        type: 'LISTENING'
                    },
                    {
                        text: 'Lunii.dev',
                        type: 'STREAMING',
                        url: 'https://twitch.tv/lunii'
                    }
                ],
                randomOrder: false,
                smoothTransitions: true
            },
            messageLogger: {
                enabled: true,
                maxLogs: 1000,
                logDMs: true,
                logGuilds: true,
                logAttachments: true
            },
            antiGhostPing: {
                enabled: true,
                maxLogs: 100,
                notifyOnDetection: true
            },
            notifications: {
                mentions: true,
                giveaways: true,
                ghostPings: true,
                friendRequests: true,
                serverEvents: true
            },
            security: {
                autoSaveToken: true,
                encryptData: true,
                rateLimitProtection: true,
                suspiciousActivityDetection: true
            },
            performance: {
                cacheSize: 1000,
                cleanupInterval: 3600000, // 1 hour
                memoryOptimization: true
            },
            ai: {
                geminiApiKey: '',
                enabled: false,
                rateLimit: 10,
                rateLimitWindow: 60000
            }
        };

        await this.saveConfiguration(defaultConfig);
        return defaultConfig;
    }

    async saveConfiguration(config = this.config) {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
            this.config = config;
            this.logger.info('Configuration saved successfully');
        } catch (error) {
            this.logger.error('Error saving configuration:', error);
        }
    }

    setupIPC() {
        // Authentication
        ipcMain.handle('login', async (event, token, saveToken = false) => {
            return await this.login(token, saveToken);
        });

        // User data
        ipcMain.handle('discord-get-user-data', () => {
            return this.getUserData();
        });

        ipcMain.handle('discord-get-stats', () => {
            return this.getStats();
        });

        // Configuration
        ipcMain.handle('discord-get-config', () => {
            return this.config;
        });

        ipcMain.handle('discord-update-config', async (event, updates) => {
            Object.assign(this.config, updates);
            await this.saveConfiguration();
            return this.config;
        });

        // Settings
        ipcMain.handle('discord-update-setting', async (event, setting, value) => {
            return await this.updateSetting(setting, value);
        });

        // Friends and servers
        ipcMain.handle('discord-get-friends', () => {
            return this.getFriends();
        });

        ipcMain.handle('discord-get-servers', () => {
            return this.getServers();
        });

        ipcMain.handle('discord-get-server-details', async (event, serverId) => {
            return await this.getServerDetails(serverId);
        });

        // Messaging
        ipcMain.handle('discord-send-message', async (event, data) => {
            return await this.sendMessage(data);
        });

        // Giveaway system
        ipcMain.handle('discord-set-giveaway-settings', async (event, settings) => {
            return await this.setGiveawaySettings(settings);
        });

        ipcMain.handle('discord-get-giveaway-logs', () => {
            return this.giveawaySystem ? this.giveawaySystem.getLogs() : [];
        });

        // AFK system
        ipcMain.handle('discord-set-afk', async (event, settings) => {
            return await this.setAFKSettings(settings);
        });

        // Status animation
        ipcMain.handle('discord-set-status-animation', async (event, settings) => {
            return await this.setStatusAnimationSettings(settings);
        });

        // AI integration
        ipcMain.handle('discord-setup-gemini', async (event, apiKey) => {
            return await this.setupGeminiAI(apiKey);
        });

        ipcMain.handle('discord-ai-assist', async (event, prompt) => {
            return await this.getAIAssistance(prompt);
        });

        // Logging
        ipcMain.handle('discord-get-message-logs', () => {
            return this.messageLogger ? this.messageLogger.getLogs() : { logs: [] };
        });

        ipcMain.handle('discord-clear-message-logs', () => {
            if (this.messageLogger) this.messageLogger.clearLogs();
            return { success: true };
        });

        ipcMain.handle('discord-get-ghost-ping-logs', () => {
            return this.ghostPingDetector ? this.ghostPingDetector.getLogs() : { logs: [] };
        });

        ipcMain.handle('discord-clear-ghost-ping-logs', () => {
            if (this.ghostPingDetector) this.ghostPingDetector.clearLogs();
            return { success: true };
        });
    }

    async login(token, saveToken = false) {
        try {
            this.logger.info('Attempting to login to Discord...');
            
            this.client = new Client({
                checkUpdate: false,
                syncStatus: false,
                autoReconnect: true,
                restTimeOffset: 0,
                restRequestTimeout: 30000,
                restSweepInterval: 60,
                restGlobalRateLimit: 50,
                retryLimit: 3,
                presence: {
                    status: 'online'
                }
            });

            // Set up event listeners
            this.setupEventListeners();

            // Login with token
            await this.client.login(token);
            
            this.token = token;
            this.isReady = true;
            this.stats.isReady = true;

            // Initialize feature systems
            await this.initializeFeatureSystems();

            this.logger.info('Successfully logged in to Discord');
            
            return {
                success: true,
                user: this.getUserData()
            };
        } catch (error) {
            this.logger.error('Login failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    setupEventListeners() {
        this.client.on('ready', () => {
            this.logger.info(`Logged in as ${this.client.user.tag}`);
            this.userData = this.formatUserData(this.client.user);
            this.isReady = true;
            this.stats.isReady = true;
        });

        this.client.on('messageCreate', (message) => {
            this.handleMessage(message);
        });

        this.client.on('messageDelete', (message) => {
            this.handleMessageDelete(message);
        });

        this.client.on('error', (error) => {
            this.logger.error('Discord client error:', error);
        });

        this.client.on('disconnect', () => {
            this.logger.warn('Disconnected from Discord');
            this.isReady = false;
            this.stats.isReady = false;
        });

        this.client.on('reconnecting', () => {
            this.logger.info('Reconnecting to Discord...');
        });
    }

    async initializeFeatureSystems() {
        try {
            // Initialize Giveaway System
            this.giveawaySystem = new GiveawaySystem(this.client, this.config.giveaway, this.logger);
            
            // Initialize AFK System
            this.afkSystem = new AFKSystem(this.client, this.config.afk, this.logger);
            
            // Initialize Status Animation System
            this.statusAnimationSystem = new StatusAnimationSystem(this.client, this.config.statusAnimation, this.logger);
            
            // Initialize Message Logger
            this.messageLogger = new MessageLogger(this.config.messageLogger, this.logger);
            
            // Initialize Ghost Ping Detector
            this.ghostPingDetector = new GhostPingDetector(this.config.antiGhostPing, this.logger);
            
            // Setup AI if configured
            if (this.config.ai.geminiApiKey) {
                await this.setupGeminiAI(this.config.ai.geminiApiKey);
            }
            
            this.logger.info('All feature systems initialized successfully');
        } catch (error) {
            this.logger.error('Error initializing feature systems:', error);
        }
    }

    async handleMessage(message) {
        try {
            // Skip own messages
            if (message.author.id === this.client.user.id) return;

            // Message logging
            if (this.messageLogger) {
                this.messageLogger.logMessage(message);
            }

            // Giveaway detection
            if (this.giveawaySystem && this.giveawaySystem.isEnabled()) {
                await this.giveawaySystem.handleMessage(message);
            }

            // AFK system
            if (this.afkSystem && this.afkSystem.isEnabled()) {
                await this.afkSystem.handleMessage(message);
            }

            // Check for mentions
            if (message.mentions.has(this.client.user)) {
                this.sendNotification({
                    type: 'mention',
                    title: 'New Mention',
                    content: message.content,
                    author: message.author.username,
                    guild: message.guild?.name,
                    channel: message.channel.name,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            this.logger.error('Error handling message:', error);
        }
    }

    async handleMessageDelete(message) {
        try {
            // Ghost ping detection
            if (this.ghostPingDetector && message.mentions?.has(this.client.user)) {
                this.ghostPingDetector.logGhostPing(message);
                
                if (this.config.antiGhostPing.notifyOnDetection) {
                    this.sendNotification({
                        type: 'ghost-ping',
                        title: 'Ghost Ping Detected',
                        content: message.content || 'Message content unavailable',
                        author: message.author?.username || 'Unknown',
                        guild: message.guild?.name,
                        channel: message.channel?.name,
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            this.logger.error('Error handling message delete:', error);
        }
    }

    sendNotification(notification) {
        // Send notification to main window
        if (this.client.emit) {
            this.client.emit('notification', notification);
        }
    }

    formatUserData(user) {
        return {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            displayName: user.displayName || user.username,
            formattedName: user.tag,
            avatar: user.displayAvatarURL({ size: 128 }),
            badges: this.getUserBadges(user),
            servers: this.client.guilds.cache.size,
            friends: this.client.relationships.cache.filter(r => r.type === 1).size
        };
    }

    getUserBadges(user) {
        const badges = [];
        if (user.flags) {
            const flags = user.flags.toArray();
            flags.forEach(flag => {
                badges.push(flag.replace(/_/g, ' ').toLowerCase());
            });
        }
        return badges;
    }

    getUserData() {
        if (!this.client?.user) return null;
        return this.formatUserData(this.client.user);
    }

    getStats() {
        return {
            ...this.stats,
            giveawaySettings: this.config.giveaway,
            afkSettings: this.config.afk,
            statusAnimation: this.config.statusAnimation
        };
    }

    getFriends() {
        if (!this.client?.relationships) return [];
        
        return this.client.relationships.cache
            .filter(relationship => relationship.type === 1)
            .map(relationship => ({
                id: relationship.user.id,
                username: relationship.user.username,
                discriminator: relationship.user.discriminator,
                avatar: relationship.user.displayAvatarURL({ size: 64 }),
                status: relationship.user.presence?.status || 'offline'
            }))
            .slice(0, 100); // Limit to prevent UI overload
    }

    getServers() {
        if (!this.client?.guilds) return [];
        
        return this.client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 64 }),
            memberCount: guild.memberCount,
            owner: guild.ownerId === this.client.user.id
        }));
    }

    async getServerDetails(serverId) {
        try {
            const guild = this.client.guilds.cache.get(serverId);
            if (!guild) return null;

            const channels = guild.channels.cache
                .filter(channel => channel.type === 0 || channel.type === 2) // Text and voice channels
                .map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type === 0 ? 'text' : 'voice'
                }))
                .slice(0, 50);

            return {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ size: 128 }),
                memberCount: guild.memberCount,
                channels,
                roles: guild.roles.cache.size,
                owner: guild.ownerId === this.client.user.id
            };
        } catch (error) {
            this.logger.error('Error getting server details:', error);
            return null;
        }
    }

    async sendMessage(data) {
        try {
            const { channelId, content, embed, tts } = data;
            
            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                throw new Error('Channel not found');
            }

            const messageOptions = {
                content: content || undefined,
                embeds: embed ? [embed] : undefined,
                tts: tts || false
            };

            // Use custom HTTPS agent for Discord API requests
            const httpsAgent = new https.Agent({
                rejectUnauthorized: false,
                secureProtocol: 'TLSv1_2_method',
                timeout: 30000
            });

            // Send message with proper SSL handling
            const message = await channel.send(messageOptions);
            
            this.stats.commandsUsed++;
            this.logger.info(`Message sent to channel ${channelId}`);
            
            return {
                success: true,
                messageId: message.id
            };
        } catch (error) {
            this.logger.error('Failed to send message:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async setGiveawaySettings(settings) {
        try {
            Object.assign(this.config.giveaway, settings);
            await this.saveConfiguration();
            
            if (this.giveawaySystem) {
                this.giveawaySystem.updateConfig(this.config.giveaway);
            }
            
            return { success: true };
        } catch (error) {
            this.logger.error('Error updating giveaway settings:', error);
            return { success: false, error: error.message };
        }
    }

    async setAFKSettings(settings) {
        try {
            Object.assign(this.config.afk, settings);
            await this.saveConfiguration();
            
            if (this.afkSystem) {
                this.afkSystem.updateConfig(this.config.afk);
            }
            
            return { success: true };
        } catch (error) {
            this.logger.error('Error updating AFK settings:', error);
            return { success: false, error: error.message };
        }
    }

    async setStatusAnimationSettings(settings) {
        try {
            Object.assign(this.config.statusAnimation, settings);
            await this.saveConfiguration();
            
            if (this.statusAnimationSystem) {
                this.statusAnimationSystem.updateConfig(this.config.statusAnimation);
            }
            
            return { success: true };
        } catch (error) {
            this.logger.error('Error updating status animation settings:', error);
            return { success: false, error: error.message };
        }
    }

    async setupGeminiAI(apiKey) {
        try {
            this.geminiAI = new GoogleGenerativeAI(apiKey);
            this.config.ai.geminiApiKey = apiKey;
            this.config.ai.enabled = true;
            await this.saveConfiguration();
            
            // Test the API
            const model = this.geminiAI.getGenerativeModel({ model: 'gemini-pro' });
            await model.generateContent('Test');
            
            this.logger.info('Gemini AI initialized successfully');
            return { success: true };
        } catch (error) {
            this.logger.error('Error setting up Gemini AI:', error);
            return { success: false, error: error.message };
        }
    }

    async getAIAssistance(prompt) {
        try {
            if (!this.geminiAI || !this.config.ai.enabled) {
                throw new Error('AI not configured');
            }

            const model = this.geminiAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            return {
                success: true,
                response: response.text()
            };
        } catch (error) {
            this.logger.error('Error getting AI assistance:', error);
            return { success: false, error: error.message };
        }
    }

    async updateSetting(setting, value) {
        try {
            switch (setting) {
                case 'customStatus':
                    await this.client.user.setActivity(value);
                    break;
                case 'status':
                    await this.client.user.setStatus(value);
                    break;
                default:
                    this.logger.warn(`Unknown setting: ${setting}`);
            }
            return { success: true };
        } catch (error) {
            this.logger.error(`Error updating setting ${setting}:`, error);
            return { success: false, error: error.message };
        }
    }

    logout() {
        try {
            if (this.client) {
                this.client.destroy();
            }
            
            // Stop all feature systems
            if (this.giveawaySystem) this.giveawaySystem.stop();
            if (this.afkSystem) this.afkSystem.stop();
            if (this.statusAnimationSystem) this.statusAnimationSystem.stop();
            
            this.isReady = false;
            this.stats.isReady = false;
            this.logger.info('Logged out successfully');
        } catch (error) {
            this.logger.error('Error during logout:', error);
        }
    }
}

// Giveaway System
class GiveawaySystem {
    constructor(client, config, logger) {
        this.client = client;
        this.config = config;
        this.logger = logger;
        this.logs = [];
        this.hourlyCount = 0;
        this.lastHourReset = Date.now();
        this.enabled = config.enabled;
    }

    isEnabled() {
        return this.enabled && this.config.enabled;
    }

    updateConfig(config) {
        this.config = config;
        this.enabled = config.enabled;
    }

    async handleMessage(message) {
        if (!this.isEnabled()) return;
        if (message.author.id === this.client.user.id) return;

        try {
            // Reset hourly count if needed
            if (Date.now() - this.lastHourReset > 3600000) {
                this.hourlyCount = 0;
                this.lastHourReset = Date.now();
            }

            // Check hourly limit
            if (this.hourlyCount >= this.config.maxPerHour) return;

            // Check if message is a giveaway
            if (await this.isGiveaway(message)) {
                await this.joinGiveaway(message);
            }
        } catch (error) {
            this.logger.error('Error handling giveaway message:', error);
        }
    }

    async isGiveaway(message) {
        // Check if from verified bot (if enabled)
        if (this.config.verifiedBotsOnly && !message.author.bot) {
            return false;
        }

        // Check channel whitelist/blacklist
        if (this.config.channelWhitelist.length > 0) {
            if (!this.config.channelWhitelist.includes(message.channel.id)) {
                return false;
            }
        }

        if (this.config.channelBlacklist.includes(message.channel.id)) {
            return false;
        }

        // Check for giveaway keywords
        const content = message.content.toLowerCase();
        const hasKeyword = this.config.keywords.some(keyword => 
            content.includes(keyword.toLowerCase())
        );

        if (this.config.requireKeywords && !hasKeyword) {
            return false;
        }

        // Check for embeds with giveaway indicators
        if (message.embeds.length > 0) {
            const embed = message.embeds[0];
            const embedText = (embed.title + ' ' + embed.description).toLowerCase();
            const hasEmbedKeyword = this.config.keywords.some(keyword => 
                embedText.includes(keyword.toLowerCase())
            );
            
            if (hasEmbedKeyword) return true;
        }

        return hasKeyword;
    }

    async joinGiveaway(message) {
        try {
            // Random delay to avoid detection
            const delay = Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay;
            await new Promise(resolve => setTimeout(resolve, delay));

            // Try to react with configured emojis
            const emoji = this.config.reactionEmojis[Math.floor(Math.random() * this.config.reactionEmojis.length)];
            
            await message.react(emoji);
            
            this.hourlyCount++;
            
            // Log the giveaway join
            const logEntry = {
                id: Date.now().toString(),
                messageId: message.id,
                channelId: message.channel.id,
                channelName: message.channel.name,
                guildId: message.guild?.id,
                guildName: message.guild?.name,
                authorId: message.author.id,
                authorName: message.author.username,
                content: message.content.substring(0, 200),
                emoji: emoji,
                timestamp: Date.now()
            };
            
            this.logs.unshift(logEntry);
            if (this.logs.length > 100) {
                this.logs = this.logs.slice(0, 100);
            }
            
            this.logger.info(`Joined giveaway in ${message.guild?.name || 'DM'} - ${message.channel.name}`);
            
        } catch (error) {
            this.logger.error('Error joining giveaway:', error);
        }
    }

    getLogs() {
        return this.logs;
    }

    stop() {
        this.enabled = false;
    }
}

// AFK System
class AFKSystem {
    constructor(client, config, logger) {
        this.client = client;
        this.config = config;
        this.logger = logger;
        this.isAFK = false;
        this.afkStartTime = null;
        this.lastActivity = Date.now();
        this.responseCount = new Map(); // Track responses per user
        this.enabled = config.enabled;
        
        if (this.enabled) {
            this.startActivityMonitoring();
        }
    }

    isEnabled() {
        return this.enabled && this.config.enabled;
    }

    updateConfig(config) {
        this.config = config;
        this.enabled = config.enabled;
        
        if (this.enabled && !this.activityInterval) {
            this.startActivityMonitoring();
        } else if (!this.enabled && this.activityInterval) {
            this.stopActivityMonitoring();
        }
    }

    startActivityMonitoring() {
        this.activityInterval = setInterval(() => {
            this.checkAFKStatus();
        }, 30000); // Check every 30 seconds
    }

    stopActivityMonitoring() {
        if (this.activityInterval) {
            clearInterval(this.activityInterval);
            this.activityInterval = null;
        }
    }

    checkAFKStatus() {
        const now = Date.now();
        const timeSinceActivity = now - this.lastActivity;
        
        if (!this.isAFK && timeSinceActivity > this.config.timeout) {
            this.setAFK(true);
        } else if (this.isAFK && timeSinceActivity < this.config.timeout) {
            this.setAFK(false);
        }
    }

    setAFK(afk) {
        this.isAFK = afk;
        if (afk) {
            this.afkStartTime = Date.now();
            this.logger.info('User is now AFK');
        } else {
            this.afkStartTime = null;
            this.responseCount.clear();
            this.logger.info('User is no longer AFK');
        }
    }

    updateActivity() {
        this.lastActivity = Date.now();
        if (this.isAFK) {
            this.setAFK(false);
        }
    }

    async handleMessage(message) {
        if (!this.isEnabled()) return;
        
        // Update activity if message is from the bot user
        if (message.author.id === this.client.user.id) {
            this.updateActivity();
            return;
        }

        // Handle AFK responses
        if (this.isAFK && message.mentions.has(this.client.user)) {
            await this.sendAFKResponse(message);
        }
    }

    async sendAFKResponse(message) {
        try {
            const userId = message.author.id;
            const userResponseCount = this.responseCount.get(userId) || 0;
            
            // Check response limit
            if (userResponseCount >= this.config.responseLimit) {
                return;
            }

            let responseMessage = this.config.message;
            
            // Use AI response if enabled and configured
            if (this.config.aiEnabled && this.client.geminiAI) {
                try {
                    const aiPrompt = `${this.config.aiPrompt}\n\nUser message: "${message.content}"\nRespond briefly and naturally.`;
                    const aiResponse = await this.client.getAIAssistance(aiPrompt);
                    
                    if (aiResponse.success) {
                        responseMessage = aiResponse.response;
                    }
                } catch (error) {
                    this.logger.error('Error getting AI response for AFK:', error);
                }
            }

            // Add AFK duration to message
            if (this.afkStartTime) {
                const afkDuration = Date.now() - this.afkStartTime;
                const minutes = Math.floor(afkDuration / 60000);
                if (minutes > 0) {
                    responseMessage += ` (AFK for ${minutes} minute${minutes !== 1 ? 's' : ''})`;
                }
            }

            await message.reply(responseMessage);
            
            // Update response count
            this.responseCount.set(userId, userResponseCount + 1);
            
            this.logger.info(`Sent AFK response to ${message.author.username}`);
            
        } catch (error) {
            this.logger.error('Error sending AFK response:', error);
        }
    }

    stop() {
        this.enabled = false;
        this.stopActivityMonitoring();
    }
}

// Status Animation System
class StatusAnimationSystem {
    constructor(client, config, logger) {
        this.client = client;
        this.config = config;
        this.logger = logger;
        this.currentIndex = 0;
        this.animationInterval = null;
        this.enabled = config.enabled;
        
        if (this.enabled) {
            this.startAnimation();
        }
    }

    isEnabled() {
        return this.enabled && this.config.enabled;
    }

    updateConfig(config) {
        this.config = config;
        this.enabled = config.enabled;
        
        if (this.enabled && !this.animationInterval) {
            this.startAnimation();
        } else if (!this.enabled && this.animationInterval) {
            this.stopAnimation();
        }
    }

    startAnimation() {
        if (this.config.messages.length === 0) return;
        
        this.animationInterval = setInterval(() => {
            this.updateStatus();
        }, this.config.interval);
        
        // Set initial status
        this.updateStatus();
    }

    stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    }

    async updateStatus() {
        try {
            if (this.config.messages.length === 0) return;
            
            let statusIndex;
            if (this.config.randomOrder) {
                statusIndex = Math.floor(Math.random() * this.config.messages.length);
            } else {
                statusIndex = this.currentIndex % this.config.messages.length;
                this.currentIndex++;
            }
            
            const statusConfig = this.config.messages[statusIndex];
            
            const activityOptions = {
                name: statusConfig.text,
                type: this.getActivityType(statusConfig.type)
            };
            
            if (statusConfig.type === 'STREAMING' && statusConfig.url) {
                activityOptions.url = statusConfig.url;
            }
            
            await this.client.user.setActivity(activityOptions);
            
            this.logger.debug(`Updated status to: ${statusConfig.type} ${statusConfig.text}`);
            
        } catch (error) {
            this.logger.error('Error updating status:', error);
        }
    }

    getActivityType(type) {
        const types = {
            'PLAYING': 0,
            'STREAMING': 1,
            'LISTENING': 2,
            'WATCHING': 3,
            'CUSTOM': 4,
            'COMPETING': 5
        };
        
        return types[type] || 0;
    }

    stop() {
        this.enabled = false;
        this.stopAnimation();
    }
}

// Message Logger
class MessageLogger {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.logs = [];
        this.enabled = config.enabled;
    }

    logMessage(message) {
        if (!this.enabled || !this.config.enabled) return;
        
        // Skip logging if configured
        if (!this.config.logDMs && !message.guild) return;
        if (!this.config.logGuilds && message.guild) return;
        
        const logEntry = {
            id: message.id,
            content: message.content,
            formattedContent: this.formatMessageContent(message),
            author: {
                id: message.author.id,
                name: message.author.username,
                avatar: message.author.displayAvatarURL({ size: 32 })
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
            attachments: this.config.logAttachments ? message.attachments.map(att => ({
                id: att.id,
                name: att.name,
                url: att.url,
                size: att.size
            })) : []
        };
        
        this.logs.unshift(logEntry);
        
        // Maintain log limit
        if (this.logs.length > this.config.maxLogs) {
            this.logs = this.logs.slice(0, this.config.maxLogs);
        }
    }

    formatMessageContent(message) {
        let content = message.content;
        
        // Replace mentions with readable format
        content = content.replace(/<@!?(\d+)>/g, (match, userId) => {
            const user = message.client.users.cache.get(userId);
            return user ? `@${user.username}` : match;
        });
        
        // Replace channel mentions
        content = content.replace(/<#(\d+)>/g, (match, channelId) => {
            const channel = message.client.channels.cache.get(channelId);
            return channel ? `#${channel.name}` : match;
        });
        
        // Replace role mentions
        content = content.replace(/<@&(\d+)>/g, (match, roleId) => {
            if (message.guild) {
                const role = message.guild.roles.cache.get(roleId);
                return role ? `@${role.name}` : match;
            }
            return match;
        });
        
        return content || '[No content]';
    }

    getLogs() {
        return { logs: this.logs };
    }

    clearLogs() {
        this.logs = [];
    }
}

// Ghost Ping Detector
class GhostPingDetector {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.logs = [];
        this.enabled = config.enabled;
    }

    logGhostPing(message) {
        if (!this.enabled || !this.config.enabled) return;
        
        const logEntry = {
            id: Date.now().toString(),
            messageId: message.id,
            content: message.content || '[Content unavailable]',
            formattedContent: message.content || '[Content unavailable]',
            author: {
                id: message.author?.id || 'unknown',
                name: message.author?.username || 'Unknown User',
                avatar: message.author?.displayAvatarURL({ size: 32 }) || ''
            },
            channel: {
                id: message.channel?.id || 'unknown',
                name: message.channel?.name || 'Unknown Channel'
            },
            guild: message.guild ? {
                id: message.guild.id,
                name: message.guild.name
            } : null,
            timestamp: Date.now(),
            type: 'ghost-ping'
        };
        
        this.logs.unshift(logEntry);
        
        // Maintain log limit
        if (this.logs.length > this.config.maxLogs) {
            this.logs = this.logs.slice(0, this.config.maxLogs);
        }
        
        this.logger.info(`Ghost ping detected from ${logEntry.author.name}`);
    }

    getLogs() {
        return { logs: this.logs };
    }

    clearLogs() {
        this.logs = [];
    }
}

module.exports = DiscordClient;