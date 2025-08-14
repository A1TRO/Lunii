const { SlashCommandBuilder, EmbedBuilder } = require('discord.js-selfbot-v13');
const CloneService = require('../services/CloneService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clone')
    .setDescription('Clone Discord servers')
    .addSubcommand(subcommand =>
      subcommand
        .setName('server')
        .setDescription('Clone the current server')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Name for the cloned server')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('include_roles')
            .setDescription('Include roles in clone')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('include_channels')
            .setDescription('Include channels in clone')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('include_emojis')
            .setDescription('Include emojis in clone')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('include_webhooks')
            .setDescription('Include webhooks in clone')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check clone operation status')
        .addStringOption(option =>
          option
            .setName('clone_id')
            .setDescription('Clone operation ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel an active clone operation')
        .addStringOption(option =>
          option
            .setName('clone_id')
            .setDescription('Clone operation ID to cancel')
            .setRequired(true)
        )
    ),
  
  cooldown: 60,
  category: 'admin',
  guildOnly: true,
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const cloneService = new CloneService();
    
    switch (subcommand) {
      case 'server':
        await this.handleCloneServer(interaction, cloneService);
        break;
      case 'status':
        await this.handleCloneStatus(interaction, cloneService);
        break;
      case 'cancel':
        await this.handleCloneCancel(interaction, cloneService);
        break;
    }
  },
  
  async handleCloneServer(interaction, cloneService) {
    const name = interaction.options.getString('name');
    const includeRoles = interaction.options.getBoolean('include_roles') ?? true;
    const includeChannels = interaction.options.getBoolean('include_channels') ?? true;
    const includeEmojis = interaction.options.getBoolean('include_emojis') ?? false;
    const includeWebhooks = interaction.options.getBoolean('include_webhooks') ?? false;
    
    await interaction.deferReply();
    
    try {
      const result = await cloneService.cloneServer(
        interaction.guild.id,
        interaction.user.id,
        {
          name: name || `${interaction.guild.name} (Clone)`,
          includeRoles,
          includeChannels,
          includeEmojis,
          includeWebhooks
        }
      );
      
      const embed = new EmbedBuilder()
        .setColor('#4F46E5')
        .setTitle('🔄 Server Clone Started')
        .setDescription(`Cloning operation initiated for **${interaction.guild.name}**`)
        .addFields(
          { name: '🆔 Clone ID', value: `\`${result.cloneId}\``, inline: true },
          { name: '📊 Status', value: result.status, inline: true },
          { name: '⚙️ Options', value: this.formatCloneOptions({
            includeRoles,
            includeChannels,
            includeEmojis,
            includeWebhooks
          }), inline: false }
        )
        .setFooter({ text: 'Use /clone status <clone_id> to check progress' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
      // Set up progress monitoring
      this.monitorCloneProgress(interaction, cloneService, result.cloneId);
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Clone Failed to Start')
        .setDescription(`Failed to initiate server clone: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleCloneStatus(interaction, cloneService) {
    const cloneId = interaction.options.getString('clone_id');
    
    await interaction.deferReply();
    
    try {
      const status = cloneService.getCloneStatus(cloneId);
      
      if (status.status === 'not_found') {
        const embed = new EmbedBuilder()
          .setColor('#f59e0b')
          .setTitle('❌ Clone Not Found')
          .setDescription(`No active clone found with ID: \`${cloneId}\``)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const progressBar = this.createProgressBar(status.progress);
      const phaseEmoji = this.getPhaseEmoji(status.phase);
      
      const embed = new EmbedBuilder()
        .setColor(status.cancelled ? '#ef4444' : '#4F46E5')
        .setTitle(`${phaseEmoji} Clone Status`)
        .setDescription(`Clone operation: \`${cloneId}\``)
        .addFields(
          { name: '📊 Progress', value: `${progressBar} ${Math.round(status.progress)}%`, inline: false },
          { name: '🔄 Phase', value: status.phase, inline: true },
          { name: '⏸️ Cancelled', value: status.cancelled ? 'Yes' : 'No', inline: true }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Failed to Get Clone Status')
        .setDescription(`Error: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleCloneCancel(interaction, cloneService) {
    const cloneId = interaction.options.getString('clone_id');
    
    await interaction.deferReply();
    
    try {
      const result = await cloneService.cancelClone(cloneId, interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setColor('#f59e0b')
        .setTitle('⏸️ Clone Cancelled')
        .setDescription(`Clone operation \`${cloneId}\` has been cancelled and will be rolled back.`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Failed to Cancel Clone')
        .setDescription(`Error: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async monitorCloneProgress(interaction, cloneService, cloneId) {
    let lastProgress = 0;
    
    const progressListener = async (data) => {
      if (data.cloneId !== cloneId) return;
      
      // Only update every 10% progress to avoid spam
      if (data.progress - lastProgress >= 10 || data.progress === 100) {
        lastProgress = data.progress;
        
        const progressBar = this.createProgressBar(data.progress);
        const phaseEmoji = this.getPhaseEmoji(data.phase);
        
        const embed = new EmbedBuilder()
          .setColor('#4F46E5')
          .setTitle(`${phaseEmoji} Clone Progress Update`)
          .setDescription(`Clone operation: \`${cloneId}\``)
          .addFields(
            { name: '📊 Progress', value: `${progressBar} ${Math.round(data.progress)}%`, inline: false },
            { name: '🔄 Current Phase', value: data.phase, inline: true },
            { name: '💬 Status', value: data.message || 'Processing...', inline: true }
          )
          .setTimestamp();
        
        try {
          await interaction.followUp({ embeds: [embed] });
        } catch (error) {
          // Ignore follow-up errors (interaction might be expired)
        }
      }
    };
    
    const completedListener = async (data) => {
      if (data.cloneId !== cloneId) return;
      
      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setTitle('✅ Clone Completed Successfully')
        .setDescription(`Server **${data.sourceGuild.name}** has been successfully cloned!`)
        .addFields(
          { name: '🆔 Clone ID', value: `\`${cloneId}\``, inline: true },
          { name: '🏠 New Server', value: data.newGuild.name, inline: true },
          { name: '🔗 Invite Code', value: data.newGuild.inviteCode ? `discord.gg/${data.newGuild.inviteCode}` : 'Not available', inline: false }
        )
        .setTimestamp();
      
      try {
        await interaction.followUp({ embeds: [embed] });
      } catch (error) {
        // Ignore follow-up errors
      }
      
      // Clean up listeners
      cloneService.removeListener('cloneProgress', progressListener);
      cloneService.removeListener('cloneCompleted', completedListener);
      cloneService.removeListener('cloneFailed', failedListener);
    };
    
    const failedListener = async (data) => {
      if (data.cloneId !== cloneId) return;
      
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Clone Failed')
        .setDescription(`Clone operation failed during **${data.phase}** phase`)
        .addFields(
          { name: '🆔 Clone ID', value: `\`${cloneId}\``, inline: true },
          { name: '❌ Error', value: data.error.message, inline: false }
        )
        .setTimestamp();
      
      try {
        await interaction.followUp({ embeds: [embed] });
      } catch (error) {
        // Ignore follow-up errors
      }
      
      // Clean up listeners
      cloneService.removeListener('cloneProgress', progressListener);
      cloneService.removeListener('cloneCompleted', completedListener);
      cloneService.removeListener('cloneFailed', failedListener);
    };
    
    // Set up event listeners
    cloneService.on('cloneProgress', progressListener);
    cloneService.on('cloneCompleted', completedListener);
    cloneService.on('cloneFailed', failedListener);
    
    // Clean up listeners after 30 minutes
    setTimeout(() => {
      cloneService.removeListener('cloneProgress', progressListener);
      cloneService.removeListener('cloneCompleted', completedListener);
      cloneService.removeListener('cloneFailed', failedListener);
    }, 30 * 60 * 1000);
  },
  
  formatCloneOptions(options) {
    const enabled = [];
    if (options.includeRoles) enabled.push('Roles');
    if (options.includeChannels) enabled.push('Channels');
    if (options.includeEmojis) enabled.push('Emojis');
    if (options.includeWebhooks) enabled.push('Webhooks');
    
    return enabled.length > 0 ? enabled.join(', ') : 'None';
  },
  
  createProgressBar(progress) {
    const totalBars = 20;
    const filledBars = Math.round((progress / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    
    return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
  },
  
  getPhaseEmoji(phase) {
    const emojis = {
      'initializing': '🚀',
      'creating': '🏗️',
      'roles': '👥',
      'channels': '📁',
      'emojis': '😀',
      'webhooks': '🔗',
      'finalizing': '✨',
      'completed': '✅',
      'failed': '❌',
      'cancelled': '⏸️'
    };
    
    return emojis[phase] || '🔄';
  }
};