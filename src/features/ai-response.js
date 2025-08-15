const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIResponseSystem {
    constructor(client, config, logger) {
        this.client = client;
        this.config = config;
        this.logger = logger;
        this.enabled = config.enabled;
        this.geminiAI = null;
        this.responseCount = new Map();
        this.hourlyReset = Date.now() + 3600000;
        
        if (config.apiKey) {
            this.initializeAI(config.apiKey);
        }
    }

    isEnabled() {
        return this.enabled && this.config.enabled && this.geminiAI;
    }

    updateConfig(config) {
        this.config = config;
        this.enabled = config.enabled;
        
        if (config.apiKey && config.apiKey !== this.config.apiKey) {
            this.initializeAI(config.apiKey);
        }
    }

    initializeAI(apiKey) {
        try {
            this.geminiAI = new GoogleGenerativeAI(apiKey);
            this.logger?.info('AI system initialized successfully');
        } catch (error) {
            this.logger?.error('Failed to initialize AI system:', error);
            this.geminiAI = null;
        }
    }

    async handleMessage(message) {
        if (!this.isEnabled() || message.author.id === this.client.user.id) return;
        
        // Reset hourly count if needed
        if (Date.now() > this.hourlyReset) {
            this.responseCount.clear();
            this.hourlyReset = Date.now() + 3600000;
        }
        
        // Check rate limit
        const currentHour = Math.floor(Date.now() / 3600000);
        const hourlyCount = this.responseCount.get(currentHour) || 0;
        
        if (hourlyCount >= (this.config.rateLimitPerHour || 20)) {
            return;
        }
        
        // Check if we should respond
        if (await this.shouldRespond(message)) {
            await this.generateResponse(message);
        }
    }

    async shouldRespond(message) {
        // Check if bot is mentioned
        if (message.mentions.has(this.client.user)) {
            return true;
        }
        
        // Check for trigger keywords
        if (this.config.triggerKeywords && this.config.triggerKeywords.length > 0) {
            const content = message.content.toLowerCase();
            const hasKeyword = this.config.triggerKeywords.some(keyword => 
                content.includes(keyword.toLowerCase())
            );
            
            if (hasKeyword) {
                // Apply probability check
                const probability = this.config.responseProbability || 1.0;
                return Math.random() < probability;
            }
        }
        
        // Check channel-specific triggers
        if (this.config.triggerChannels && this.config.triggerChannels.includes(message.channel.id)) {
            const probability = this.config.responseProbability || 0.1; // Lower probability for channel triggers
            return Math.random() < probability;
        }
        
        return false;
    }

    async generateResponse(message) {
        try {
            // Add delay to seem more natural
            const delay = this.config.responseDelay || 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Prepare context
            const context = this.buildContext(message);
            const prompt = this.buildPrompt(message, context);
            
            // Generate response using Gemini
            const model = this.geminiAI.getGenerativeModel({ 
                model: this.config.model || 'gemini-1.5-flash' 
            });
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            if (responseText && responseText.trim()) {
                // Send response
                await message.reply(responseText.trim());
                
                // Update rate limit counter
                const currentHour = Math.floor(Date.now() / 3600000);
                const hourlyCount = this.responseCount.get(currentHour) || 0;
                this.responseCount.set(currentHour, hourlyCount + 1);
                
                this.logger?.info(`AI response sent to ${message.author.username}: ${responseText.substring(0, 50)}...`);
            }
            
        } catch (error) {
            this.logger?.error('Error generating AI response:', error);
        }
    }

    buildContext(message) {
        const context = {
            author: message.author.username,
            channel: message.channel.name,
            guild: message.guild?.name || 'DM',
            timestamp: new Date().toISOString(),
            messageContent: message.content
        };
        
        // Add recent message history for context
        if (message.channel.messages && message.channel.messages.cache) {
            const recentMessages = message.channel.messages.cache
                .filter(msg => msg.id !== message.id)
                .last(3)
                .map(msg => ({
                    author: msg.author.username,
                    content: msg.content.substring(0, 100)
                }));
            
            context.recentMessages = recentMessages;
        }
        
        return context;
    }

    buildPrompt(message, context) {
        const personality = this.config.personality || 'friendly';
        const maxTokens = this.config.maxTokens || 150;
        
        let systemPrompt = '';
        
        switch (personality) {
            case 'friendly':
                systemPrompt = 'You are a friendly and helpful Discord bot. Respond naturally and conversationally. Keep responses concise and engaging.';
                break;
            case 'professional':
                systemPrompt = 'You are a professional Discord assistant. Provide helpful, informative responses in a polite and formal manner.';
                break;
            case 'casual':
                systemPrompt = 'You are a casual Discord bot. Use informal language, be relaxed and fun. You can use some internet slang and emojis.';
                break;
            case 'witty':
                systemPrompt = 'You are a witty and clever Discord bot. Make smart jokes and clever observations. Be entertaining while still being helpful.';
                break;
            default:
                systemPrompt = 'You are a helpful Discord bot. Respond appropriately to messages.';
        }
        
        const prompt = `${systemPrompt}

Context:
- User: ${context.author}
- Channel: ${context.channel}
- Server: ${context.guild}
- Message: "${context.messageContent}"

${context.recentMessages && context.recentMessages.length > 0 ? 
    `Recent conversation:\n${context.recentMessages.map(msg => `${msg.author}: ${msg.content}`).join('\n')}` : ''}

Respond naturally and helpfully. Keep your response under ${maxTokens} characters.`;

        return prompt;
    }

    getStats() {
        const currentHour = Math.floor(Date.now() / 3600000);
        const hourlyCount = this.responseCount.get(currentHour) || 0;
        
        return {
            enabled: this.isEnabled(),
            hourlyResponses: hourlyCount,
            rateLimitPerHour: this.config.rateLimitPerHour || 20,
            personality: this.config.personality || 'friendly',
            model: this.config.model || 'gemini-1.5-flash'
        };
    }

    stop() {
        this.enabled = false;
    }
}

module.exports = AIResponseSystem;