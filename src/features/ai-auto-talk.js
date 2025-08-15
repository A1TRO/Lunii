class AIAutoTalk {
    constructor(client, configManager) {
        this.client = client;
        this.config = configManager;
        this.conversationHistory = new Map(); // Store conversation context per user
        this.rateLimiter = new Map(); // Rate limiting per user
        this.maxHistoryLength = 10; // Keep last 10 messages for context
        this.cooldownPeriod = 5000; // 5 seconds between responses per user
    }

    isEnabled() {
        return this.config.get('aiAutoTalk.enabled');
    }

    isDMMode() {
        return this.config.get('aiAutoTalk.dmMode');
    }

    isAFKMode() {
        return this.config.get('aiAutoTalk.afkMode');
    }

    async handleMessage(message) {
        if (!this.isEnabled()) return;
        if (message.author.id === this.client.client.user.id) return;
        if (message.author.bot && !this.config.get('aiAutoTalk.respondToBots')) return;

        const isDM = !message.guild;
        const isMention = message.mentions.has(this.client.client.user);
        const isAFK = this.client.afkAutoReply.afkStartTime !== null;

        // Check if we should respond
        let shouldRespond = false;
        
        if (isDM && this.isDMMode()) {
            shouldRespond = true;
        } else if (isMention && this.isAFKMode() && isAFK) {
            shouldRespond = true;
        } else if (isMention && this.config.get('aiAutoTalk.respondToMentions')) {
            shouldRespond = true;
        }

        if (!shouldRespond) return;

        // Check rate limiting
        if (this.isRateLimited(message.author.id)) return;

        try {
            // Generate AI response
            const response = await this.generateResponse(message);
            
            if (response) {
                // Add delay to make it seem more natural
                const delay = this.getRandomDelay();
                setTimeout(async () => {
                    try {
                        await message.reply(response);
                        this.updateRateLimit(message.author.id);
                        this.addToHistory(message.author.id, message.content, response);
                    } catch (error) {
                        console.error('Error sending AI response:', error);
                    }
                }, delay);
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
        }
    }

    async generateResponse(message) {
        if (!this.client.geminiAI) {
            console.warn('Gemini AI not initialized');
            return null;
        }

        try {
            const config = this.config.get('aiAutoTalk');
            const userHistory = this.conversationHistory.get(message.author.id) || [];
            
            // Build context prompt
            let prompt = this.buildPrompt(message, userHistory, config);
            
            const model = this.client.geminiAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Clean up the response
            text = this.cleanResponse(text, config);
            
            // Check length limits
            if (text.length > config.maxResponseLength) {
                text = text.substring(0, config.maxResponseLength - 3) + '...';
            }

            return text;
        } catch (error) {
            console.error('Error generating AI response:', error);
            
            // Fallback to predefined responses
            return this.getFallbackResponse(message);
        }
    }

    buildPrompt(message, history, config) {
        const isDM = !message.guild;
        const isAFK = this.client.afkAutoReply.afkStartTime !== null;
        const userName = message.author.displayName || message.author.username;
        const botName = this.client.client.user.displayName || this.client.client.user.username;

        let systemPrompt = `You are ${botName}, a Discord bot assistant. `;
        
        if (isAFK && config.afkMode) {
            const afkDuration = this.formatDuration(Date.now() - this.client.afkAutoReply.afkStartTime);
            systemPrompt += `You are currently AFK (away for ${afkDuration}). `;
        }

        systemPrompt += `Respond naturally and conversationally. `;
        systemPrompt += `Keep responses ${config.responseStyle} and under ${config.maxResponseLength} characters. `;
        
        if (config.personality) {
            systemPrompt += `Your personality: ${config.personality}. `;
        }

        if (isDM) {
            systemPrompt += `This is a direct message conversation with ${userName}. `;
        } else {
            systemPrompt += `This is in a Discord server. You were mentioned by ${userName}. `;
        }

        // Add conversation history for context
        let conversationContext = '';
        if (history.length > 0) {
            conversationContext = '\n\nRecent conversation:\n';
            history.forEach(entry => {
                conversationContext += `${entry.user}: ${entry.message}\n`;
                conversationContext += `${botName}: ${entry.response}\n`;
            });
        }

        const fullPrompt = systemPrompt + conversationContext + `\n\n${userName}: ${message.content}\n${botName}:`;
        
        return fullPrompt;
    }

    cleanResponse(text, config) {
        // Remove common AI response prefixes
        text = text.replace(/^(AI|Bot|Assistant):\s*/i, '');
        text = text.replace(/^(I am|I'm)\s+(an?\s+)?(AI|bot|assistant)/i, '');
        
        // Remove markdown formatting if disabled
        if (!config.allowMarkdown) {
            text = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
            text = text.replace(/\*(.*?)\*/g, '$1'); // Italic
            text = text.replace(/`(.*?)`/g, '$1'); // Code
            text = text.replace(/~~(.*?)~~/g, '$1'); // Strikethrough
        }

        // Clean up extra whitespace
        text = text.trim();
        text = text.replace(/\n\s*\n/g, '\n'); // Multiple newlines
        
        return text;
    }

    getFallbackResponse(message) {
        const config = this.config.get('aiAutoTalk');
        const fallbacks = config.fallbackResponses || [
            "I'm having trouble thinking of a response right now.",
            "Sorry, I'm a bit confused at the moment.",
            "Let me think about that...",
            "I'm not sure how to respond to that.",
            "Could you rephrase that?"
        ];

        const isDM = !message.guild;
        const isAFK = this.client.afkAutoReply.afkStartTime !== null;

        if (isAFK && config.afkMode) {
            const afkFallbacks = [
                "I'm currently AFK, but I saw your message!",
                "Away from keyboard right now, but I'm listening!",
                "I'm AFK but my AI is still here to chat!",
                "Currently away, but I can still respond!"
            ];
            return afkFallbacks[Math.floor(Math.random() * afkFallbacks.length)];
        }

        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    isRateLimited(userId) {
        const lastResponse = this.rateLimiter.get(userId);
        if (!lastResponse) return false;
        
        return (Date.now() - lastResponse) < this.cooldownPeriod;
    }

    updateRateLimit(userId) {
        this.rateLimiter.set(userId, Date.now());
    }

    addToHistory(userId, userMessage, botResponse) {
        let history = this.conversationHistory.get(userId) || [];
        
        history.push({
            user: 'User',
            message: userMessage,
            response: botResponse,
            timestamp: Date.now()
        });

        // Keep only recent history
        if (history.length > this.maxHistoryLength) {
            history = history.slice(-this.maxHistoryLength);
        }

        this.conversationHistory.set(userId, history);
    }

    getRandomDelay() {
        const config = this.config.get('aiAutoTalk');
        const min = config.responseDelay?.min || 1000;
        const max = config.responseDelay?.max || 3000;
        return Math.random() * (max - min) + min;
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

    updateConfig(newConfig) {
        this.config.set('aiAutoTalk', { ...this.config.get('aiAutoTalk'), ...newConfig });
    }

    getConfig() {
        return this.config.get('aiAutoTalk');
    }

    clearHistory(userId = null) {
        if (userId) {
            this.conversationHistory.delete(userId);
        } else {
            this.conversationHistory.clear();
        }
    }

    getStats() {
        return {
            activeConversations: this.conversationHistory.size,
            totalResponses: Array.from(this.conversationHistory.values())
                .reduce((total, history) => total + history.length, 0),
            rateLimitedUsers: this.rateLimiter.size
        };
    }
}

module.exports = AIAutoTalk;