class AutoGiveaway {
    constructor(client, configManager) {
        this.client = client;
        this.config = configManager;
        this.lastReactions = new Map(); // Track last reaction times to avoid spam
    }

    isEnabled() {
        return this.config.get('autoGiveaway.enabled');
    }

    async handleMessage(message) {
        if (!this.isEnabled() || !message.guild) return;

        const config = this.config.get('autoGiveaway');
        
        // Check if server is blacklisted
        if (config.blacklistedServers.includes(message.guild.id)) return;
        
        // Check if author is a whitelisted bot
        if (!config.whitelistedBots.includes(message.author.id)) return;
        
        // Check for giveaway keywords
        const hasKeyword = config.keywords.some(keyword => 
            message.content.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!hasKeyword) return;
        
        // Check cooldown to avoid spam
        const cooldownKey = `${message.guild.id}-${message.channel.id}`;
        const lastReaction = this.lastReactions.get(cooldownKey);
        const now = Date.now();
        
        if (lastReaction && (now - lastReaction) < 5000) return; // 5 second cooldown
        
        // Add random delay
        const delay = Math.random() * (config.delay.max - config.delay.min) + config.delay.min;
        
        setTimeout(async () => {
            try {
                // Try to react with configured reactions
                for (const reaction of config.reactions) {
                    if (message.content.includes(reaction)) {
                        await message.react(reaction);
                        this.lastReactions.set(cooldownKey, now);
                        
                        // Send notification
                        this.client.sendNotification({
                            type: 'success',
                            title: 'Auto Giveaway',
                            content: `Automatically joined giveaway in ${message.guild.name}`,
                            timestamp: Date.now()
                        });
                        
                        break;
                    }
                }
            } catch (error) {
                console.error('Error auto-joining giveaway:', error);
            }
        }, delay);
    }

    updateConfig(newConfig) {
        this.config.set('autoGiveaway', { ...this.config.get('autoGiveaway'), ...newConfig });
    }

    getConfig() {
        return this.config.get('autoGiveaway');
    }
}

module.exports = AutoGiveaway;