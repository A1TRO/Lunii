const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const { BackupError } = require('../utils/errors');
const { models } = require('../database/models');

/**
 * Advanced Server Backup Service
 * Handles complete server data extraction, compression, and management
 */
class BackupService extends EventEmitter {
  constructor() {
    super();
    this.activeBackups = new Map();
    this.backupDirectory = path.join(process.cwd(), 'backups');
    this.maxConcurrentBackups = 3;
    this.compressionLevel = 6;
    
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDirectory, { recursive: true });
    } catch (error) {
      logger.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Create a comprehensive server backup
   * @param {string} serverId - Discord server ID
   * @param {string} userId - User creating the backup
   * @param {Object} options - Backup configuration
   * @returns {Promise<Object>} Backup metadata
   */
  async createBackup(serverId, userId, options = {}) {
    const backupId = uuidv4();
    const correlationId = uuidv4();
    
    logger.info('Starting server backup', {
      backupId,
      serverId,
      userId,
      correlationId
    });

    // Check concurrent backup limit
    if (this.activeBackups.size >= this.maxConcurrentBackups) {
      throw new BackupError('Maximum concurrent backups reached. Please try again later.');
    }

    // Create backup record
    const backup = await models.Backup.create({
      id: backupId,
      name: options.name || `Backup-${Date.now()}`,
      description: options.description || '',
      serverId,
      userId,
      status: 'pending',
      backupType: options.backupType || 'full',
      includedData: options.includedData || {
        channels: true,
        roles: true,
        emojis: true,
        webhooks: true,
        settings: true,
        members: false
      },
      filePath: path.join(this.backupDirectory, `${backupId}.zip`),
      startedAt: new Date()
    });

    // Start backup process
    this.activeBackups.set(backupId, {
      backup,
      progress: 0,
      correlationId,
      cancelled: false
    });

    // Process backup asynchronously
    this.processBackup(backupId, serverId, options).catch(error => {
      logger.error('Backup process failed:', { backupId, error: error.message, correlationId });
      this.handleBackupError(backupId, error);
    });

    return backup;
  }

  /**
   * Process the actual backup creation
   * @param {string} backupId - Backup ID
   * @param {string} serverId - Server ID
   * @param {Object} options - Backup options
   */
  async processBackup(backupId, serverId, options) {
    const backupInfo = this.activeBackups.get(backupId);
    if (!backupInfo) return;

    const { backup, correlationId } = backupInfo;

    try {
      // Update status to in_progress
      await backup.update({ status: 'in_progress', progress: 0 });
      this.updateProgress(backupId, 5, 'Initializing backup...');

      // Get Discord client from main process
      const discordClient = global.discordClient;
      if (!discordClient || !discordClient.isReady) {
        throw new BackupError('Discord client not available');
      }

      const guild = discordClient.guilds.cache.get(serverId);
      if (!guild) {
        throw new BackupError('Server not found or not accessible');
      }

      // Collect server data
      const serverData = await this.collectServerData(guild, backup.includedData, backupId);
      this.updateProgress(backupId, 60, 'Compressing backup data...');

      // Create compressed backup file
      const filePath = await this.createBackupFile(serverData, backup.filePath, backupId);
      const fileStats = await fs.stat(filePath);
      const checksum = await this.calculateChecksum(filePath);

      this.updateProgress(backupId, 95, 'Finalizing backup...');

      // Update backup record
      await backup.update({
        status: 'completed',
        progress: 100,
        fileSize: fileStats.size,
        checksum,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days
      });

      this.updateProgress(backupId, 100, 'Backup completed successfully');

      logger.info('Backup completed successfully', {
        backupId,
        serverId,
        fileSize: fileStats.size,
        correlationId
      });

      this.emit('backupCompleted', { backupId, backup });

    } catch (error) {
      await this.handleBackupError(backupId, error);
    } finally {
      this.activeBackups.delete(backupId);
    }
  }

  /**
   * Collect comprehensive server data
   * @param {Guild} guild - Discord guild object
   * @param {Object} includedData - Data types to include
   * @param {string} backupId - Backup ID for progress tracking
   * @returns {Promise<Object>} Server data
   */
  async collectServerData(guild, includedData, backupId) {
    const serverData = {
      metadata: {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        icon: guild.iconURL({ size: 1024 }),
        splash: guild.splashURL({ size: 1024 }),
        banner: guild.bannerURL({ size: 1024 }),
        ownerId: guild.ownerId,
        region: guild.preferredLocale,
        verificationLevel: guild.verificationLevel,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        explicitContentFilter: guild.explicitContentFilter,
        mfaLevel: guild.mfaLevel,
        premiumTier: guild.premiumTier,
        premiumSubscriptionCount: guild.premiumSubscriptionCount,
        features: guild.features,
        vanityURLCode: guild.vanityURLCode,
        createdAt: guild.createdAt.toISOString(),
        backupCreatedAt: new Date().toISOString()
      },
      channels: [],
      roles: [],
      emojis: [],
      stickers: [],
      webhooks: [],
      members: [],
      bans: []
    };

    let progress = 10;

    // Collect channels
    if (includedData.channels) {
      this.updateProgress(backupId, progress, 'Collecting channels...');
      serverData.channels = await this.collectChannels(guild);
      progress += 15;
    }

    // Collect roles
    if (includedData.roles) {
      this.updateProgress(backupId, progress, 'Collecting roles...');
      serverData.roles = await this.collectRoles(guild);
      progress += 10;
    }

    // Collect emojis
    if (includedData.emojis) {
      this.updateProgress(backupId, progress, 'Collecting emojis...');
      serverData.emojis = await this.collectEmojis(guild);
      serverData.stickers = await this.collectStickers(guild);
      progress += 10;
    }

    // Collect webhooks
    if (includedData.webhooks) {
      this.updateProgress(backupId, progress, 'Collecting webhooks...');
      serverData.webhooks = await this.collectWebhooks(guild);
      progress += 5;
    }

    // Collect members (optional, can be large)
    if (includedData.members) {
      this.updateProgress(backupId, progress, 'Collecting members...');
      serverData.members = await this.collectMembers(guild);
      progress += 10;
    }

    this.updateProgress(backupId, progress, 'Data collection completed');
    return serverData;
  }

  /**
   * Collect channel data with permissions
   */
  async collectChannels(guild) {
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
        bitrate: channel.bitrate,
        userLimit: channel.userLimit,
        rateLimitPerUser: channel.rateLimitPerUser,
        rtcRegion: channel.rtcRegion,
        videoQualityMode: channel.videoQualityMode,
        defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration,
        permissionOverwrites: []
      };

      // Collect permission overwrites
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

    return channels.sort((a, b) => a.position - b.position);
  }

  /**
   * Collect role data with permissions
   */
  async collectRoles(guild) {
    const roles = [];
    
    for (const [roleId, role] of guild.roles.cache) {
      roles.push({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        managed: role.managed,
        mentionable: role.mentionable,
        icon: role.iconURL(),
        unicodeEmoji: role.unicodeEmoji,
        createdAt: role.createdAt.toISOString()
      });
    }

    return roles.sort((a, b) => b.position - a.position);
  }

  /**
   * Collect emoji data
   */
  async collectEmojis(guild) {
    const emojis = [];
    
    for (const [emojiId, emoji] of guild.emojis.cache) {
      emojis.push({
        id: emoji.id,
        name: emoji.name,
        animated: emoji.animated,
        url: emoji.url,
        roles: emoji.roles.cache.map(role => role.id),
        managed: emoji.managed,
        available: emoji.available,
        createdAt: emoji.createdAt.toISOString()
      });
    }

    return emojis;
  }

  /**
   * Collect sticker data
   */
  async collectStickers(guild) {
    const stickers = [];
    
    for (const [stickerId, sticker] of guild.stickers.cache) {
      stickers.push({
        id: sticker.id,
        name: sticker.name,
        description: sticker.description,
        tags: sticker.tags,
        type: sticker.type,
        format: sticker.format,
        url: sticker.url,
        available: sticker.available,
        createdAt: sticker.createdAt.toISOString()
      });
    }

    return stickers;
  }

  /**
   * Collect webhook data
   */
  async collectWebhooks(guild) {
    const webhooks = [];
    
    try {
      const guildWebhooks = await guild.fetchWebhooks();
      
      for (const [webhookId, webhook] of guildWebhooks) {
        webhooks.push({
          id: webhook.id,
          name: webhook.name,
          avatar: webhook.avatarURL(),
          channelId: webhook.channelId,
          guildId: webhook.guildId,
          url: webhook.url,
          token: webhook.token, // Be careful with this in production
          type: webhook.type,
          createdAt: webhook.createdAt.toISOString()
        });
      }
    } catch (error) {
      logger.warn('Failed to collect webhooks:', error.message);
    }

    return webhooks;
  }

  /**
   * Collect member data (optional, can be large)
   */
  async collectMembers(guild) {
    const members = [];
    
    try {
      // Fetch all members (this can be slow for large servers)
      const guildMembers = await guild.members.fetch({ limit: 1000 });
      
      for (const [memberId, member] of guildMembers) {
        members.push({
          id: member.id,
          user: {
            id: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            globalName: member.user.globalName,
            avatar: member.user.avatarURL(),
            bot: member.user.bot,
            system: member.user.system
          },
          nickname: member.nickname,
          roles: member.roles.cache.map(role => role.id),
          joinedAt: member.joinedAt?.toISOString(),
          premiumSince: member.premiumSince?.toISOString(),
          communicationDisabledUntil: member.communicationDisabledUntil?.toISOString(),
          pending: member.pending
        });
      }
    } catch (error) {
      logger.warn('Failed to collect members:', error.message);
    }

    return members;
  }

  /**
   * Create compressed backup file
   */
  async createBackupFile(serverData, filePath, backupId) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(filePath);
      const archive = archiver('zip', {
        zlib: { level: this.compressionLevel }
      });

      output.on('close', () => {
        logger.info(`Backup file created: ${archive.pointer()} bytes`, { backupId });
        resolve(filePath);
      });

      archive.on('error', (error) => {
        logger.error('Archive error:', { error: error.message, backupId });
        reject(error);
      });

      archive.on('progress', (progress) => {
        const percentage = Math.round((progress.entries.processed / progress.entries.total) * 100);
        this.updateProgress(backupId, 60 + (percentage * 0.3), 'Compressing data...');
      });

      archive.pipe(output);

      // Add server data as JSON
      archive.append(JSON.stringify(serverData, null, 2), { name: 'server-data.json' });

      // Add metadata
      const metadata = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        backupId,
        serverId: serverData.metadata.id,
        serverName: serverData.metadata.name,
        dataTypes: Object.keys(serverData).filter(key => key !== 'metadata'),
        totalChannels: serverData.channels.length,
        totalRoles: serverData.roles.length,
        totalEmojis: serverData.emojis.length,
        totalMembers: serverData.members.length
      };

      archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });

      archive.finalize();
    });
  }

  /**
   * Calculate file checksum for integrity verification
   */
  async calculateChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const fileBuffer = await fs.readFile(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Update backup progress
   */
  updateProgress(backupId, progress, message) {
    const backupInfo = this.activeBackups.get(backupId);
    if (backupInfo) {
      backupInfo.progress = progress;
      this.emit('backupProgress', { backupId, progress, message });
      
      // Update database record
      models.Backup.update(
        { progress: Math.round(progress) },
        { where: { id: backupId } }
      ).catch(error => {
        logger.error('Failed to update backup progress:', error);
      });
    }
  }

  /**
   * Handle backup errors
   */
  async handleBackupError(backupId, error) {
    logger.error('Backup failed:', { backupId, error: error.message });

    try {
      await models.Backup.update({
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      }, {
        where: { id: backupId }
      });

      // Clean up partial backup file
      const backupInfo = this.activeBackups.get(backupId);
      if (backupInfo && backupInfo.backup.filePath) {
        try {
          await fs.unlink(backupInfo.backup.filePath);
        } catch (unlinkError) {
          logger.error('Failed to clean up partial backup file:', unlinkError);
        }
      }

      this.emit('backupFailed', { backupId, error });
    } catch (updateError) {
      logger.error('Failed to update backup error status:', updateError);
    }
  }

  /**
   * Get server backups
   */
  async getServerBackups(serverId, limit = 50) {
    return await models.Backup.findAll({
      where: { serverId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  /**
   * Get backup information
   */
  async getBackupInfo(backupId) {
    return await models.Backup.findByPk(backupId);
  }

  /**
   * Delete backup with secure file removal
   */
  async deleteBackup(backupId, userId) {
    const backup = await models.Backup.findByPk(backupId);
    
    if (!backup) {
      throw new BackupError('Backup not found');
    }

    if (backup.userId !== userId) {
      throw new BackupError('Unauthorized: You can only delete your own backups');
    }

    try {
      // Remove backup file
      if (backup.filePath && await this.fileExists(backup.filePath)) {
        await fs.unlink(backup.filePath);
        logger.info('Backup file deleted:', { backupId, filePath: backup.filePath });
      }

      // Remove database record
      await backup.destroy();
      
      logger.info('Backup deleted successfully:', { backupId, userId });
      return { success: true };

    } catch (error) {
      logger.error('Failed to delete backup:', { backupId, error: error.message });
      throw new BackupError(`Failed to delete backup: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cancel active backup
   */
  async cancelBackup(backupId, userId) {
    const backupInfo = this.activeBackups.get(backupId);
    
    if (!backupInfo) {
      throw new BackupError('Backup not found or not active');
    }

    const backup = await models.Backup.findByPk(backupId);
    if (backup.userId !== userId) {
      throw new BackupError('Unauthorized: You can only cancel your own backups');
    }

    backupInfo.cancelled = true;
    
    await models.Backup.update({
      status: 'cancelled',
      completedAt: new Date()
    }, {
      where: { id: backupId }
    });

    this.activeBackups.delete(backupId);
    
    logger.info('Backup cancelled:', { backupId, userId });
    return { success: true };
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(userId) {
    const stats = await models.Backup.findAll({
      where: { userId },
      attributes: [
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'totalBackups'],
        [models.sequelize.fn('SUM', models.sequelize.col('fileSize')), 'totalSize'],
        [models.sequelize.fn('COUNT', models.sequelize.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completedBackups'],
        [models.sequelize.fn('COUNT', models.sequelize.literal("CASE WHEN status = 'failed' THEN 1 END")), 'failedBackups']
      ],
      raw: true
    });

    return stats[0] || {
      totalBackups: 0,
      totalSize: 0,
      completedBackups: 0,
      failedBackups: 0
    };
  }

  /**
   * Clean up expired backups
   */
  async cleanupExpiredBackups() {
    const expiredBackups = await models.Backup.findAll({
      where: {
        expiresAt: {
          [models.Sequelize.Op.lt]: new Date()
        },
        status: 'completed'
      }
    });

    let cleanedCount = 0;

    for (const backup of expiredBackups) {
      try {
        if (backup.filePath && await this.fileExists(backup.filePath)) {
          await fs.unlink(backup.filePath);
        }
        await backup.destroy();
        cleanedCount++;
      } catch (error) {
        logger.error('Failed to cleanup expired backup:', {
          backupId: backup.id,
          error: error.message
        });
      }
    }

    logger.info(`Cleaned up ${cleanedCount} expired backups`);
    return cleanedCount;
  }
}

module.exports = BackupService;