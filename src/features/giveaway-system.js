const { ActivityType } = require('discord.js-selfbot-v13');

class GiveawaySystem {
    constructor(client, config, logger) {
        this.client = client;
        this.config = config;
        this.logger = logger;
        this.enabled = config.enabled;
        this.joinedGiveaways = new Map();
        this.hourlyCount = 0;
        this.hourlyReset = Date.now() + 3600000; // 1 hour from now
        this.giveawayLogs = [];
        this.maxLogs = 100;
        
        this.verifiedBots = new Set([
            '294882584201003009', // GiveawayBot
            '396464677032427530', // Carl-bot
            '235148962103951360', // Dyno
            '159985870458322944', // Mee6
            '270904126974590976', // Tatsumaki
            '155149108183695360', // Dank Memer
            '432610292342587392', // GiveawayBot (alternative)
            '716390085896962058', // Giveaway Boat
        ]);
    }

    isEnabled() {
        return this.enabled && this.config.enabled;
    }

    updateConfig(config) {
        this.config = config;
        this.enabled = config.enabled;
    }

    async handleMessage(message) {
        if (!this.isEnabled() || !message.guild) return;
        
        // Reset hourly count if needed
        if (Date.now() > this.hourlyReset) {
            this.hourlyCount = 0;
            this.hourlyReset = Date.now() + 3600000;
        }
        
        // Check if we've reached the hourly limit
        if (this.hourlyCount >= this.config.maxPerHour) {
            return;
        }
        
        // Check if it's a giveaway
        if (await this.isGiveaway(message)) {
            await this.joinGiveaway(message);
        }
    }

    async isGiveaway(message) {
        // Check channel whitelist/blacklist
        if (this.config.channelWhitelist && this.config.channelWhitelist.length > 0) {
            if (!this.config.channelWhitelist.includes(message.channel.id)) {
                return false;
            }
        }
        
        if (this.config.channelBlacklist && this.config.channelBlacklist.includes(message.channel.id)) {
            return false;
        }
        
        // Check if author is verified bot (if required)
        if (this.config.verifiedBotsOnly && !this.verifiedBots.has(message.author.id)) {
            return false;
        }
        
        // Check for keywords
        if (this.config.requireKeywords) {
            const content = message.content.toLowerCase();
            const embedContent = message.embeds.map(e => 
                `${e.title || ''} ${e.description || ''} ${e.fields?.map(f => f.value).join(' ') || ''}`
            ).join(' ').toLowerCase();
            
            const fullContent = `${content} ${embedContent}`;
            
            const hasKeyword = this.config.keywords.some(keyword => 
                fullContent.includes(keyword.toLowerCase())
            );
            
            if (!hasKeyword) {
                return false;
            }
        }
        
        return true;
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
            this.joinedGiveaways.set(message.id, {
                messageId: message.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                timestamp: Date.now(),
                emoji: emoji
            });
            
            // Log the giveaway join
            this.logGiveaway(message, emoji);
            
            this.logger?.info(`Joined giveaway in ${message.guild.name} - ${message.channel.name}`);
            
        } catch (error) {
            this.logger?.error('Error joining giveaway:', error);
        }
    }

    logGiveaway(message, emoji) {
        const logEntry = {
            id: Date.now().toString(),
            messageId: message.id,
            channelId: message.channel.id,
            channelName: message.channel.name,
            guildId: message.guild.id,
            guildName: message.guild.name,
            authorId: message.author.id,
            authorName: message.author.username,
            content: message.content.substring(0, 200),
            emoji: emoji,
            timestamp: Date.now()
        };
        
        this.giveawayLogs.unshift(logEntry);
        
        // Keep only recent logs
        if (this.giveawayLogs.length > this.maxLogs) {
            this.giveawayLogs = this.giveawayLogs.slice(0, this.maxLogs);
        }
    }

    getLogs() {
        return {
            logs: this.giveawayLogs,
            hourlyCount: this.hourlyCount,
            nextReset: this.hourlyReset
        };
    }

    getStats() {
        return {
            totalJoined: this.joinedGiveaways.size,
            hourlyCount: this.hourlyCount,
            nextReset: this.hourlyReset,
            enabled: this.isEnabled()
        };
    }

    stop() {
        this.enabled = false;
    }
}

module.exports = GiveawaySystem;