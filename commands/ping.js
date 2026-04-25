module.exports = {
    name: 'ping',
    description: 'Check the bot latency',
    async execute(context) { 
        const isSlash = context.isChatInputCommand && context.isChatInputCommand();
    
        const latency = Date.now() - context.createdTimestamp;
        const heartbeat = context.client.ws.ping;

        const response = `🏓 **Pong!**\n**Latency:** ${latency}ms\n**API Heartbeat:** ${heartbeat}ms`;

        if (isSlash) {
            await context.reply({ content: response });
        } else {
            await context.reply(response);
        }
    },
};
