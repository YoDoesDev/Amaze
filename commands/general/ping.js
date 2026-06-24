module.exports = {
    name: 'ping',
    description: 'Check the bot latency',
    cooldown: 5,
    category: "General", 
    async execute(message) {
        const pingmsg = await message.reply("Pinging...");
        const latency = pingmsg.createdTimestamp - message.createdTimestamp;
        
        const heartbeat = message.client.ws.ping;

        pingmsg.edit(
            `🏓 **Pong!**\n**Latency:** ${latency}ms\n**API Heartbeat:** ${heartbeat}ms`
        );
    },
};
