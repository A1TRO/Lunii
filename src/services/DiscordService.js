const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { DiscordAPIError, RateLimitError } = require('../utils/errors');
const EventEmitter = require('events');

/**
 * Discord Service - Handles all Discord API interactions
 */
class DiscordService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.commands = new Collection();
    this.cooldowns = new Collection();
    this.isReady = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    
    this.setupClient();
  }

  /**
   * Initialize Discord client with proper configuration
   */
  setupClient() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
      ],
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
      restTimeOffset: 0,
      restRequestTimeout: 30000,
      retryLimit: 3,
      restSweepInterval: 60,
      restGlobalTimeout: 0,
      presence: {
        status: 'online',
        activities: [{
          name: 'Lunii Dashboard',
          type: 'WATCHING'
        }]
      }
    });

    this.setupEventHandlers();
    this.loadCommands();
  }

  /**
   * Setup Discord client event handlers
   */
  setupEventHandlers() {
    this.client.once('ready', () => {
      this.isReady = true;
      this.reconnectAttempts = 0;
      logger.info(`Discord client ready! Logged in as ${this.client.user.tag}`);
      
      this.startHeartbeatMonitoring();
      this.emit('ready', this.client.user);
    });

    this.client.on('error', (error) => {
      logger.error('Discord client error:', error);
      this.emit('error', error);
    });

    this.client.on('warn', (warning) => {
      logger.warn('Discord client warning:', warning);
    });

    this.client.on('disconnect', () => {
      logger.warn('Discord client disconnected');
      this.isReady = false;
      this.stopHeartbeatMonitoring();
      this.emit('disconnect');
    });

    this.client.on('reconnecting', () => {
      logger.info('Discord client reconnecting...');
      this.emit('reconnecting');
    });

    this.client.on('resumed', () => {
      logger.info('Discord client resumed');
      this.emit('resumed');
    });

    this.client.on('rateLimit', (rateLimitData) => {
      logger.warn('Discord API rate limit hit:', rateLimitData);
      this.emit('rateLimit', rateLimitData);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this.handleSlashCommand(interaction);
    });

    this.client.on('messageCreate', (message) => {
      this.emit('messageCreate', message);
    });

    this.client.on('messageDelete', (message) => {
      this.emit('messageDelete', message);
    });

    this.client.on('messageUpdate', (oldMessage, newMessage) => {
      this.emit('messageUpdate', oldMessage, newMessage);
    });

    this.client.on('guildMemberAdd', (member) => {
      this.emit('guildMemberAdd', member);
    });

    this.client.on('guildMemberRemove', (member) => {
      this.emit('guildMemberRemove', member);
    });
  }

  /**
   * Load slash commands from commands directory
   */
  loadCommands() {
    const commandsPath = path.join(__dirname, '../commands');
    
    try {
      const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
          this.commands.set(command.data.name, command);
          logger.debug(`Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
        }
      }
      
      logger.info(`Loaded ${this.commands.size} slash commands`);
    } catch (error) {
      logger.error('Error loading commands:', error);
    }
  }

  /**
   * Handle slash command execution
   */
  async handleSlashCommand(interaction) {
    const command = this.commands.get(interaction.commandName);
    
    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found`);
      return;
    }

    // Check cooldowns
    if (!this.checkCooldown(interaction, command)) {
      return;
    }

    try {
      const startTime = Date.now();
      await command.execute(interaction);
      const duration = Date.now() - startTime;
      
      logger.info('Command executed', {
        command: interaction.commandName,
        user: interaction.user.tag,
        guild: interaction.guild?.name || 'DM',
        duration
      });
      
      this.emit('commandExecuted', {
        command: interaction.commandName,
        user: interaction.user,
        guild: interaction.guild,
        duration,
        success: true
      });
      
    } catch (error) {
      logger.error('Command execution error:', {
        command: interaction.commandName,
        user: interaction.user.tag,
        error: error.message,
        stack: error.stack
      });
      
      const errorMessage = config.isDevelopment ? 
        `Error: ${error.message}` : 
        'There was an error while executing this command!';
      
      const replyOptions = {
        content: errorMessage,
        ephemeral: true
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
      
      this.emit('commandExecuted', {
        command: interaction.commandName,
        user: interaction.user,
        guild: interaction.guild,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Check command cooldowns
   */
  checkCooldown(interaction, command) {
    const { cooldowns } = this;
    const { commandName } = interaction;
    const userId = interaction.user.id;
    
    if (!cooldowns.has(commandName)) {
      cooldowns.set(commandName, new Collection());
    }
    
    const now = Date.now();
    const timestamps = cooldowns.get(commandName);
    const cooldownAmount = (command.cooldown || 3) * 1000;
    
    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId) + cooldownAmount;
      
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        interaction.reply({
          content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${commandName}\` command.`,
          ephemeral: true
        });
        return false;
      }
    }
    
    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownAmount);
    
    return true;
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      if (this.client.ws.ping > 0) {
        this.lastHeartbeat = Date.now();
        logger.debug(`Heartbeat: ${this.client.ws.ping}ms`);
      } else if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > 60000) {
        logger.warn('Heartbeat timeout detected, attempting reconnection');
        this.reconnect();
      }
    }, 30000);
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeatMonitoring() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect to Discord
   */
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.client.destroy();
        this.setupClient();
        await this.login();
      } catch (error) {
        logger.error('Reconnection failed:', error);
        this.reconnect();
      }
    }, delay);
  }

  /**
   * Login to Discord
   */
  async login(token = config.DISCORD_TOKEN) {
    try {
      await this.client.login(token);
      return { success: true };
    } catch (error) {
      logger.error('Discord login failed:', error);
      throw new DiscordAPIError('Login failed', 401, null, 'POST');
    }
  }

  /**
   * Logout from Discord
   */
  async logout() {
    try {
      this.isReady = false;
      this.stopHeartbeatMonitoring();
      await this.client.destroy();
      logger.info('Discord client logged out');
      return { success: true };
    } catch (error) {
      logger.error('Discord logout failed:', error);
      throw new DiscordAPIError('Logout failed', 500);
    }
  }

  /**
   * Deploy slash commands
   */
  async deployCommands(guildId = null) {
    try {
      const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
      const commands = Array.from(this.commands.values()).map(command => command.data.toJSON());
      
      logger.info(`Started refreshing ${commands.length} application (/) commands`);
      
      let data;
      if (guildId) {
        // Deploy to specific guild (faster for development)
        data = await rest.put(
          Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
          { body: commands }
        );
      } else {
        // Deploy globally (takes up to 1 hour to propagate)
        data = await rest.put(
          Routes.applicationCommands(config.DISCORD_CLIENT_ID),
          { body: commands }
        );
      }
      
      logger.info(`Successfully reloaded ${data.length} application (/) commands`);
      return { success: true, count: data.length };
      
    } catch (error) {
      logger.error('Command deployment failed:', error);
      
      if (error.code === 50001) {
        throw new DiscordAPIError('Missing access to deploy commands', 403);
      } else if (error.code === 429) {
        throw new RateLimitError('Rate limited while deploying commands', error.retry_after);
      }
      
      throw new DiscordAPIError('Command deployment failed', 500);
    }
  }

  /**
   * Get user information
   */
  async getUser(userId) {
    try {
      const user = await this.client.users.fetch(userId);
      return {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        globalName: user.globalName,
        avatar: user.displayAvatarURL({ size: 256 }),
        bot: user.bot,
        system: user.system,
        flags: user.flags?.toArray() || [],
        createdAt: user.createdAt
      };
    } catch (error) {
      logger.error('Failed to fetch user:', error);
      throw new DiscordAPIError('User not found', 404);
    }
  }

  /**
   * Get guild information
   */
  async getGuild(guildId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 256 }),
        splash: guild.splashURL({ size: 1024 }),
        banner: guild.bannerURL({ size: 1024 }),
        description: guild.description,
        memberCount: guild.memberCount,
        premiumTier: guild.premiumTier,
        premiumSubscriptionCount: guild.premiumSubscriptionCount,
        verificationLevel: guild.verificationLevel,
        vanityURLCode: guild.vanityURLCode,
        features: guild.features,
        ownerId: guild.ownerId,
        createdAt: guild.createdAt
      };
    } catch (error) {
      logger.error('Failed to fetch guild:', error);
      throw new DiscordAPIError('Guild not found', 404);
    }
  }

  /**
   * Get guild channels
   */
  async getGuildChannels(guildId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const channels = await guild.channels.fetch();
      
      return channels.map(channel => ({
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
        permissions: channel.permissionOverwrites.cache.map(overwrite => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: overwrite.allow.toArray(),
          deny: overwrite.deny.toArray()
        }))
      }));
    } catch (error) {
      logger.error('Failed to fetch guild channels:', error);
      throw new DiscordAPIError('Failed to fetch channels', 500);
    }
  }

  /**
   * Get guild roles
   */
  async getGuildRoles(guildId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const roles = await guild.roles.fetch();
      
      return roles.map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.toArray(),
        managed: role.managed,
        mentionable: role.mentionable,
        createdAt: role.createdAt
      }));
    } catch (error) {
      logger.error('Failed to fetch guild roles:', error);
      throw new DiscordAPIError('Failed to fetch roles', 500);
    }
  }

  /**
   * Get guild members
   */
  async getGuildMembers(guildId, limit = 100) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const members = await guild.members.fetch({ limit });
      
      return members.map(member => ({
        id: member.id,
        user: {
          id: member.user.id,
          username: member.user.username,
          discriminator: member.user.discriminator,
          globalName: member.user.globalName,
          avatar: member.user.displayAvatarURL({ size: 128 }),
          bot: member.user.bot
        },
        nickname: member.nickname,
        roles: member.roles.cache.map(role => role.id),
        joinedAt: member.joinedAt,
        premiumSince: member.premiumSince,
        permissions: member.permissions.toArray()
      }));
    } catch (error) {
      logger.error('Failed to fetch guild members:', error);
      throw new DiscordAPIError('Failed to fetch members', 500);
    }
  }

  /**
   * Send message to channel
   */
  async sendMessage(channelId, content, options = {}) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      const message = await channel.send({ content, ...options });
      
      return {
        id: message.id,
        content: message.content,
        author: message.author.id,
        channelId: message.channelId,
        guildId: message.guildId,
        createdAt: message.createdAt
      };
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw new DiscordAPIError('Failed to send message', 500);
    }
  }

  /**
   * Update bot presence
   */
  async updatePresence(presence) {
    try {
      await this.client.user.setPresence(presence);
      return { success: true };
    } catch (error) {
      logger.error('Failed to update presence:', error);
      throw new DiscordAPIError('Failed to update presence', 500);
    }
  }

  /**
   * Get connection health status
   */
  getHealthStatus() {
    return {
      connected: this.isReady,
      ping: this.client?.ws?.ping || -1,
      uptime: this.client?.uptime || 0,
      guilds: this.client?.guilds?.cache?.size || 0,
      users: this.client?.users?.cache?.size || 0,
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    this.stopHeartbeatMonitoring();
    if (this.client) {
      await this.client.destroy();
    }
    this.removeAllListeners();
  }
}

module.exports = DiscordService;