const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { CloneError } = require('../utils/errors');
const { models } = require('../database/models');

/**
 * Advanced Server Cloning Service
 * Creates functional Discord server replicas with intelligent permission mapping
 */
class CloneService extends EventEmitter {
  constructor() {
    super();
    this.activeClones = new Map();
    this.maxConcurrentClones = 2;
    this.rateLimitDelay = 1000; // 1 second between API calls
    this.batchSize = 10; // Process items in batches
  }

  /**
   * Clone a Discord server
   * @param {string} sourceServerId - Source server ID
   * @param {string} userId - User performing the clone
   * @param {Object} options - Clone configuration
   * @returns {Promise<Object>} Clone operation result
   */
  async cloneServer(sourceServerId, userId, options = {}) {
    const cloneId = uuidv4();
    const correlationId = uuidv4();

    logger.info('Starting server clone', {
      cloneId,
      sourceServerId,
      userId,
      correlationId
    });

    // Check concurrent clone limit
    if (this.activeClones.size >= this.maxConcurrentClones) {
      throw new CloneError('Maximum concurrent clones reached. Please try again later.');
    }

    // Get Discord client
    const discordClient = global.discordClient;
    if (!discordClient || !discordClient.isReady) {
      throw new CloneError('Discord client not available');
    }

    const sourceGuild = discordClient.guilds.cache.get(sourceServerId);
    if (!sourceGuild) {
      throw new CloneError('Source server not found or not accessible');
    }

    // Validate permissions
    const member = sourceGuild.members.cache.get(userId);
    if (!member || !member.permissions.has('ADMINISTRATOR')) {
      throw new CloneError('Administrator permissions required to clone server');
    }

    // Initialize clone tracking
    this.activeClones.set(cloneId, {
      progress: 0,
      phase: 'initializing',
      correlationId,
      cancelled: false,
      createdGuildId: null,
      rollbackData: []
    });

    // Start clone process asynchronously
    this.processClone(cloneId, sourceGuild, userId, options).catch(error => {
      logger.error('Clone process failed:', { cloneId, error: error.message, correlationId });
      this.handleCloneError(cloneId, error);
    });

    return {
      cloneId,
      status: 'started',
      message: 'Server cloning initiated'
    };
  }

  /**
   * Process the actual server cloning
   */
  async processClone(cloneId, sourceGuild, userId, options) {
    const cloneInfo = this.activeClones.get(cloneId);
    if (!cloneInfo) return;

    try {
      // Phase 1: Create new server
      this.updateProgress(cloneId, 5, 'creating', 'Creating new server...');
      const newGuild = await this.createNewServer(sourceGuild, options);
      cloneInfo.createdGuildId = newGuild.id;

      // Phase 2: Clone roles
      if (options.includeRoles !== false) {
        this.updateProgress(cloneId, 15, 'roles', 'Cloning roles...');
        await this.cloneRoles(sourceGuild, newGuild, cloneId);
      }

      // Phase 3: Clone channels
      if (options.includeChannels !== false) {
        this.updateProgress(cloneId, 40, 'channels', 'Cloning channels...');
        await this.cloneChannels(sourceGuild, newGuild, cloneId);
      }

      // Phase 4: Clone emojis
      if (options.includeEmojis) {
        this.updateProgress(cloneId, 70, 'emojis', 'Cloning emojis...');
        await this.cloneEmojis(sourceGuild, newGuild, cloneId);
      }

      // Phase 5: Clone webhooks
      if (options.includeWebhooks) {
        this.updateProgress(cloneId, 85, 'webhooks', 'Cloning webhooks...');
        await this.cloneWebhooks(sourceGuild, newGuild, cloneId);
      }

      // Phase 6: Finalize
      this.updateProgress(cloneId, 95, 'finalizing', 'Finalizing clone...');
      await this.finalizeClone(sourceGuild, newGuild, cloneId);

      this.updateProgress(cloneId, 100, 'completed', 'Clone completed successfully');

      logger.info('Server clone completed successfully', {
        cloneId,
        sourceServerId: sourceGuild.id,
        newServerId: newGuild.id,
        userId
      });

      this.emit('cloneCompleted', {
        cloneId,
        sourceGuild: {
          id: sourceGuild.id,
          name: sourceGuild.name
        },
        newGuild: {
          id: newGuild.id,
          name: newGuild.name,
          inviteCode: await this.createInvite(newGuild)
        }
      });

    } catch (error) {
      await this.handleCloneError(cloneId, error);
    } finally {
      this.activeClones.delete(cloneId);
    }
  }

  /**
   * Create new Discord server
   */
  async createNewServer(sourceGuild, options) {
    const serverName = options.name || `${sourceGuild.name} (Clone)`;
    
    try {
      const newGuild = await global.discordClient.guilds.create({
        name: serverName,
        icon: sourceGuild.iconURL() ? await this.downloadImage(sourceGuild.iconURL()) : null,
        verificationLevel: sourceGuild.verificationLevel,
        defaultMessageNotifications: sourceGuild.defaultMessageNotifications,
        explicitContentFilter: sourceGuild.explicitContentFilter,
        preferredLocale: sourceGuild.preferredLocale,
        afkTimeout: sourceGuild.afkTimeout,
        systemChannelFlags: sourceGuild.systemChannelFlags
      });

      await this.rateLimitDelay();
      return newGuild;

    } catch (error) {
      throw new CloneError(`Failed to create new server: ${error.message}`, 'creating');
    }
  }

  /**
   * Clone server roles with intelligent permission mapping
   */
  async cloneRoles(sourceGuild, newGuild, cloneId) {
    const cloneInfo = this.activeClones.get(cloneId);
    if (!cloneInfo || cloneInfo.cancelled) return;

    const sourceRoles = sourceGuild.roles.cache
      .filter(role => role.name !== '@everyone')
      .sort((a, b) => a.position - b.position);

    const roleMapping = new Map();
    let processedRoles = 0;

    for (const sourceRole of sourceRoles.values()) {
      if (cloneInfo.cancelled) break;

      try {
        const newRole = await newGuild.roles.create({
          name: sourceRole.name,
          color: sourceRole.color,
          hoist: sourceRole.hoist,
          permissions: sourceRole.permissions,
          mentionable: sourceRole.mentionable,
          icon: sourceRole.icon,
          unicodeEmoji: sourceRole.unicodeEmoji
        });

        roleMapping.set(sourceRole.id, newRole.id);
        cloneInfo.rollbackData.push({ type: 'role', id: newRole.id });

        processedRoles++;
        const progress = 15 + (processedRoles / sourceRoles.size) * 25;
        this.updateProgress(cloneId, progress, 'roles', `Cloned role: ${sourceRole.name}`);

        await this.rateLimitDelay();

      } catch (error) {
        logger.warn('Failed to clone role:', {
          cloneId,
          roleName: sourceRole.name,
          error: error.message
        });
      }
    }

    // Store role mapping for channel permissions
    cloneInfo.roleMapping = roleMapping;
  }

  /**
   * Clone channels with permission overwrites
   */
  async cloneChannels(sourceGuild, newGuild, cloneId) {
    const cloneInfo = this.activeClones.get(cloneId);
    if (!cloneInfo || cloneInfo.cancelled) return;

    // Get channels sorted by position and hierarchy
    const categories = sourceGuild.channels.cache
      .filter(channel => channel.type === 4) // GUILD_CATEGORY
      .sort((a, b) => a.position - b.position);

    const textChannels = sourceGuild.channels.cache
      .filter(channel => channel.type === 0) // GUILD_TEXT
      .sort((a, b) => a.position - b.position);

    const voiceChannels = sourceGuild.channels.cache
      .filter(channel => channel.type === 2) // GUILD_VOICE
      .sort((a, b) => a.position - b.position);

    const channelMapping = new Map();
    let totalChannels = categories.size + textChannels.size + voiceChannels.size;
    let processedChannels = 0;

    // Clone categories first
    for (const category of categories.values()) {
      if (cloneInfo.cancelled) break;

      try {
        const newCategory = await newGuild.channels.create({
          name: category.name,
          type: 4, // GUILD_CATEGORY
          position: category.position,
          permissionOverwrites: this.mapPermissionOverwrites(category, cloneInfo.roleMapping)
        });

        channelMapping.set(category.id, newCategory.id);
        cloneInfo.rollbackData.push({ type: 'channel', id: newCategory.id });

        processedChannels++;
        const progress = 40 + (processedChannels / totalChannels) * 30;
        this.updateProgress(cloneId, progress, 'channels', `Cloned category: ${category.name}`);

        await this.rateLimitDelay();

      } catch (error) {
        logger.warn('Failed to clone category:', {
          cloneId,
          categoryName: category.name,
          error: error.message
        });
      }
    }

    // Clone text channels
    for (const textChannel of textChannels.values()) {
      if (cloneInfo.cancelled) break;

      try {
        const channelData = {
          name: textChannel.name,
          type: 0, // GUILD_TEXT
          topic: textChannel.topic,
          nsfw: textChannel.nsfw,
          rateLimitPerUser: textChannel.rateLimitPerUser,
          position: textChannel.position,
          parent: channelMapping.get(textChannel.parentId),
          permissionOverwrites: this.mapPermissionOverwrites(textChannel, cloneInfo.roleMapping)
        };

        const newChannel = await newGuild.channels.create(channelData);
        channelMapping.set(textChannel.id, newChannel.id);
        cloneInfo.rollbackData.push({ type: 'channel', id: newChannel.id });

        processedChannels++;
        const progress = 40 + (processedChannels / totalChannels) * 30;
        this.updateProgress(cloneId, progress, 'channels', `Cloned text channel: ${textChannel.name}`);

        await this.rateLimitDelay();

      } catch (error) {
        logger.warn('Failed to clone text channel:', {
          cloneId,
          channelName: textChannel.name,
          error: error.message
        });
      }
    }

    // Clone voice channels
    for (const voiceChannel of voiceChannels.values()) {
      if (cloneInfo.cancelled) break;

      try {
        const channelData = {
          name: voiceChannel.name,
          type: 2, // GUILD_VOICE
          bitrate: voiceChannel.bitrate,
          userLimit: voiceChannel.userLimit,
          position: voiceChannel.position,
          parent: channelMapping.get(voiceChannel.parentId),
          permissionOverwrites: this.mapPermissionOverwrites(voiceChannel, cloneInfo.roleMapping)
        };

        const newChannel = await newGuild.channels.create(channelData);
        channelMapping.set(voiceChannel.id, newChannel.id);
        cloneInfo.rollbackData.push({ type: 'channel', id: newChannel.id });

        processedChannels++;
        const progress = 40 + (processedChannels / totalChannels) * 30;
        this.updateProgress(cloneId, progress, 'channels', `Cloned voice channel: ${voiceChannel.name}`);

        await this.rateLimitDelay();

      } catch (error) {
        logger.warn('Failed to clone voice channel:', {
          cloneId,
          channelName: voiceChannel.name,
          error: error.message
        });
      }
    }

    cloneInfo.channelMapping = channelMapping;
  }

  /**
   * Map permission overwrites to new roles/users
   */
  mapPermissionOverwrites(channel, roleMapping) {
    const overwrites = [];

    for (const overwrite of channel.permissionOverwrites.cache.values()) {
      if (overwrite.type === 0) { // Role
        const newRoleId = roleMapping.get(overwrite.id);
        if (newRoleId) {
          overwrites.push({
            id: newRoleId,
            type: 0,
            allow: overwrite.allow,
            deny: overwrite.deny
          });
        }
      } else if (overwrite.type === 1) { // User
        // Keep user overwrites as-is (assuming users exist in both servers)
        overwrites.push({
          id: overwrite.id,
          type: 1,
          allow: overwrite.allow,
          deny: overwrite.deny
        });
      }
    }

    return overwrites;
  }

  /**
   * Clone server emojis
   */
  async cloneEmojis(sourceGuild, newGuild, cloneId) {
    const cloneInfo = this.activeClones.get(cloneId);
    if (!cloneInfo || cloneInfo.cancelled) return;

    const sourceEmojis = sourceGuild.emojis.cache.values();
    let processedEmojis = 0;
    const totalEmojis = sourceGuild.emojis.cache.size;

    for (const emoji of sourceEmojis) {
      if (cloneInfo.cancelled) break;

      try {
        // Download emoji image
        const emojiBuffer = await this.downloadImage(emoji.url);
        
        const newEmoji = await newGuild.emojis.create({
          attachment: emojiBuffer,
          name: emoji.name,
          roles: emoji.roles.cache.map(role => {
            const newRoleId = cloneInfo.roleMapping?.get(role.id);
            return newRoleId;
          }).filter(Boolean)
        });

        cloneInfo.rollbackData.push({ type: 'emoji', id: newEmoji.id });

        processedEmojis++;
        const progress = 70 + (processedEmojis / totalEmojis) * 15;
        this.updateProgress(cloneId, progress, 'emojis', `Cloned emoji: ${emoji.name}`);

        await this.rateLimitDelay();

      } catch (error) {
        logger.warn('Failed to clone emoji:', {
          cloneId,
          emojiName: emoji.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Clone webhooks
   */
  async cloneWebhooks(sourceGuild, newGuild, cloneId) {
    const cloneInfo = this.activeClones.get(cloneId);
    if (!cloneInfo || cloneInfo.cancelled) return;

    try {
      const webhooks = await sourceGuild.fetchWebhooks();
      let processedWebhooks = 0;

      for (const webhook of webhooks.values()) {
        if (cloneInfo.cancelled) break;

        try {
          const targetChannelId = cloneInfo.channelMapping?.get(webhook.channelId);
          if (!targetChannelId) continue;

          const targetChannel = newGuild.channels.cache.get(targetChannelId);
          if (!targetChannel) continue;

          const avatarBuffer = webhook.avatarURL() ? 
            await this.downloadImage(webhook.avatarURL()) : null;

          const newWebhook = await targetChannel.createWebhook({
            name: webhook.name,
            avatar: avatarBuffer
          });

          cloneInfo.rollbackData.push({ type: 'webhook', id: newWebhook.id });

          processedWebhooks++;
          const progress = 85 + (processedWebhooks / webhooks.size) * 10;
          this.updateProgress(cloneId, progress, 'webhooks', `Cloned webhook: ${webhook.name}`);

          await this.rateLimitDelay();

        } catch (error) {
          logger.warn('Failed to clone webhook:', {
            cloneId,
            webhookName: webhook.name,
            error: error.message
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch source webhooks:', { cloneId, error: error.message });
    }
  }

  /**
   * Finalize clone operation
   */
  async finalizeClone(sourceGuild, newGuild, cloneId) {
    const cloneInfo = this.activeClones.get(cloneId);
    if (!cloneInfo || cloneInfo.cancelled) return;

    try {
      // Update server settings
      await newGuild.edit({
        description: sourceGuild.description,
        verificationLevel: sourceGuild.verificationLevel,
        defaultMessageNotifications: sourceGuild.defaultMessageNotifications,
        explicitContentFilter: sourceGuild.explicitContentFilter
      });

      // Set server banner if available
      if (sourceGuild.banner) {
        try {
          const bannerBuffer = await this.downloadImage(sourceGuild.bannerURL());
          await newGuild.setBanner(bannerBuffer);
        } catch (error) {
          logger.warn('Failed to set server banner:', { cloneId, error: error.message });
        }
      }

      // Set server splash if available
      if (sourceGuild.splash) {
        try {
          const splashBuffer = await this.downloadImage(sourceGuild.splashURL());
          await newGuild.setSplash(splashBuffer);
        } catch (error) {
          logger.warn('Failed to set server splash:', { cloneId, error: error.message });
        }
      }

      await this.rateLimitDelay();

    } catch (error) {
      logger.warn('Failed to finalize clone settings:', { cloneId, error: error.message });
    }
  }

  /**
   * Create invite for the new server
   */
  async createInvite(guild) {
    try {
      const systemChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0);
      if (systemChannel) {
        const invite = await systemChannel.createInvite({
          maxAge: 0, // Never expires
          maxUses: 0, // Unlimited uses
          unique: true
        });
        return invite.code;
      }
    } catch (error) {
      logger.warn('Failed to create invite:', error.message);
    }
    return null;
  }

  /**
   * Download image from URL
   */
  async downloadImage(url) {
    const axios = require('axios');
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  /**
   * Rate limit delay
   */
  async rateLimitDelay() {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  /**
   * Update clone progress
   */
  updateProgress(cloneId, progress, phase, message) {
    const cloneInfo = this.activeClones.get(cloneId);
    if (cloneInfo) {
      cloneInfo.progress = progress;
      cloneInfo.phase = phase;
      this.emit('cloneProgress', { cloneId, progress, phase, message });
    }
  }

  /**
   * Handle clone errors with rollback
   */
  async handleCloneError(cloneId, error) {
    logger.error('Clone failed, initiating rollback:', { cloneId, error: error.message });

    const cloneInfo = this.activeClones.get(cloneId);
    if (cloneInfo && cloneInfo.createdGuildId) {
      try {
        // Attempt to delete the created server
        const guild = global.discordClient.guilds.cache.get(cloneInfo.createdGuildId);
        if (guild) {
          await guild.delete();
          logger.info('Rolled back created server:', { cloneId, guildId: cloneInfo.createdGuildId });
        }
      } catch (rollbackError) {
        logger.error('Failed to rollback created server:', {
          cloneId,
          rollbackError: rollbackError.message
        });
      }
    }

    this.emit('cloneFailed', { cloneId, error, phase: cloneInfo?.phase || 'unknown' });
  }

  /**
   * Cancel active clone
   */
  async cancelClone(cloneId, userId) {
    const cloneInfo = this.activeClones.get(cloneId);
    
    if (!cloneInfo) {
      throw new CloneError('Clone not found or not active');
    }

    cloneInfo.cancelled = true;
    
    logger.info('Clone cancelled:', { cloneId, userId });
    
    // Initiate rollback
    await this.handleCloneError(cloneId, new CloneError('Clone cancelled by user'));
    
    return { success: true };
  }

  /**
   * Get clone status
   */
  getCloneStatus(cloneId) {
    const cloneInfo = this.activeClones.get(cloneId);
    
    if (!cloneInfo) {
      return { status: 'not_found' };
    }

    return {
      status: 'active',
      progress: cloneInfo.progress,
      phase: cloneInfo.phase,
      cancelled: cloneInfo.cancelled
    };
  }

  /**
   * Get active clones
   */
  getActiveClones() {
    const activeClones = [];
    
    for (const [cloneId, cloneInfo] of this.activeClones.entries()) {
      activeClones.push({
        cloneId,
        progress: cloneInfo.progress,
        phase: cloneInfo.phase,
        cancelled: cloneInfo.cancelled
      });
    }

    return activeClones;
  }
}

module.exports = CloneService;