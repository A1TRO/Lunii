const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and latency information!'),
  
  cooldown: 5,
  category: 'utility',
  
  async execute(interaction) {
    const sent = await interaction.reply({ 
      content: 'Pinging...', 
      fetchReply: true 
    });
    
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const websocketLatency = interaction.client.ws.ping;
    
    await interaction.editReply({
      content: `🏓 **Pong!**\n` +
               `📡 **Roundtrip Latency:** ${roundtripLatency}ms\n` +
               `💓 **WebSocket Latency:** ${websocketLatency}ms`
    });
  }
};