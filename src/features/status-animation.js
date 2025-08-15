const { ActivityType } = require('discord.js-selfbot-v13');

class StatusAnimationSystem {
    constructor(client, config, logger) {
        this.client = client;
        this.config = config;
        this.logger = logger;
        this.enabled = config.enabled;
        this.currentIndex = 0;
        this.animationInterval = null;
        this.messages = config.messages || [];
    }

    isEnabled() {
        return this.enabled && this.config.enabled;
    }

    updateConfig(config) {
        this.config = config;
        this.enabled = config.enabled;
        this.messages = config.messages || [];
        
        // Restart animation with new config
        this.stop();
        if (this.enabled && this.messages.length > 0) {
            this.startAnimation();
        }
    }

    startAnimation() {
        if (!this.client || !this.client.user || !this.isEnabled()) return;
        
        if (this.messages.length === 0) {
            this.logger?.warn('No status messages configured for animation');
            return;
        }
        
        // Update status immediately
        this.updateStatus();
        
        // Set interval for animation
        const interval = this.config.interval || 30000;
        this.animationInterval = setInterval(() => {
            this.updateStatus();
        }, interval);
        
        this.logger?.info('Status animation started');
    }

    async updateStatus() {
        if (!this.client || !this.client.user || !this.isEnabled()) return;
        
        try {
            if (this.messages.length === 0) return;
            
            // Get next status message
            let index = this.currentIndex;
            if (this.config.randomOrder) {
                index = Math.floor(Math.random() * this.messages.length);
            } else {
                index = (index + 1) % this.messages.length;
            }
            
            this.currentIndex = index;
            const statusMessage = this.messages[index];
            
            if (!statusMessage || !statusMessage.text) return;
            
            // Prepare activity options
            const activityOptions = {
                name: statusMessage.text,
                type: this.getActivityType(statusMessage.type)
            };
            
            // Add URL for streaming
            if (statusMessage.type === 'STREAMING' && statusMessage.url) {
                activityOptions.url = statusMessage.url;
            }
            
            // Update Discord status
            await this.client.user.setActivity(activityOptions);
            
            this.logger?.info(`Status updated: ${statusMessage.text} (${statusMessage.type})`);
            
        } catch (error) {
            this.logger?.error('Error updating status:', error);
        }
    }

    getActivityType(type) {
        switch (type?.toUpperCase()) {
            case 'PLAYING': return ActivityType.Playing;
            case 'STREAMING': return ActivityType.Streaming;
            case 'LISTENING': return ActivityType.Listening;
            case 'WATCHING': return ActivityType.Watching;
            case 'COMPETING': return ActivityType.Competing;
            default: return ActivityType.Playing;
        }
    }

    addMessage(text, type = 'PLAYING', url = null) {
        const message = { text, type };
        if (url) message.url = url;
        
        this.messages.push(message);
        this.config.messages = this.messages;
    }

    removeMessage(index) {
        if (index >= 0 && index < this.messages.length) {
            this.messages.splice(index, 1);
            this.config.messages = this.messages;
            
            // Adjust current index if needed
            if (this.currentIndex >= this.messages.length) {
                this.currentIndex = 0;
            }
        }
    }

    getMessages() {
        return [...this.messages];
    }

    getCurrentStatus() {
        if (this.messages.length === 0) return null;
        return this.messages[this.currentIndex] || null;
    }

    stop() {
        this.enabled = false;
        
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        
        this.logger?.info('Status animation stopped');
    }
}

module.exports = StatusAnimationSystem;