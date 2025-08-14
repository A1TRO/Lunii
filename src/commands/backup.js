const { SlashCommandBuilder, EmbedBuilder } = require('discord.js-selfbot-v13');
const BackupService = require('../services/BackupService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Manage server backups')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new server backup')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Name for the backup')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description for the backup')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('include_members')
            .setDescription('Include member data in backup')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all server backups'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a backup')
        .addStringOption(option =>
          option.setName('backup_id')
            .setDescription('ID of the backup to delete')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get detailed information about a backup')
        .addStringOption(option =>
          option.setName('backup_id')
            .setDescription('ID of the backup to get info for')
            .setRequired(true))),
  
  cooldown: 30,
  category: 'admin',
  guildOnly: true,
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const backupService = new BackupService();
    
    switch (subcommand) {
      case 'create':
        await this.handleCreate(interaction, backupService);
        break;
      case 'list':
        await this.handleList(interaction, backupService);
        break;
      case 'delete':
        await this.handleDelete(interaction, backupService);
        break;
      case 'info':
        await this.handleInfo(interaction, backupService);
        break;
    }
  },
  
  async handleCreate(interaction, backupService) {
    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description') || '';
    const includeMembers = interaction.options.getBoolean('include_members') || false;
    
    await interaction.deferReply();
    
    try {
      const backup = await backupService.createBackup(
        interaction.guild.id,
        interaction.user.id,
        {
          name,
          description,
          includedData: {
            channels: true,
            roles: true,
            emojis: true,
            webhooks: true,
            settings: true,
            members: includeMembers
          }
        }
      );
      
      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setTitle('✅ Backup Created Successfully')
        .setDescription(`Backup "${name}" has been created for ${interaction.guild.name}`)
        .addFields(
          { name: '🆔 Backup ID', value: backup.id, inline: true },
          { name: '📊 Status', value: backup.status, inline: true },
          { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Backup Creation Failed')
        .setDescription(`Failed to create backup: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleList(interaction, backupService) {
    await interaction.deferReply();
    
    try {
      const backups = await backupService.getServerBackups(interaction.guild.id);
      
      if (backups.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#f59e0b')
          .setTitle('📦 No Backups Found')
          .setDescription('No backups have been created for this server yet.')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#4F46E5')
        .setTitle(`📦 Server Backups (${backups.length})`)
        .setDescription(`Backups for ${interaction.guild.name}`)
        .setTimestamp();
      
      backups.slice(0, 10).forEach(backup => {
        const status = backup.status === 'completed' ? '✅' : 
                     backup.status === 'failed' ? '❌' : '⏳';
        const size = backup.fileSize ? this.formatBytes(backup.fileSize) : 'Unknown';
        
        embed.addFields({
          name: `${status} ${backup.name}`,
          value: `**ID:** \`${backup.id}\`\n` +
                 `**Size:** ${size}\n` +
                 `**Created:** <t:${Math.floor(new Date(backup.createdAt).getTime() / 1000)}:R>`,
          inline: true
        });
      });
      
      if (backups.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${backups.length} backups` });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Failed to List Backups')
        .setDescription(`Error: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleDelete(interaction, backupService) {
    const backupId = interaction.options.getString('backup_id');
    
    await interaction.deferReply();
    
    try {
      const result = await backupService.deleteBackup(backupId, interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setTitle('✅ Backup Deleted')
        .setDescription(`Backup \`${backupId}\` has been successfully deleted.`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Failed to Delete Backup')
        .setDescription(`Error: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleInfo(interaction, backupService) {
    const backupId = interaction.options.getString('backup_id');
    
    await interaction.deferReply();
    
    try {
      const backup = await backupService.getBackupInfo(backupId);
      
      if (!backup) {
        const embed = new EmbedBuilder()
          .setColor('#f59e0b')
          .setTitle('❌ Backup Not Found')
          .setDescription(`No backup found with ID: \`${backupId}\``)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const statusEmoji = backup.status === 'completed' ? '✅' : 
                         backup.status === 'failed' ? '❌' : 
                         backup.status === 'in_progress' ? '⏳' : '❓';
      
      const embed = new EmbedBuilder()
        .setColor(backup.status === 'completed' ? '#22c55e' : 
                 backup.status === 'failed' ? '#ef4444' : '#f59e0b')
        .setTitle(`${statusEmoji} Backup Information`)
        .setDescription(`Details for backup: **${backup.name}**`)
        .addFields(
          { name: '🆔 Backup ID', value: `\`${backup.id}\``, inline: true },
          { name: '📊 Status', value: backup.status, inline: true },
          { name: '📁 Size', value: backup.fileSize ? this.formatBytes(backup.fileSize) : 'Unknown', inline: true },
          { name: '📅 Created', value: `<t:${Math.floor(new Date(backup.createdAt).getTime() / 1000)}:F>`, inline: false },
          { name: '📝 Description', value: backup.description || 'No description', inline: false }
        )
        .setTimestamp();
      
      if (backup.includedData) {
        const includedTypes = Object.entries(backup.includedData)
          .filter(([key, value]) => value)
          .map(([key]) => key)
          .join(', ');
        
        embed.addFields({ name: '📦 Included Data', value: includedTypes || 'None', inline: false });
      }
      
      if (backup.errorMessage) {
        embed.addFields({ name: '❌ Error', value: backup.errorMessage, inline: false });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Failed to Get Backup Info')
        .setDescription(`Error: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};