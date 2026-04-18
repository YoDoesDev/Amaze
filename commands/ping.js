const { db } = require('../database.js');

module.exports = {
    name: 'ping',
    description: 'Check bot status and latency',
    async execute(interaction) {
        const latency = Date.now() - interaction.createdTimestamp;
        
        const apiPing = Math.round(interaction.client.ws.ping);

        const userId = interaction.user.id;

        db.run(`INSERT OR IGNORE INTO pings (user_id, count) VALUES (?, 0)`, [userId], (err) => {
            if (err) return console.error(err);

            db.run(`UPDATE pings SET count = count + 1 WHERE user_id = ?`, [userId], (err) => {
                if (err) return console.error(err);

                interaction.reply({
                    content: `🏓 **Pong!**\n` +
                             `**Latency:** \`${latency}ms\`\n` +
                             `**API Heartbeat:** \`${apiPing}ms\``
                });
            });
        });
    }
};