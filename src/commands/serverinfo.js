const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get information about the current server'),
  
  cooldown: 15,
  category: 'utility',
  guildOnly: true,
  
  async execute(interaction) {
    const guild = interaction.guild;
    
    const embed = new EmbedBuilder()
      .setColor('#4F46E5')
      .setTitle(`Server Information - ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '🆔 Server ID', value: guild.id, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
        { name: '👥 Members', value: guild.memberCount.toString(), inline: true },
        { name: '📊 Channels', value: guild.channels.cache.size.toString(), inline: true },
        { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
        { name: '😀 Emojis', value: guild.emojis.cache.size.toString(), inline: true },
        { name: '🔒 Verification Level', value: this.getVerificationLevel(guild.verificationLevel), inline: true },
        { name: '💎 Boost Tier', value: `Level ${guild.premiumTier}`, inline: true }
      )
      .setTimestamp();
    
    if (guild.description) {
      embed.setDescription(guild.description);
    }
    
    if (guild.banner) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }
    
    if (guild.premiumSubscriptionCount > 0) {
      embed.addFields({ name: '🚀 Boosts', value: guild.premiumSubscriptionCount.toString(), inline: true });
    }
    
    if (guild.vanityURLCode) {
      embed.addFields({ name: '🔗 Vanity URL', value: `discord.gg/${guild.vanityURLCode}`, inline: true });
    }
    
    const features = guild.features;
    if (features.length > 0) {
      const featureList = features.map(feature => 
        feature.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      ).join(', ');
      embed.addFields({ name: '✨ Features', value: featureList, inline: false });
    }
    
    await interaction.reply({ embeds: [embed] });
  },
  
  getVerificationLevel(level) {
    const levels = {
      0: 'None',
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Very High'
    };
    return levels[level] || 'Unknown';
  }
};