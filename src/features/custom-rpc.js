const { Client } = require('discord-rpc');

class CustomRPC {
    constructor(configManager) {
        this.config = configManager;
        this.rpcClient = null;
        this.isConnected = false;
    }

    isEnabled() {
        return this.config.get('customRPC.enabled');
    }

    async connect() {
        const config = this.config.get('customRPC');
        if (!config.applicationId) {
            throw new Error('Application ID is required for Custom RPC');
        }

        try {
            this.rpcClient = new Client({ transport: 'ipc' });
            
            await this.rpcClient.login({ clientId: config.applicationId });
            this.isConnected = true;
            
            // Set initial activity
            await this.updateActivity();
            
            return { success: true };
        } catch (error) {
            console.error('Error connecting to Discord RPC:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.rpcClient && this.isConnected) {
            try {
                await this.rpcClient.destroy();
            } catch (error) {
                console.error('Error disconnecting RPC:', error);
            }
        }
        
        this.rpcClient = null;
        this.isConnected = false;
    }

    async updateActivity() {
        if (!this.isConnected || !this.rpcClient) return;
        
        const config = this.config.get('customRPC');
        
        const activity = {
            details: config.details || undefined,
            state: config.state || undefined,
            startTimestamp: config.startTimestamp || Date.now(),
            endTimestamp: config.endTimestamp || undefined,
            largeImageKey: config.largeImageKey || undefined,
            largeImageText: config.largeImageText || undefined,
            smallImageKey: config.smallImageKey || undefined,
            smallImageText: config.smallImageText || undefined,
            instance: false,
        };

        // Add party info if specified
        if (config.partySize && config.partyMax) {
            activity.partyId = 'party-' + Date.now();
            activity.partySize = config.partySize;
            activity.partyMax = config.partyMax;
        }

        // Add buttons if specified
        if (config.buttons && config.buttons.length > 0) {
            activity.buttons = config.buttons.slice(0, 2); // Discord allows max 2 buttons
        }

        try {
            await this.rpcClient.setActivity(activity);
        } catch (error) {
            console.error('Error updating RPC activity:', error);
            throw error;
        }
    }

    async updateConfig(newConfig) {
        const oldConfig = this.config.get('customRPC');
        this.config.set('customRPC', { ...oldConfig, ...newConfig });
        
        if (newConfig.enabled && !this.isConnected) {
            await this.connect();
        } else if (!newConfig.enabled && this.isConnected) {
            await this.disconnect();
        } else if (this.isConnected) {
            await this.updateActivity();
        }
    }

    getConfig() {
        return this.config.get('customRPC');
    }

    getStatus() {
        return {
            enabled: this.isEnabled(),
            connected: this.isConnected,
            applicationId: this.config.get('customRPC.applicationId')
        };
    }
}

module.exports = CustomRPC;