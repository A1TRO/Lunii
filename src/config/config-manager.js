const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
        
        return this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            autoGiveaway: {
                enabled: false,
                keywords: ['🎉', 'giveaway', 'react', 'win', 'prize', 'enter', 'participate'],
                reactions: ['🎉', '🎊', '🎁', '✨'],
                delay: { min: 1000, max: 3000 },
                blacklistedServers: [],
                whitelistedBots: [
                    '294882584201003009', // GiveawayBot
                    '396464677032427530', // Carl-bot
                    '235148962103951360', // Dyno
                    '159985870458322944', // Mee6
                    '270904126974590976', // Tatsumaki
                    '155149108183695360', // Dank Memer
                    '432610292342587392', // GiveawayBot (alternative)
                    '716390085896962058'  // Giveaway Boat
                ]
            },
            afkAutoReply: {
                enabled: false,
                message: "I'm currently AFK. I'll get back to you soon!",
                customMessages: [
                    "I'm currently AFK. I'll get back to you soon!",
                    "Away from keyboard right now, will respond later!",
                    "Currently unavailable, please leave a message!",
                    "AFK - Will be back soon!"
                ],
                randomMessage: false,
                showDuration: true,
                onlyDMs: false,
                cooldown: 300000 // 5 minutes
            },
            aiAutoTalk: {
                enabled: false,
                dmMode: true,
                afkMode: true,
                respondToMentions: false,
                respondToBots: false,
                personality: 'friendly and helpful',
                responseStyle: 'casual',
                maxResponseLength: 500,
                allowMarkdown: true,
                responseDelay: { min: 1000, max: 3000 },
                fallbackResponses: [
                    "I'm having trouble thinking of a response right now.",
                    "Sorry, I'm a bit confused at the moment.",
                    "Let me think about that...",
                    "I'm not sure how to respond to that.",
                    "Could you rephrase that?"
                ]
            },
            statusAnimation: {
                enabled: false,
                interval: 10000, // 10 seconds
                statuses: [
                    { type: 'PLAYING', text: 'with Discord API' },
                    { type: 'WATCHING', text: 'over my servers' },
                    { type: 'LISTENING', text: 'to notifications' },
                    { type: 'CUSTOM', text: '🤖 Automating Discord' }
                ],
                randomOrder: false
            },
            customRPC: {
                enabled: false,
                applicationId: '',
                details: '',
                state: '',
                largeImageKey: '',
                largeImageText: '',
                smallImageKey: '',
                smallImageText: '',
                startTimestamp: null,
                endTimestamp: null,
                partySize: null,
                partyMax: null,
                buttons: []
            },
            backup: {
                autoBackup: false,
                backupInterval: 86400000, // 24 hours
                maxBackups: 10,
                includeMessages: false,
                includeAttachments: false
            },
            general: {
                autoLogin: true,
                notifications: true,
                theme: 'dark',
                debugMode: false
            }
        };
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

    get(key) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    set(key, value) {
        const keys = key.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
        return this.saveConfig();
    }

    getAll() {
        return { ...this.config };
    }

    reset() {
        this.config = this.getDefaultConfig();
        return this.saveConfig();
    }
}

module.exports = ConfigManager;