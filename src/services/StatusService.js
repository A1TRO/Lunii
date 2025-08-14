const EventEmitter = require('events');
const cron = require('node-cron');
const logger = require('../utils/logger');
const { models } = require('../database/models');

/**
 * Enhanced Custom Status Management Service
 */
class StatusService extends EventEmitter {
  constructor() {
    super();
    this.currentStatusIndex = 0;
    this.animationInterval = null;
    this.scheduledTasks = new Map();
    this.statusHistory = [];
    this.maxHistorySize = 100;
    this.isAnimating = false;
    this.transitionTimeout = null;
  }

  /**
   * Start status animation for a user
   */
  async startStatusAnimation(userId) {
    try {
      const settings = await this.getUserSettings(userId);
      
      if (!settings.statusAnimation || !settings.statusMessages.length) {
        return { success: false, error: 'Status animation not configured' };
      }

      // Stop existing animation
      this.stopStatusAnimation(userId);

      this.isAnimating = true;
      this.currentStatusIndex = 0;

      // Set initial status
      await this.updateStatus(settings.statusMessages[0], userId);

      // Start animation loop
      this.animationInterval = setInterval(async () => {
        try {
          this.currentStatusIndex = (this.currentStatusIndex + 1) % settings.statusMessages.length;
          const nextStatus = settings.statusMessages[this.currentStatusIndex];
          
          // Smooth transition
          await this.transitionToStatus(nextStatus, userId, settings.statusTransition);
          
        } catch (error) {
          logger.error('Status animation error:', { userId, error: error.message });
        }
      }, settings.statusInterval);

      logger.info('Status animation started:', { userId, messageCount: settings.statusMessages.length });
      
      return { success: true, message: 'Status animation started' };

    } catch (error) {
      logger.error('Failed to start status animation:', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop status animation
   */
  stopStatusAnimation(userId) {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }

    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }

    this.isAnimating = false;
    
    logger.info('Status animation stopped:', { userId });
    return { success: true, message: 'Status animation stopped' };
  }

  /**
   * Smooth status transition
   */
  async transitionToStatus(statusConfig, userId, transitionMs = 3000) {
    const discordClient = global.discordClient;
    if (!discordClient || !discordClient.isReady) {
      throw new Error('Discord client not available');
    }

    // Clear current status with transition
    await discordClient.user.setPresence({
      status: 'idle',
      activities: []
    });

    // Wait for transition
    await new Promise(resolve => {
      this.transitionTimeout = setTimeout(resolve, transitionMs);
    });

    // Set new status
    await this.updateStatus(statusConfig, userId);
  }

  /**
   * Update Discord status
   */
  async updateStatus(statusConfig, userId) {
    const discordClient = global.discordClient;
    if (!discordClient || !discordClient.isReady) {
      throw new Error('Discord client not available');
    }

    try {
      // Process status template variables
      const processedText = await this.processStatusTemplate(statusConfig.text, userId);
      
      // Validate and process emoji
      const emoji = await this.validateEmoji(statusConfig.emoji);

      // Create activity object
      const activity = {
        name: processedText,
        type: this.getActivityType(statusConfig.type)
      };

      if (emoji) {
        activity.emoji = emoji;
      }

      // Update presence
      await discordClient.user.setPresence({
        status: statusConfig.status || 'online',
        activities: [activity]
      });

      // Log status change
      await this.logStatusChange(userId, statusConfig, processedText);

      logger.debug('Status updated:', { userId, text: processedText, type: statusConfig.type });

      return { success: true, status: processedText };

    } catch (error) {
      logger.error('Failed to update status:', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Process status template variables
   */
  async processStatusTemplate(template, userId) {
    const discordClient = global.discordClient;
    if (!discordClient) return template;

    const variables = {
      '{time}': new Date().toLocaleTimeString(),
      '{date}': new Date().toLocaleDateString(),
      '{servers}': discordClient.guilds.cache.size.toString(),
      '{users}': discordClient.users.cache.size.toString(),
      '{username}': discordClient.user.username,
      '{discriminator}': discordClient.user.discriminator || '0000'
    };

    let processed = template;
    for (const [variable, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return processed;
  }

  /**
   * Validate emoji (Unicode or custom)
   */
  async validateEmoji(emojiInput) {
    if (!emojiInput) return null;

    // Check if it's a Unicode emoji
    const unicodeEmojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    if (unicodeEmojiRegex.test(emojiInput)) {
      return { name: emojiInput };
    }

    // Check if it's a custom emoji format <:name:id>
    const customEmojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);
    if (customEmojiMatch) {
      const [, name, id] = customEmojiMatch;
      return { name, id, animated: emojiInput.startsWith('<a:') };
    }

    // Try to find custom emoji by name
    const discordClient = global.discordClient;
    if (discordClient) {
      const emoji = discordClient.emojis.cache.find(e => e.name === emojiInput);
      if (emoji) {
        return { name: emoji.name, id: emoji.id, animated: emoji.animated };
      }
    }

    // Fallback to text
    return { name: emojiInput };
  }

  /**
   * Get Discord activity type
   */
  getActivityType(type) {
    const types = {
      'PLAYING': 0,
      'STREAMING': 1,
      'LISTENING': 2,
      'WATCHING': 3,
      'CUSTOM': 4,
      'COMPETING': 5
    };

    return types[type?.toUpperCase()] || 0;
  }

  /**
   * Schedule status updates using cron
   */
  async scheduleStatus(userId, cronExpression, statusConfig, timezone = 'UTC') {
    try {
      const taskId = `${userId}-${Date.now()}`;
      
      const task = cron.schedule(cronExpression, async () => {
        try {
          await this.updateStatus(statusConfig, userId);
          logger.info('Scheduled status updated:', { userId, taskId });
        } catch (error) {
          logger.error('Scheduled status update failed:', { userId, taskId, error: error.message });
        }
      }, {
        scheduled: false,
        timezone
      });

      this.scheduledTasks.set(taskId, {
        task,
        userId,
        cronExpression,
        statusConfig,
        timezone,
        createdAt: new Date()
      });

      task.start();

      logger.info('Status scheduled:', { userId, taskId, cronExpression, timezone });

      return { success: true, taskId, message: 'Status scheduled successfully' };

    } catch (error) {
      logger.error('Failed to schedule status:', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove scheduled status
   */
  removeScheduledStatus(taskId, userId) {
    const scheduledTask = this.scheduledTasks.get(taskId);
    
    if (!scheduledTask) {
      return { success: false, error: 'Scheduled task not found' };
    }

    if (scheduledTask.userId !== userId) {
      return { success: false, error: 'Unauthorized: You can only remove your own scheduled tasks' };
    }

    scheduledTask.task.stop();
    scheduledTask.task.destroy();
    this.scheduledTasks.delete(taskId);

    logger.info('Scheduled status removed:', { userId, taskId });

    return { success: true, message: 'Scheduled status removed' };
  }

  /**
   * Get user's scheduled statuses
   */
  getUserScheduledStatuses(userId) {
    const userTasks = [];

    for (const [taskId, taskInfo] of this.scheduledTasks.entries()) {
      if (taskInfo.userId === userId) {
        userTasks.push({
          taskId,
          cronExpression: taskInfo.cronExpression,
          statusConfig: taskInfo.statusConfig,
          timezone: taskInfo.timezone,
          createdAt: taskInfo.createdAt,
          isRunning: taskInfo.task.running
        });
      }
    }

    return userTasks;
  }

  /**
   * Log status changes for analytics
   */
  async logStatusChange(userId, statusConfig, processedText) {
    try {
      const logEntry = {
        userId,
        originalText: statusConfig.text,
        processedText,
        type: statusConfig.type,
        emoji: statusConfig.emoji,
        status: statusConfig.status,
        timestamp: new Date(),
        source: this.isAnimating ? 'animation' : 'manual'
      };

      this.statusHistory.unshift(logEntry);

      // Keep history size manageable
      if (this.statusHistory.length > this.maxHistorySize) {
        this.statusHistory = this.statusHistory.slice(0, this.maxHistorySize);
      }

      // Log to database for persistent storage
      await models.ActivityLog.create({
        userId,
        action: 'status_update',
        category: 'user',
        description: `Status updated to: ${processedText}`,
        metadata: {
          originalText: statusConfig.text,
          processedText,
          type: statusConfig.type,
          emoji: statusConfig.emoji,
          source: logEntry.source
        },
        success: true
      });

    } catch (error) {
      logger.error('Failed to log status change:', error);
    }
  }

  /**
   * Get status history for user
   */
  getStatusHistory(userId, limit = 50) {
    return this.statusHistory
      .filter(entry => entry.userId === userId)
      .slice(0, limit);
  }

  /**
   * Get status analytics
   */
  async getStatusAnalytics(userId, timeframe = '7d') {
    const timeframeMappings = {
      '1d': 1 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const timeframeMs = timeframeMappings[timeframe] || timeframeMappings['7d'];
    const since = new Date(Date.now() - timeframeMs);

    try {
      const analytics = await models.ActivityLog.findAll({
        where: {
          userId,
          action: 'status_update',
          createdAt: {
            [models.Sequelize.Op.gte]: since
          }
        },
        attributes: [
          [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'totalUpdates'],
          [models.sequelize.fn('COUNT', models.sequelize.literal("CASE WHEN metadata->>'source' = 'animation' THEN 1 END")), 'animationUpdates'],
          [models.sequelize.fn('COUNT', models.sequelize.literal("CASE WHEN metadata->>'source' = 'manual' THEN 1 END")), 'manualUpdates']
        ],
        raw: true
      });

      const typeStats = await models.ActivityLog.findAll({
        where: {
          userId,
          action: 'status_update',
          createdAt: {
            [models.Sequelize.Op.gte]: since
          }
        },
        attributes: [
          [models.sequelize.literal("metadata->>'type'"), 'type'],
          [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
        ],
        group: [models.sequelize.literal("metadata->>'type'")],
        raw: true
      });

      return {
        summary: analytics[0] || {
          totalUpdates: 0,
          animationUpdates: 0,
          manualUpdates: 0
        },
        typeBreakdown: typeStats.reduce((acc, stat) => {
          acc[stat.type || 'unknown'] = parseInt(stat.count);
          return acc;
        }, {}),
        timeframe
      };

    } catch (error) {
      logger.error('Failed to get status analytics:', error);
      return {
        summary: { totalUpdates: 0, animationUpdates: 0, manualUpdates: 0 },
        typeBreakdown: {},
        timeframe
      };
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId) {
    try {
      const userSettings = await models.UserSettings.findOne({
        where: { userId }
      });

      if (!userSettings) {
        // Return default settings
        return {
          statusAnimation: false,
          statusMessages: [],
          statusInterval: 30000,
          statusTransition: 3000
        };
      }

      return {
        statusAnimation: userSettings.statusAnimation,
        statusMessages: userSettings.statusMessages,
        statusInterval: userSettings.statusInterval,
        statusTransition: userSettings.statusTransition
      };

    } catch (error) {
      logger.error('Failed to get user settings:', error);
      return {
        statusAnimation: false,
        statusMessages: [],
        statusInterval: 30000,
        statusTransition: 3000
      };
    }
  }

  /**
   * Update user status settings
   */
  async updateUserSettings(userId, settings) {
    try {
      const [userSettings] = await models.UserSettings.findOrCreate({
        where: { userId },
        defaults: { userId }
      });

      await userSettings.update({
        statusAnimation: settings.statusAnimation,
        statusMessages: settings.statusMessages,
        statusInterval: settings.statusInterval,
        statusTransition: settings.statusTransition
      });

      // Restart animation if it was running
      if (this.isAnimating && settings.statusAnimation) {
        await this.startStatusAnimation(userId);
      } else if (!settings.statusAnimation) {
        this.stopStatusAnimation(userId);
      }

      return { success: true, message: 'Status settings updated' };

    } catch (error) {
      logger.error('Failed to update status settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      isAnimating: this.isAnimating,
      currentStatusIndex: this.currentStatusIndex,
      scheduledTasks: this.scheduledTasks.size,
      historySize: this.statusHistory.length,
      maxHistorySize: this.maxHistorySize
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop animation
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }

    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }

    // Stop all scheduled tasks
    for (const [taskId, taskInfo] of this.scheduledTasks.entries()) {
      taskInfo.task.stop();
      taskInfo.task.destroy();
    }

    this.scheduledTasks.clear();
    this.statusHistory = [];
    this.isAnimating = false;

    logger.info('StatusService cleanup completed');
  }
}

module.exports = StatusService;