const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const archiver = require('archiver');
const extract = require('extract-zip');

class ServerBackup {
    constructor(client, configManager) {
        this.client = client;
        this.config = configManager;
        this.backupDir = path.join(app.getPath('userData'), 'backups');
        this.ensureBackupDir();
    }

    async ensureBackupDir() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            console.error('Error creating backup directory:', error);
        }
    }

    async backupServer(serverId, options = {}) {
        const guild = this.client.client.guilds.cache.get(serverId);
        if (!guild) {
            throw new Error('Server not found');
        }

        const backupId = `${guild.id}-${Date.now()}`;
        const backupData = {
            id: backupId,
            serverId: guild.id,
            serverName: guild.name,
            createdAt: new Date().toISOString(),
            createdBy: this.client.client.user.id,
            options: options,
            data: {}
        };

        try {
            // Basic server info
            backupData.data.info = {
                name: guild.name,
                description: guild.description,
                icon: guild.iconURL({ size: 512 }),
                banner: guild.bannerURL({ size: 1024 }),
                splash: guild.splashURL({ size: 1024 }),
                verificationLevel: guild.verificationLevel,
                defaultMessageNotifications: guild.defaultMessageNotifications,
                explicitContentFilter: guild.explicitContentFilter,
                afkChannelId: guild.afkChannelId,
                afkTimeout: guild.afkTimeout,
                systemChannelId: guild.systemChannelId,
                systemChannelFlags: guild.systemChannelFlags
            };

            // Channels
            if (options.channels !== false) {
                backupData.data.channels = await this.backupChannels(guild);
            }

            // Roles
            if (options.roles !== false) {
                backupData.data.roles = await this.backupRoles(guild);
            }

            // Emojis
            if (options.emojis) {
                backupData.data.emojis = await this.backupEmojis(guild);
            }

            // Stickers
            if (options.stickers) {
                backupData.data.stickers = await this.backupStickers(guild);
            }

            // Bans (if user has permission)
            if (options.bans) {
                try {
                    const bans = await guild.bans.fetch();
                    backupData.data.bans = bans.map(ban => ({
                        userId: ban.user.id,
                        reason: ban.reason
                    }));
                } catch (error) {
                    console.warn('Could not backup bans:', error.message);
                }
            }

            // Save backup
            const backupPath = path.join(this.backupDir, `${backupId}.json`);
            await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

            // Create compressed archive
            if (options.compress !== false) {
                await this.compressBackup(backupId);
            }

            return {
                success: true,
                backupId: backupId,
                backupPath: backupPath,
                size: (await fs.stat(backupPath)).size
            };

        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }

    async backupChannels(guild) {
        const channels = [];
        
        for (const [channelId, channel] of guild.channels.cache) {
            const channelData = {
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parentId: channel.parentId,
                topic: channel.topic,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser,
                bitrate: channel.bitrate,
                userLimit: channel.userLimit,
                permissionOverwrites: []
            };

            // Permission overwrites
            for (const [overwriteId, overwrite] of channel.permissionOverwrites.cache) {
                channelData.permissionOverwrites.push({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.bitfield.toString(),
                    deny: overwrite.deny.bitfield.toString()
                });
            }

            channels.push(channelData);
        }

        return channels;
    }

    async backupRoles(guild) {
        const roles = [];
        
        for (const [roleId, role] of guild.roles.cache) {
            if (role.id === guild.id) continue; // Skip @everyone role
            
            roles.push({
                id: role.id,
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                position: role.position,
                permissions: role.permissions.bitfield.toString(),
                mentionable: role.mentionable,
                managed: role.managed
            });
        }

        return roles;
    }

    async backupEmojis(guild) {
        const emojis = [];
        
        for (const [emojiId, emoji] of guild.emojis.cache) {
            emojis.push({
                id: emoji.id,
                name: emoji.name,
                animated: emoji.animated,
                url: emoji.url,
                roles: emoji.roles.cache.map(role => role.id)
            });
        }

        return emojis;
    }

    async backupStickers(guild) {
        const stickers = [];
        
        for (const [stickerId, sticker] of guild.stickers.cache) {
            stickers.push({
                id: sticker.id,
                name: sticker.name,
                description: sticker.description,
                tags: sticker.tags,
                format: sticker.format,
                url: sticker.url
            });
        }

        return stickers;
    }

    async compressBackup(backupId) {
        const backupPath = path.join(this.backupDir, `${backupId}.json`);
        const archivePath = path.join(this.backupDir, `${backupId}.zip`);
        
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(archivePath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            output.on('close', resolve);
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.file(backupPath, { name: `${backupId}.json` });
            archive.finalize();
        });
    }

    async cloneServer(sourceServerId, newServerName, options = {}) {
        const sourceGuild = this.client.client.guilds.cache.get(sourceServerId);
        if (!sourceGuild) {
            throw new Error('Source server not found');
        }

        try {
            // Create new server
            const newGuild = await this.client.client.guilds.create(newServerName, {
                icon: sourceGuild.iconURL({ size: 512 }),
                verificationLevel: sourceGuild.verificationLevel,
                defaultMessageNotifications: sourceGuild.defaultMessageNotifications,
                explicitContentFilter: sourceGuild.explicitContentFilter
            });

            // Clone roles
            if (options.roles !== false) {
                await this.cloneRoles(sourceGuild, newGuild);
            }

            // Clone channels
            if (options.channels !== false) {
                await this.cloneChannels(sourceGuild, newGuild);
            }

            // Clone emojis
            if (options.emojis) {
                await this.cloneEmojis(sourceGuild, newGuild);
            }

            return {
                success: true,
                newServerId: newGuild.id,
                newServerName: newGuild.name,
                inviteCode: await this.createInvite(newGuild)
            };

        } catch (error) {
            console.error('Error cloning server:', error);
            throw error;
        }
    }

    async cloneRoles(sourceGuild, targetGuild) {
        const roles = Array.from(sourceGuild.roles.cache.values())
            .filter(role => role.id !== sourceGuild.id) // Skip @everyone
            .sort((a, b) => a.position - b.position);

        for (const role of roles) {
            try {
                await targetGuild.roles.create({
                    name: role.name,
                    color: role.color,
                    hoist: role.hoist,
                    permissions: role.permissions,
                    mentionable: role.mentionable,
                    position: role.position
                });
            } catch (error) {
                console.warn(`Failed to clone role ${role.name}:`, error.message);
            }
        }
    }

    async cloneChannels(sourceGuild, targetGuild) {
        const channels = Array.from(sourceGuild.channels.cache.values())
            .sort((a, b) => a.position - b.position);

        const categoryMap = new Map();
        const channelMap = new Map();

        // First pass: Create categories
        for (const channel of channels) {
            if (channel.type === 4) { // Category
                try {
                    const newCategory = await targetGuild.channels.create({
                        name: channel.name,
                        type: channel.type,
                        position: channel.position
                    });
                    categoryMap.set(channel.id, newCategory.id);
                } catch (error) {
                    console.warn(`Failed to clone category ${channel.name}:`, error.message);
                }
            }
        }

        // Second pass: Create other channels
        for (const channel of channels) {
            if (channel.type !== 4) { // Not a category
                try {
                    const channelData = {
                        name: channel.name,
                        type: channel.type,
                        position: channel.position,
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        rateLimitPerUser: channel.rateLimitPerUser,
                        bitrate: channel.bitrate,
                        userLimit: channel.userLimit
                    };

                    if (channel.parentId && categoryMap.has(channel.parentId)) {
                        channelData.parent = categoryMap.get(channel.parentId);
                    }

                    const newChannel = await targetGuild.channels.create(channelData);
                    channelMap.set(channel.id, newChannel.id);
                } catch (error) {
                    console.warn(`Failed to clone channel ${channel.name}:`, error.message);
                }
            }
        }
    }

    async cloneEmojis(sourceGuild, targetGuild) {
        for (const [emojiId, emoji] of sourceGuild.emojis.cache) {
            try {
                await targetGuild.emojis.create({
                    attachment: emoji.url,
                    name: emoji.name
                });
            } catch (error) {
                console.warn(`Failed to clone emoji ${emoji.name}:`, error.message);
            }
        }
    }

    async createInvite(guild) {
        try {
            const channel = guild.channels.cache.find(ch => ch.type === 0); // Text channel
            if (channel) {
                const invite = await channel.createInvite({
                    maxAge: 0, // Never expires
                    maxUses: 0 // Unlimited uses
                });
                return invite.code;
            }
        } catch (error) {
            console.warn('Failed to create invite:', error.message);
        }
        return null;
    }

    async getBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.backupDir, file);
                        const data = await fs.readFile(filePath, 'utf8');
                        const backup = JSON.parse(data);
                        const stats = await fs.stat(filePath);
                        
                        backups.push({
                            id: backup.id,
                            serverName: backup.serverName,
                            createdAt: backup.createdAt,
                            size: stats.size,
                            compressed: await this.hasCompressedVersion(backup.id)
                        });
                    } catch (error) {
                        console.warn(`Error reading backup file ${file}:`, error.message);
                    }
                }
            }

            return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            console.error('Error getting backups:', error);
            return [];
        }
    }

    async hasCompressedVersion(backupId) {
        try {
            const zipPath = path.join(this.backupDir, `${backupId}.zip`);
            await fs.access(zipPath);
            return true;
        } catch {
            return false;
        }
    }

    async deleteBackup(backupId) {
        try {
            const jsonPath = path.join(this.backupDir, `${backupId}.json`);
            const zipPath = path.join(this.backupDir, `${backupId}.zip`);
            
            await fs.unlink(jsonPath).catch(() => {});
            await fs.unlink(zipPath).catch(() => {});
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting backup:', error);
            throw error;
        }
    }
}

module.exports = ServerBackup;