const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
    name: 'repleaderboard',
    category: 'Reputation',
    aliases: ['replb', 'rl'],
    cooldown: 60,
    description: 'Shows a leaderboard of members with highest reputation points.',

    async execute(message) {
        try {
            // 1. Fetch Top 10 rows immediately
            const rows = db.prepare(`
                SELECT user_id, points 
                FROM reputation 
                ORDER BY points DESC 
                LIMIT 10
            `).all();

            // 2. Map data to the leaderboard string
            const gleaderboard = rows.length
                ? rows.map((row, index) => {
                    return `**${index + 1}.** <@${row.user_id}> — **${row.points}** points`;
                }).join('\n')
                : 'No data found.';

            // 3. Build and Send Embed
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`🏆 Reputation Leaderboard`)
                .setDescription(gleaderboard)
                .setFooter({ text: `Requested By: ${message.author.tag}` })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error(">>> [CRITICAL] Leaderboard Execution crashed:", error);
            message.reply("Could not load the leaderboard at this time.");
        }
    }
};
