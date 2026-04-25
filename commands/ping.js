module.exports = {
    name: 'ping',
    description: 'Check the bot latency',
    execute(message) {
        const latency = Date.now() - message.createdTimestamp;
        
        const heartbeat = message.client.ws.ping;

        message.reply(`🏓 **Pong!**\n**Latency:** ${latency}ms\n**API Heartbeat:** ${heartbeat}ms`);
    },
};
