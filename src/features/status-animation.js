class StatusAnimation {
    constructor(client, configManager) {
        this.client = client;
        this.config = configManager;
        this.interval = null;
        this.currentIndex = 0;
    }

    isEnabled() {
        return this.config.get('statusAnimation.enabled');
    }

    start() {
        if (this.interval) this.stop();
        
        const config = this.config.get('statusAnimation');
        if (!config.enabled || config.statuses.length === 0) return;
        
        this.interval = setInterval(() => {
            this.updateStatus();
        }, config.interval);
        
        // Set initial status
        this.updateStatus();
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async updateStatus() {
        const config = this.config.get('statusAnimation');
        if (config.statuses.length === 0) return;
        
        let status;
        
        if (config.randomOrder) {
            const randomIndex = Math.floor(Math.random() * config.statuses.length);
            status = config.statuses[randomIndex];
        } else {
            status = config.statuses[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % config.statuses.length;
        }
        
        try {
            if (status.type === 'CUSTOM') {
                await this.client.client.user.setActivity(status.text, { type: 'CUSTOM' });
            } else {
                await this.client.client.user.setActivity(status.text, { type: status.type });
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    updateConfig(newConfig) {
        const oldConfig = this.config.get('statusAnimation');
        this.config.set('statusAnimation', { ...oldConfig, ...newConfig });
        
        // Restart if enabled
        if (newConfig.enabled) {
            this.start();
        } else {
            this.stop();
        }
    }

    addStatus(status) {
        const config = this.config.get('statusAnimation');
        config.statuses.push(status);
        this.config.set('statusAnimation.statuses', config.statuses);
    }

    removeStatus(index) {
        const config = this.config.get('statusAnimation');
        if (index >= 0 && index < config.statuses.length) {
            config.statuses.splice(index, 1);
            this.config.set('statusAnimation.statuses', config.statuses);
        }
    }

    getConfig() {
        return this.config.get('statusAnimation');
    }
}

module.exports = StatusAnimation;