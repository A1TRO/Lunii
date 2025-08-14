const { SlashCommandBuilder, EmbedBuilder } = require('discord.js-selfbot-v13');
const StatusService = require('../services/StatusService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Manage custom status and animations')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set a custom status')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Status text (supports variables: {time}, {date}, {servers}, {users})')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Activity type')
            .setRequired(false)
            .addChoices(
              { name: 'Playing', value: 'PLAYING' },
              { name: 'Streaming', value: 'STREAMING' },
              { name: 'Listening', value: 'LISTENING' },
              { name: 'Watching', value: 'WATCHING' },
              { name: 'Competing', value: 'COMPETING' }
            )
        )
        .addStringOption(option =>
          option
            .setName('emoji')
            .setDescription('Status emoji (Unicode or custom emoji name)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('presence')
            .setDescription('Online presence status')
            .setRequired(false)
            .addChoices(
              { name: 'Online', value: 'online' },
              { name: 'Idle', value: 'idle' },
              { name: 'Do Not Disturb', value: 'dnd' },
              { name: 'Invisible', value: 'invisible' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('animation')
        .setDescription('Manage status animation')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Animation action')
            .setRequired(true)
            .addChoices(
              { name: 'Start', value: 'start' },
              { name: 'Stop', value: 'stop' },
              { name: 'Configure', value: 'configure' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('interval')
            .setDescription('Animation interval in seconds (10-300)')
            .setRequired(false)
            .setMinValue(10)
            .setMaxValue(300)
        )
        .addIntegerOption(option =>
          option
            .setName('transition')
            .setDescription('Transition time in seconds (1-10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('messages')
        .setDescription('Manage animation status messages')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Message action')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' },
              { name: 'Clear', value: 'clear' }
            )
        )
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Status message text')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Activity type for this message')
            .setRequired(false)
            .addChoices(
              { name: 'Playing', value: 'PLAYING' },
              { name: 'Streaming', value: 'STREAMING' },
              { name: 'Listening', value: 'LISTENING' },
              { name: 'Watching', value: 'WATCHING' },
              { name: 'Competing', value: 'COMPETING' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('index')
            .setDescription('Message index to remove (use /status messages list to see indices)')
            .setRequired(false)
            .setMinValue(0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('schedule')
        .setDescription('Schedule status updates')
        .addStringOption(option =>
          option
            .setName('cron')
            .setDescription('Cron expression (e.g., "0 9 * * *" for daily at 9 AM)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Status text')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Activity type')
            .setRequired(false)
            .addChoices(
              { name: 'Playing', value: 'PLAYING' },
              { name: 'Streaming', value: 'STREAMING' },
              { name: 'Listening', value: 'LISTENING' },
              { name: 'Watching', value: 'WATCHING' },
              { name: 'Competing', value: 'COMPETING' }
            )
        )
        .addStringOption(option =>
          option
            .setName('timezone')
            .setDescription('Timezone (e.g., America/New_York, Europe/London)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('View status change history')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of entries to show (1-50)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('analytics')
        .setDescription('View status analytics')
        .addStringOption(option =>
          option
            .setName('timeframe')
            .setDescription('Time period for analytics')
            .setRequired(false)
            .addChoices(
              { name: '1 Day', value: '1d' },
              { name: '7 Days', value: '7d' },
              { name: '30 Days', value: '30d' }
            )
        )
    ),
  
  cooldown: 5,
  category: 'utility',
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const statusService = new StatusService();
    
    switch (subcommand) {
      case 'set':
        await this.handleSetStatus(interaction, statusService);
        break;
      case 'animation':
        await this.handleAnimation(interaction, statusService);
        break;
      case 'messages':
        await this.handleMessages(interaction, statusService);
        break;
      case 'schedule':
        await this.handleSchedule(interaction, statusService);
        break;
      case 'history':
        await this.handleHistory(interaction, statusService);
        break;
      case 'analytics':
        await this.handleAnalytics(interaction, statusService);
        break;
    }
  },
  
  async handleSetStatus(interaction, statusService) {
    const text = interaction.options.getString('text');
    const type = interaction.options.getString('type') || 'PLAYING';
    const emoji = interaction.options.getString('emoji');
    const presence = interaction.options.getString('presence') || 'online';
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const statusConfig = {
        text,
        type,
        emoji,
        status: presence
      };
      
      const result = await statusService.updateStatus(statusConfig, interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setTitle('✅ Status Updated')
        .setDescription(`Your status has been updated successfully!`)
        .addFields(
          { name: '📝 Text', value: result.status, inline: true },
          { name: '🎭 Type', value: type, inline: true },
          { name: '🟢 Presence', value: presence, inline: true }
        )
        .setTimestamp();
      
      if (emoji) {
        embed.addFields({ name: '😀 Emoji', value: emoji, inline: true });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Status Update Failed')
        .setDescription(`Failed to update status: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleAnimation(interaction, statusService) {
    const action = interaction.options.getString('action');
    const interval = interaction.options.getInteger('interval');
    const transition = interaction.options.getInteger('transition');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      let result;
      
      switch (action) {
        case 'start':
          result = await statusService.startStatusAnimation(interaction.user.id);
          break;
        case 'stop':
          result = statusService.stopStatusAnimation(interaction.user.id);
          break;
        case 'configure':
          const settings = {};
          if (interval) settings.statusInterval = interval * 1000;
          if (transition) settings.statusTransition = transition * 1000;
          
          result = await statusService.updateUserSettings(interaction.user.id, settings);
          break;
      }
      
      const embed = new EmbedBuilder()
        .setColor(result.success ? '#22c55e' : '#ef4444')
        .setTitle(result.success ? '✅ Animation Updated' : '❌ Animation Error')
        .setDescription(result.message || result.error)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Animation Error')
        .setDescription(`Failed to manage animation: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleMessages(interaction, statusService) {
    const action = interaction.options.getString('action');
    const text = interaction.options.getString('text');
    const type = interaction.options.getString('type') || 'PLAYING';
    const index = interaction.options.getInteger('index');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const settings = await statusService.getUserSettings(interaction.user.id);
      let messages = [...settings.statusMessages];
      let resultMessage = '';
      
      switch (action) {
        case 'add':
          if (!text) {
            throw new Error('Text is required when adding a message');
          }
          messages.push({ text, type });
          resultMessage = `Added status message: "${text}"`;
          break;
          
        case 'remove':
          if (index === null || index >= messages.length) {
            throw new Error('Invalid message index');
          }
          const removed = messages.splice(index, 1)[0];
          resultMessage = `Removed status message: "${removed.text}"`;
          break;
          
        case 'list':
          const embed = new EmbedBuilder()
            .setColor('#4F46E5')
            .setTitle('📝 Status Messages')
            .setDescription(messages.length > 0 ? 
              messages.map((msg, i) => `**${i}.** ${msg.text} *(${msg.type})*`).join('\n') :
              'No status messages configured'
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          return;
          
        case 'clear':
          messages = [];
          resultMessage = 'Cleared all status messages';
          break;
      }
      
      await statusService.updateUserSettings(interaction.user.id, {
        statusMessages: messages
      });
      
      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setTitle('✅ Messages Updated')
        .setDescription(resultMessage)
        .addFields({
          name: '📊 Total Messages',
          value: messages.length.toString(),
          inline: true
        })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Messages Error')
        .setDescription(`Failed to manage messages: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleSchedule(interaction, statusService) {
    const cron = interaction.options.getString('cron');
    const text = interaction.options.getString('text');
    const type = interaction.options.getString('type') || 'PLAYING';
    const timezone = interaction.options.getString('timezone') || 'UTC';
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const statusConfig = { text, type };
      const result = await statusService.scheduleStatus(
        interaction.user.id,
        cron,
        statusConfig,
        timezone
      );
      
      const embed = new EmbedBuilder()
        .setColor(result.success ? '#22c55e' : '#ef4444')
        .setTitle(result.success ? '⏰ Status Scheduled' : '❌ Schedule Error')
        .setDescription(result.message || result.error)
        .setTimestamp();
      
      if (result.success) {
        embed.addFields(
          { name: '📝 Text', value: text, inline: true },
          { name: '🎭 Type', value: type, inline: true },
          { name: '🌍 Timezone', value: timezone, inline: true },
          { name: '⏰ Cron', value: `\`${cron}\``, inline: false },
          { name: '🆔 Task ID', value: `\`${result.taskId}\``, inline: false }
        );
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Schedule Error')
        .setDescription(`Failed to schedule status: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleHistory(interaction, statusService) {
    const limit = interaction.options.getInteger('limit') || 10;
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const history = statusService.getStatusHistory(interaction.user.id, limit);
      
      if (history.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#f59e0b')
          .setTitle('📝 Status History')
          .setDescription('No status changes recorded yet.')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#4F46E5')
        .setTitle('📝 Status History')
        .setDescription(`Last ${history.length} status changes`)
        .setTimestamp();
      
      history.forEach((entry, index) => {
        const timeAgo = Math.floor((Date.now() - entry.timestamp.getTime()) / 1000);
        const timeString = timeAgo < 60 ? `${timeAgo}s ago` :
                          timeAgo < 3600 ? `${Math.floor(timeAgo / 60)}m ago` :
                          `${Math.floor(timeAgo / 3600)}h ago`;
        
        embed.addFields({
          name: `${index + 1}. ${entry.processedText}`,
          value: `**Type:** ${entry.type} | **Source:** ${entry.source} | **Time:** ${timeString}`,
          inline: false
        });
      });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ History Error')
        .setDescription(`Failed to retrieve history: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleAnalytics(interaction, statusService) {
    const timeframe = interaction.options.getString('timeframe') || '7d';
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const analytics = await statusService.getStatusAnalytics(interaction.user.id, timeframe);
      
      const embed = new EmbedBuilder()
        .setColor('#4F46E5')
        .setTitle('📊 Status Analytics')
        .setDescription(`Your status activity for the past ${timeframe}`)
        .addFields(
          { name: '📝 Total Updates', value: analytics.summary.totalUpdates.toString(), inline: true },
          { name: '🔄 Animation Updates', value: analytics.summary.animationUpdates.toString(), inline: true },
          { name: '✋ Manual Updates', value: analytics.summary.manualUpdates.toString(), inline: true }
        )
        .setTimestamp();
      
      // Add type breakdown
      const typeBreakdown = Object.entries(analytics.typeBreakdown)
        .map(([type, count]) => `**${type}:** ${count}`)
        .join('\n');
      
      if (typeBreakdown) {
        embed.addFields({
          name: '🎭 Activity Types',
          value: typeBreakdown,
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Analytics Error')
        .setDescription(`Failed to retrieve analytics: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }
};