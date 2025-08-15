class AFKSystem {
    constructor(client, config, logger) {
        this.client = client;
        this.config = config;
        this.logger = logger;
        this.enabled = config.enabled;
        this.afkUsers = new Map();
        this.responseCount = new Map();
        this.lastActivity = Date.now();
        this.activityTimeout = null;
        this.isAFK = false;
        this.afkStartTime = null;
    }

    isEnabled() {
        return this.enabled && this.config.enabled;
    }

    updateConfig(config) {
        this.config = config;
        this.enabled = config.enabled;
        
        if (config.enabled && !this.isAFK) {
            this.startActivityMonitoring();
        } else if (!config.enabled && this.isAFK) {
            this.setAFK(false);
        }
    }

    startActivityMonitoring() {
        if (!this.client || !this.client.user) return;
        
        // Reset activity timeout
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
        }
        
        this.lastActivity = Date.now();
        
        // Set timeout for AFK detection
        this.activityTimeout = setTimeout(() => {
            if (this.config.autoDetection && !this.isAFK) {
                this.setAFK(true);
            }
        }, this.config.timeout || 300000);
    }

    setAFK(afk, customMessage = null) {
        this.isAFK = afk;
        
        if (afk) {
            this.afkStartTime = Date.now();
            this.responseCount.clear();
            this.logger?.info('User is now AFK');
        } else {
            this.afkStartTime = null;
            this.logger?.info('User is no longer AFK');
            
            if (this.config.autoDetection) {
                this.startActivityMonitoring();
            }
        }
    }

    checkAFKStatus() {
        if (!this.isEnabled()) return false;
        
        if (this.config.autoDetection) {
            const timeSinceActivity = Date.now() - this.lastActivity;
            if (timeSinceActivity >= this.config.timeout && !this.isAFK) {
                this.setAFK(true);
            }
        }
        
        return this.isAFK;
    }

    async handleMessage(message) {
        if (!this.isEnabled()) return;
        
        // Update activity if it's from the bot user
        if (message.author.id === this.client.user.id) {
            this.lastActivity = Date.now();
            
            if (this.isAFK && this.config.autoDetection) {
                this.setAFK(false);
            }
            
            this.startActivityMonitoring();
            return;
        }
        
        // Handle mentions while AFK
        if (this.isAFK && message.mentions.has(this.client.user)) {
            await this.sendAFKResponse(message);
        }
    }

    async sendAFKResponse(message) {
        try {
            const userId = message.author.id;
            const currentCount = this.responseCount.get(userId) || 0;
            
            // Check response limit
            if (currentCount >= this.config.responseLimit) {
                return;
            }
            
            // Calculate AFK duration
            const afkDuration = Date.now() - this.afkStartTime;
            const hours = Math.floor(afkDuration / (1000 * 60 * 60));
            const minutes = Math.floor((afkDuration % (1000 * 60 * 60)) / (1000 * 60));
            
            let responseMessage = this.config.message || "I'm currently AFK. I'll get back to you soon!";
            
            // Add duration if significant
            if (hours > 0) {
                responseMessage += ` (AFK for ${hours}h ${minutes}m)`;
            } else if (minutes > 0) {
                responseMessage += ` (AFK for ${minutes}m)`;
            }
            
            // Send response
            await message.reply(responseMessage);
            
            // Update response count
            this.responseCount.set(userId, currentCount + 1);
            
            this.logger?.info(`Sent AFK response to ${message.author.username}`);
            
        } catch (error) {
            this.logger?.error('Error sending AFK response:', error);
        }
    }

    getAFKStatus() {
        return {
            isAFK: this.isAFK,
            startTime: this.afkStartTime,
            duration: this.afkStartTime ? Date.now() - this.afkStartTime : 0,
            message: this.config.message,
            responsesSent: Array.from(this.responseCount.values()).reduce((a, b) => a + b, 0)
        };
    }

    stop() {
        this.enabled = false;
        this.setAFK(false);
        
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
            this.activityTimeout = null;
        }
    }
}

module.exports = AFKSystem;