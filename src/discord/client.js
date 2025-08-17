const axios = require('axios');
const { ipcMain } = require('electron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class DiscordClient {
    constructor() {
        this.botToken = null;
        this.applicationId = null;
        this.isReady = false;
        this.userCache = new Map();
        this.guildCache = new Map();
        this.channelCache = new Map();
        this.stats = {
            commandsUsed: 0,
            messagesReceived: 0,
            startTime: Date.now()
        };
        this.geminiAI = null;
        this.baseURL = 'https://discord.com/api/v10';
        this.headers = {};
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
        this.savedCommands = this.loadSavedCommands();
        
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
        
        // Handle guilds requests
        ipcMain.handle('discord-get-servers', () => {
            return this.getServers();
        });
        
        // Handle guild details
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
        try {
            this.botToken = token;
            this.headers = {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Lunii (https://github.com/lunii/lunii, 1.0.0)'
            };

            // Test the token by getting current application info
            const response = await this.makeRequest('GET', '/oauth2/applications/@me');
            
            if (response.success) {
                this.applicationId = response.data.id;
                this.isReady = true;
                this.stats.startTime = Date.now();
                
                // Cache initial data
                await this.cacheInitialData();
                
                return { 
                    success: true, 
                    user: this.getUserData(),
                    application: response.data
                };
            } else {
                return { success: false, error: 'Invalid token or authentication failed' };
            }
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, error: error.message || 'Login failed' };
        }
    }

    async logout() {
        this.isReady = false;
        this.botToken = null;
        this.applicationId = null;
        this.headers = {};
        this.userCache.clear();
        this.guildCache.clear();
        this.channelCache.clear();
    }

    async makeRequest(method, endpoint, data = null, params = null) {
        if (!this.botToken) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const config = {
                method: method.toLowerCase(),
                url: `${this.baseURL}${endpoint}`,
                headers: this.headers,
                timeout: 10000
            };

            if (data) {
                config.data = data;
            }

            if (params) {
                config.params = params;
            }

            const response = await axios(config);
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            console.error(`API Request failed: ${method} ${endpoint}`, error.response?.data || error.message);
            
            return { 
                success: false, 
                error: error.response?.data?.message || error.message,
                status: error.response?.status,
                code: error.response?.data?.code
            };
        }
    }

    async cacheInitialData() {
        try {
            // Get current user (bot) info
            const userResponse = await this.makeRequest('GET', '/users/@me');
            if (userResponse.success) {
                this.currentUser = userResponse.data;
            }

            // Get guilds the bot is in
            const guildsResponse = await this.makeRequest('GET', '/users/@me/guilds');
            if (guildsResponse.success) {
                guildsResponse.data.forEach(guild => {
                    this.guildCache.set(guild.id, {
                        id: guild.id,
                        name: guild.name,
                        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
                        owner: guild.owner,
                        permissions: guild.permissions,
                        features: guild.features
                    });
                });
            }

            // Cache channels for each guild
            for (const [guildId] of this.guildCache) {
                const channelsResponse = await this.makeRequest('GET', `/guilds/${guildId}/channels`);
                if (channelsResponse.success) {
                    channelsResponse.data.forEach(channel => {
                        this.channelCache.set(channel.id, {
                            id: channel.id,
                            name: channel.name,
                            type: channel.type,
                            guild_id: channel.guild_id,
                            position: channel.position,
                            parent_id: channel.parent_id,
                            nsfw: channel.nsfw
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Error caching initial data:', error);
        }
    }

    getUserData() {
        if (!this.isReady || !this.currentUser) {
            return null;
        }

        const user = this.currentUser;
        
        return {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
            bot: user.bot,
            verified: user.verified,
            mfaEnabled: user.mfa_enabled,
            flags: user.flags,
            premiumType: user.premium_type,
            publicFlags: user.public_flags,
            servers: this.guildCache.size,
            channels: this.channelCache.size
        };
    }
    
    getServers() {
        return Array.from(this.guildCache.values());
    }
    
    async getServerDetails(serverId) {
        try {
            const guildResponse = await this.makeRequest('GET', `/guilds/${serverId}`);
            if (!guildResponse.success) {
                return null;
            }

            const guild = guildResponse.data;
            
            // Get channels
            const channelsResponse = await this.makeRequest('GET', `/guilds/${serverId}/channels`);
            const channels = channelsResponse.success ? channelsResponse.data : [];
            
            // Get roles
            const rolesResponse = await this.makeRequest('GET', `/guilds/${serverId}/roles`);
            const roles = rolesResponse.success ? rolesResponse.data : [];
            
            // Get emojis
            const emojisResponse = await this.makeRequest('GET', `/guilds/${serverId}/emojis`);
            const emojis = emojisResponse.success ? emojisResponse.data : [];
            
            return {
                id: guild.id,
                name: guild.name,
                icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
                description: guild.description,
                memberCount: guild.approximate_member_count || guild.member_count,
                channels: channels.map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: this.getChannelTypeName(channel.type),
                    position: channel.position,
                    parentId: channel.parent_id,
                    nsfw: channel.nsfw
                })),
                roles: roles.map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    position: role.position,
                    permissions: role.permissions
                })),
                emojis: emojis.map(emoji => ({
                    id: emoji.id,
                    name: emoji.name,
                    url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`,
                    animated: emoji.animated
                })),
                features: guild.features,
                owner: guild.owner_id,
                verificationLevel: guild.verification_level,
                defaultMessageNotifications: guild.default_message_notifications,
                explicitContentFilter: guild.explicit_content_filter
            };
        } catch (error) {
            console.error('Error getting server details:', error);
            return null;
        }
    }

    getChannelTypeName(type) {
        const types = {
            0: 'text',
            1: 'dm',
            2: 'voice',
            3: 'group',
            4: 'category',
            5: 'news',
            10: 'news_thread',
            11: 'public_thread',
            12: 'private_thread',
            13: 'stage_voice',
            15: 'forum'
        };
        return types[type] || 'unknown';
    }
    
    async sendMessage(data) {
        try {
            const { channelId, content, embeds = [], components = [] } = data;
            
            const messageData = {
                content: content || '',
                embeds: embeds,
                components: components
            };

            const response = await this.makeRequest('POST', `/channels/${channelId}/messages`, messageData);
            
            if (response.success) {
                this.incrementCommandUsage();
                return {
                    success: true,
                    messageId: response.data.id,
                    channelId: response.data.channel_id
                };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getServerChannels(serverId) {
        try {
            const response = await this.makeRequest('GET', `/guilds/${serverId}/channels`);
            
            if (response.success) {
                const channels = response.data.map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: this.getChannelTypeName(channel.type),
                    position: channel.position,
                    parentId: channel.parent_id,
                    nsfw: channel.nsfw || false,
                    topic: channel.topic || null
                })).sort((a, b) => a.position - b.position);
                
                return { success: true, channels };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async getServerMembers(serverId, limit = 100) {
        try {
            const response = await this.makeRequest('GET', `/guilds/${serverId}/members`, null, { limit });
            
            if (response.success) {
                const members = response.data.map(member => ({
                    id: member.user.id,
                    user: {
                        id: member.user.id,
                        username: member.user.username,
                        discriminator: member.user.discriminator,
                        avatar: member.user.avatar ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png` : null,
                        bot: member.user.bot || false
                    },
                    nickname: member.nick,
                    displayName: member.nick || member.user.username,
                    joinedAt: member.joined_at,
                    roles: member.roles,
                    permissions: member.permissions
                }));
                
                return { success: true, members };
            } else {
                return { success: false, error: response.error };
            }
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
            // Execute the saved command based on its type
            let result;
            
            switch (command.type) {
                case 'message':
                    result = await this.sendMessage({
                        channelId: command.channelId,
                        content: command.content
                    });
                    break;
                case 'embed':
                    result = await this.sendMessage({
                        channelId: command.channelId,
                        embeds: [{
                            title: command.title,
                            description: command.description,
                            color: parseInt(command.color || '4F46E5', 16)
                        }]
                    });
                    break;
                default:
                    result = { success: false, error: 'Unknown command type' };
            }
            
            if (result.success) {
                this.incrementCommandUsage();
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async getAIAssistance(prompt) {
        try {
            if (!this.geminiAI) {
                return { success: false, error: 'Gemini AI not configured' };
            }
            
            const model = this.geminiAI.getGenerativeModel({ model: 'gemini-pro' });
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
            const serverDetails = await this.getServerDetails(serverId);
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
            if (options.settings) {
                backup.data.settings = {
                    name: serverDetails.name,
                    description: serverDetails.description,
                    verificationLevel: serverDetails.verificationLevel,
                    defaultMessageNotifications: serverDetails.defaultMessageNotifications,
                    explicitContentFilter: serverDetails.explicitContentFilter
                };
            }
            
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
            // Note: Creating servers requires special permissions and is limited
            return { success: false, error: 'Server creation requires special bot permissions and is rate limited' };
        } catch (error) {
            return { success: false, error: error.message };
        }
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
            
            // Note: Restoring backups requires extensive permissions and careful implementation
            return { success: false, error: 'Backup restore requires additional permissions and careful implementation' };
        } catch (error) {
            return { success: false, error: error.message };
        }
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
            channels: Array.from(this.channelCache.values())
        };
    }

    async updateSetting(setting, value) {
        if (!this.isReady) {
            return { success: false, error: 'Client not ready' };
        }

        try {
            switch (setting) {
                case 'status':
                    // Note: Bot status updates require gateway connection
                    return { success: false, error: 'Status updates require gateway connection (not available in REST-only mode)' };
                case 'activity':
                    // Note: Activity updates require gateway connection
                    return { success: false, error: 'Activity updates require gateway connection (not available in REST-only mode)' };
                default:
                    return { success: false, error: 'Unknown setting' };
            }
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