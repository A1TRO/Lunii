const { SlashCommandBuilder, EmbedBuilder } = require('discord.js-selfbot-v13');
const AIService = require('../services/AIService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('AI-powered features')
    .addSubcommand(subcommand =>
      subcommand
        .setName('generate')
        .setDescription('Generate a Discord command using AI')
        .addStringOption(option =>
          option
            .setName('prompt')
            .setDescription('Describe the command you want to create')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Command category')
            .setRequired(false)
            .addChoices(
              { name: 'Utility', value: 'utility' },
              { name: 'Fun', value: 'fun' },
              { name: 'Moderation', value: 'moderation' },
              { name: 'Information', value: 'info' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('chat')
        .setDescription('Chat with AI assistant')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Your message to the AI')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('analyze')
        .setDescription('Analyze content for moderation')
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('Content to analyze')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View your AI usage statistics')
        .addStringOption(option =>
          option
            .setName('timeframe')
            .setDescription('Time period for statistics')
            .setRequired(false)
            .addChoices(
              { name: '1 Hour', value: '1h' },
              { name: '24 Hours', value: '24h' },
              { name: '7 Days', value: '7d' },
              { name: '30 Days', value: '30d' }
            )
        )
    ),
  
  cooldown: 10,
  category: 'ai',
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const aiService = new AIService();
    
    // Check if AI is enabled
    if (!aiService.isEnabled) {
      const embed = new EmbedBuilder()
        .setColor('#f59e0b')
        .setTitle('🤖 AI Service Unavailable')
        .setDescription('AI features are currently disabled. Please contact an administrator.')
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    
    switch (subcommand) {
      case 'generate':
        await this.handleGenerate(interaction, aiService);
        break;
      case 'chat':
        await this.handleChat(interaction, aiService);
        break;
      case 'analyze':
        await this.handleAnalyze(interaction, aiService);
        break;
      case 'stats':
        await this.handleStats(interaction, aiService);
        break;
    }
  },
  
  async handleGenerate(interaction, aiService) {
    const prompt = interaction.options.getString('prompt');
    const category = interaction.options.getString('category') || 'utility';
    
    await interaction.deferReply();
    
    try {
      const result = await aiService.generateCommand(interaction.user.id, prompt, {
        category,
        guildId: interaction.guild?.id
      });
      
      if (!result.success) {
        const embed = new EmbedBuilder()
          .setColor('#ef4444')
          .setTitle('❌ Command Generation Failed')
          .setDescription(result.error || 'Failed to generate command')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // Create embed with generated code
      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setTitle('🤖 Command Generated Successfully')
        .setDescription(`Generated command based on: "${prompt}"`)
        .addFields(
          { name: '📂 Category', value: category, inline: true },
          { name: '🔢 Tokens Used', value: result.metadata.tokensUsed?.toString() || 'Unknown', inline: true },
          { name: '⏱️ Generation Time', value: `${result.metadata.duration}ms`, inline: true }
        )
        .setTimestamp();
      
      // Send code in a separate message due to length limits
      const codeMessage = `\`\`\`javascript\n${result.code.substring(0, 1900)}\`\`\``;
      
      await interaction.editReply({ embeds: [embed] });
      
      if (result.code.length > 1900) {
        await interaction.followUp({
          content: codeMessage + '\n*Code truncated due to length limits*',
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: codeMessage,
          ephemeral: true
        });
      }
      
      // Provide instructions
      const instructionsEmbed = new EmbedBuilder()
        .setColor('#4F46E5')
        .setTitle('📝 Next Steps')
        .setDescription('To use this generated command:')
        .addFields(
          { name: '1️⃣ Save the Code', value: 'Copy the code above and save it as a `.js` file in your commands folder', inline: false },
          { name: '2️⃣ Test the Command', value: 'Restart your bot and test the command to ensure it works correctly', inline: false },
          { name: '3️⃣ Customize', value: 'Modify the code as needed to fit your specific requirements', inline: false }
        )
        .setFooter({ text: '⚠️ Always review AI-generated code before using it in production' });
      
      await interaction.followUp({ embeds: [instructionsEmbed], ephemeral: true });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Generation Error')
        .setDescription(`An error occurred: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleChat(interaction, aiService) {
    const message = interaction.options.getString('message');
    
    await interaction.deferReply();
    
    try {
      const context = {
        guild: interaction.guild ? {
          name: interaction.guild.name,
          memberCount: interaction.guild.memberCount
        } : null,
        user: {
          username: interaction.user.username,
          id: interaction.user.id
        }
      };
      
      const result = await aiService.chat(interaction.user.id, message, context);
      
      const embed = new EmbedBuilder()
        .setColor(result.success ? '#4F46E5' : '#ef4444')
        .setTitle('🤖 AI Assistant')
        .setDescription(result.response)
        .setTimestamp();
      
      if (result.success && result.metadata) {
        embed.setFooter({ 
          text: `Tokens: ${result.metadata.tokensUsed} | Time: ${result.metadata.duration}ms` 
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Chat Error')
        .setDescription(`Failed to process your message: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleAnalyze(interaction, aiService) {
    const content = interaction.options.getString('content');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const analysis = await aiService.analyzeContent(interaction.user.id, content, 'message');
      
      const embed = new EmbedBuilder()
        .setColor(analysis.safe ? '#22c55e' : '#ef4444')
        .setTitle('🔍 Content Analysis')
        .setDescription(`Analysis of the provided content`)
        .addFields(
          { name: '✅ Safe Content', value: analysis.safe ? 'Yes' : 'No', inline: true },
          { name: '📊 Confidence', value: `${Math.round(analysis.confidence * 100)}%`, inline: true },
          { name: '💭 Reason', value: analysis.reason || 'No specific reason provided', inline: false }
        )
        .setTimestamp();
      
      if (analysis.categories && analysis.categories.length > 0) {
        embed.addFields({
          name: '🏷️ Detected Categories',
          value: analysis.categories.join(', '),
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Analysis Error')
        .setDescription(`Failed to analyze content: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  async handleStats(interaction, aiService) {
    const timeframe = interaction.options.getString('timeframe') || '24h';
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const stats = await aiService.getUserUsageStats(interaction.user.id, timeframe);
      
      const embed = new EmbedBuilder()
        .setColor('#4F46E5')
        .setTitle('📊 AI Usage Statistics')
        .setDescription(`Your AI usage for the past ${timeframe}`)
        .addFields(
          { name: '📝 Total Requests', value: stats.totalRequests?.toString() || '0', inline: true },
          { name: '✅ Successful', value: stats.successfulRequests?.toString() || '0', inline: true },
          { name: '🔢 Tokens Used', value: stats.totalTokens?.toString() || '0', inline: true },
          { name: '💰 Estimated Cost', value: `$${(stats.totalCost || 0).toFixed(4)}`, inline: true },
          { name: '⏱️ Avg Response Time', value: `${Math.round(stats.avgDuration || 0)}ms`, inline: true },
          { name: '📈 Success Rate', value: stats.totalRequests > 0 ? 
            `${Math.round((stats.successfulRequests / stats.totalRequests) * 100)}%` : '0%', inline: true }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('❌ Stats Error')
        .setDescription(`Failed to retrieve statistics: ${error.message}`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }
};