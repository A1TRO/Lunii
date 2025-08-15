class AFKAutoReply {
    constructor(client, configManager) {
        this.client = client;
        this.config = configManager;
        this.afkStartTime = null;
        this.replyCooldowns = new Map(); // Track reply cooldowns per user
    }

    isEnabled() {
        return this.config.get('afkAutoReply.enabled');
    }

    setAFK(enabled, customMessage = null) {
        const config = this.config.get('afkAutoReply');
        
        if (enabled) {
            this.afkStartTime = Date.now();
            if (customMessage) {
                this.config.set('afkAutoReply.message', customMessage);
            }
        } else {
            this.afkStartTime = null;
        }
        
        this.config.set('afkAutoReply.enabled', enabled);
        
        return {
            success: true,
            afkStartTime: this.afkStartTime,
            message: customMessage || config.message
        };
    }

    async handleMention(message) {
        if (!this.isEnabled() || !this.afkStartTime) return;
        if (message.author.id === this.client.client.user.id) return;

        const config = this.config.get('afkAutoReply');
        
        // Check if it's DM only mode and message is not a DM
        if (config.onlyDMs && message.guild) return;
        
        // Check cooldown
        const userId = message.author.id;
        const lastReply = this.replyCooldowns.get(userId);
        const now = Date.now();
        
        if (lastReply && (now - lastReply) < config.cooldown) return;
        
        try {
            let replyMessage;
            
            if (config.randomMessage && config.customMessages.length > 0) {
                const randomIndex = Math.floor(Math.random() * config.customMessages.length);
                replyMessage = config.customMessages[randomIndex];
            } else {
                replyMessage = config.message;
            }
            
            // Add duration if enabled
            if (config.showDuration) {
                const duration = this.formatDuration(now - this.afkStartTime);
                replyMessage += ` (AFK for ${duration})`;
            }
            
            await message.reply(replyMessage);
            this.replyCooldowns.set(userId, now);
            
            // Clean up old cooldowns
            this.cleanupCooldowns();
            
        } catch (error) {
            console.error('Error sending AFK auto-reply:', error);
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    cleanupCooldowns() {
        const now = Date.now();
        const config = this.config.get('afkAutoReply');
        
        for (const [userId, lastReply] of this.replyCooldowns.entries()) {
            if (now - lastReply > config.cooldown * 2) {
                this.replyCooldowns.delete(userId);
            }
        }
    }

    updateConfig(newConfig) {
        this.config.set('afkAutoReply', { ...this.config.get('afkAutoReply'), ...newConfig });
    }

    getConfig() {
        return this.config.get('afkAutoReply');
    }

    getStatus() {
        return {
            enabled: this.isEnabled(),
            afkStartTime: this.afkStartTime,
            duration: this.afkStartTime ? Date.now() - this.afkStartTime : 0
        };
    }
}

module.exports = AFKAutoReply;