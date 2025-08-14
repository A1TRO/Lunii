const { Client } = require('discord.js-selfbot-v13');
const { ipcMain } = require('electron');

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
                this.client.relationships.cache.forEach(relationship => {
                    if (relationship.type === 1) { // Friends
                        this.userCache.set(relationship.user.id, {
                            id: relationship.user.id,
                            username: relationship.user.username,
                            discriminator: relationship.user.discriminator,
                            avatar: relationship.user.displayAvatarURL(),
                            status: relationship.user.presence?.status || 'offline'
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
            
            // Check for mentions
            if (message.mentions.has(this.client.user)) {
                this.sendNotification({
                    type: 'mention',
                    title: 'You got pinged!',
                    content: message.content,
                    author: message.author.username,
                    channel: message.channel.name || 'DM',
                    guild: message.guild?.name || 'Direct Message',
                    timestamp: Date.now()
                });
            }
            
            // Check for giveaway keywords
            const giveawayKeywords = ['🎉', 'giveaway', 'react', 'win', 'prize'];
            const hasGiveawayKeyword = giveawayKeywords.some(keyword => 
                message.content.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (hasGiveawayKeyword && message.guild) {
                this.sendNotification({
                    type: 'success',
                    title: 'Giveaway Detected',
                    content: `Potential giveaway found in ${message.guild.name}`,
                    author: message.author.username,
                    channel: message.channel.name,
                    guild: message.guild.name,
                    timestamp: Date.now()
                });
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

    getUserData() {
        if (!this.client || !this.isReady || !this.client.user) {
            return null;
        }

        const user = this.client.user;
        const nitroType = user.premiumType;
        
        return {
            id: user.id,
            username: user.username,
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
            if (user.flags.has('VERIFIED_DEVELOPER')) badges.push('VERIFIED_DEVELOPER');
        }
        
        return badges;
    }
    
    getFriends() {
        return Array.from(this.userCache.values());
    }
    
    getServers() {
        return Array.from(this.guildCache.values());
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