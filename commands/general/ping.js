module.exports = {
    name: 'ping',
    description: 'Check the bot latency',
    cooldown: 5,
    async execute(message) {
        const pingmsg = await message.reply("Pinging...");
        const latency = pingmsg.createdTimestamp - message.createdTimestamp;
        
        // guard against -1 ms heartbeat
        const heartbeat = 
            message.client.ws.ping > 0
            ? `${message.client.ws.ping}ms`
            : 'Unavailable';

        pingmsg.edit(
            `🏓 **Pong!**\n**Latency:** ${latency}ms\n**API Heartbeat:** ${heartbeat}ms`
        );
    },
};
