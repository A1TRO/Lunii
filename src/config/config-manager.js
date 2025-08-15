const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.defaultConfig = {
            giveaway: {
                enabled: false,
                keywords: [
                    "🎉", "giveaway", "react", "win", "prize",
                    "enter", "participate", "free", "contest"
                ],
                reactionEmojis: ["🎉", "🎊", "🎁", "✨", "🏆"],
                channelWhitelist: [],
                channelBlacklist: [],
                minDelay: 1000,
                maxDelay: 5000,
                maxPerHour: 10,
                verifiedBotsOnly: true,
                requireKeywords: true
            },
            afk: {
                enabled: false,
                timeout: 300000, // 5 minutes
                message: "I'm currently AFK. I'll get back to you soon!",
                aiEnabled: false,
                aiPrompt: "You are helping respond to messages while the user is away. Be friendly, brief, and helpful. Mention that the user is currently away.",
                responseLimit: 3,
                autoDetection: true
            },
            statusAnimation: {
                enabled: false,
                interval: 30000,
                messages: [
                    {
                        text: "Discord Self-Bot",
                        type: "PLAYING"
                    },
                    {
                        text: "with Lunii Dashboard",
                        type: "PLAYING"
                    },
                    {
                        text: "your messages",
                        type: "WATCHING"
                    },
                    {
                        text: "to music",
                        type: "LISTENING"
                    }
                ],
                randomOrder: false,
                smoothTransitions: true
            },
            ai: {
                enabled: false,
                geminiApiKey: "",
                rateLimit: 10,
                rateLimitWindow: 60000,
                autoRespond: false,
                responseDelay: 2000
            },
            messageLogger: {
                enabled: true,
                maxLogs: 1000,
                logDMs: true,
                logGuilds: true,
                logAttachments: true
            },
            antiGhostPing: {
                enabled: true,
                maxLogs: 100,
                notifyOnDetection: true
            },
            notifications: {
                mentions: true,
                giveaways: true,
                ghostPings: true,
                friendRequests: true,
                serverEvents: true
            },
            security: {
                autoSaveToken: true,
                encryptData: true,
                rateLimitProtection: true,
                suspiciousActivityDetection: true
            },
            performance: {
                cacheSize: 1000,
                cleanupInterval: 3600000,
                memoryOptimization: true
            }
        };
        
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                return this.mergeConfig(this.defaultConfig, configData);
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
        
        return { ...this.defaultConfig };
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                merged[key] = { ...defaultConfig[key], ...userConfig[key] };
            } else {
                merged[key] = userConfig[key];
            }
        }
        
        return merged;
    }

    get(section, key = null) {
        if (key) {
            return this.config[section]?.[key];
        }
        return this.config[section];
    }

    set(section, key, value = null) {
        if (value === null && typeof key === 'object') {
            // Setting entire section
            this.config[section] = { ...this.config[section], ...key };
        } else {
            // Setting specific key
            if (!this.config[section]) {
                this.config[section] = {};
            }
            this.config[section][key] = value;
        }
        
        return this.saveConfig();
    }

    getAll() {
        return { ...this.config };
    }

    reset(section = null) {
        if (section) {
            this.config[section] = { ...this.defaultConfig[section] };
        } else {
            this.config = { ...this.defaultConfig };
        }
        
        return this.saveConfig();
    }
}

module.exports = ConfigManager;