module.exports = {
    name: 'ping',
    description: 'Check the bot latency',
    async execute(message) {
        // here you can see my unparalleled genius
        /* because date.now will be inaccurate when compared to discord
        time I USE DISCORD TIME WITH DISCORD TIME
        the world isnt ready for me yet */
        const pingmsg = await message.reply("Pinging...");
        const latency = pingmsg.createdTimestamp - message.createdTimestamp;
        
        const heartbeat = message.client.ws.ping;

        pingmsg.edit(
            `🏓 **Pong!**\n**Latency:** ${latency}ms\n**API Heartbeat:** ${heartbeat}ms`
        );
    },
};
