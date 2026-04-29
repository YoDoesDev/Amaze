module.exports = {
    name: 'ping',
    description: 'Check the bot latency',
    async execute(message) {
        const latency = Date.now() - message.createdTimestamp;
        
        const heartbeat = message.client.ws.ping;

        await message.reply(
            `🏓 **Pong!**\n**Latency:** ${latency}ms\n**API Heartbeat:** ${heartbeat}ms`
        );
    },
};
