const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot and API latency'),
    category: 'General',
    cooldown: 5,

    async execute(interaction) {
        // 1. Fetch the deferred reply to get the timestamp
        const sent = await interaction.fetchReply();
        
        // 2. Calculate Latency
        // Round-trip latency: (Time reply was sent) - (Time interaction was created)
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        
        // 3. Get WebSocket Heartbeat
        const heartbeat = interaction.client.ws.ping;

        // 4. Update the "Thinking..." state
        return interaction.editReply(
            `🏓 **Pong!**\n**Round-trip Latency:** \`${latency}ms\`\n**API Heartbeat:** \`${heartbeat}ms\``
        );
    },
};
