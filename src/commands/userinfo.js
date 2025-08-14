const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to get information about')
        .setRequired(false)
    ),
  
  cooldown: 10,
  category: 'utility',
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id);
    
    const embed = new EmbedBuilder()
      .setColor('#4F46E5')
      .setTitle(`User Information - ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '👤 Username', value: user.username, inline: true },
        { name: '🏷️ Discriminator', value: user.discriminator || 'None', inline: true },
        { name: '🆔 User ID', value: user.id, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
        { name: '🤖 Bot Account', value: user.bot ? 'Yes' : 'No', inline: true }
      )
      .setTimestamp();
    
    if (user.globalName) {
      embed.addFields({ name: '🌐 Global Name', value: user.globalName, inline: true });
    }
    
    if (member) {
      embed.addFields(
        { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
        { name: '🎭 Roles', value: member.roles.cache.size > 1 ? 
          member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.toString()).join(', ') : 
          'No roles', inline: false }
      );
      
      if (member.nickname) {
        embed.addFields({ name: '📝 Nickname', value: member.nickname, inline: true });
      }
      
      if (member.premiumSince) {
        embed.addFields({ name: '💎 Boosting Since', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:F>`, inline: true });
      }
    }
    
    const flags = user.flags?.toArray();
    if (flags && flags.length > 0) {
      const flagEmojis = {
        Staff: '👨‍💼',
        Partner: '🤝',
        Hypesquad: '🎉',
        BugHunterLevel1: '🐛',
        HypeSquadOnlineHouse1: '🏠',
        HypeSquadOnlineHouse2: '🏠',
        HypeSquadOnlineHouse3: '🏠',
        PremiumEarlySupporter: '⭐',
        TeamPseudoUser: '👥',
        BugHunterLevel2: '🐛',
        VerifiedBot: '✅',
        VerifiedDeveloper: '👨‍💻',
        CertifiedModerator: '🛡️',
        BotHTTPInteractions: '🔗'
      };
      
      const userFlags = flags.map(flag => `${flagEmojis[flag] || '🏷️'} ${flag}`).join('\n');
      embed.addFields({ name: '🏆 Badges', value: userFlags, inline: false });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
};