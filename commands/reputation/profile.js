const { db } = require('../../utils/database.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'profile',
    cooldown: 90,
    description: 'Check a user\'s profile.',
    category: 'Reputation', 
    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;

        try {
            // 1. Fetch Amash (Directly assigned)
            const amashRow = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(user.id);
            const bucks = amashRow ? amashRow.bucks : '0 (UNOPENED)';

            // 2. Fetch All Reputations for Ranking
            // We fetch everything to find the user's position in the leaderboard
            const rows = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC`).all();

            let rep = 0;
            let rank = 'Unranked';

            const index = rows.findIndex(r => r.userid === user.id);

            if (index !== -1) {
                rep = rows[index].points;
                rank = index + 1;
            }

            // 3. Build and Send Embed
            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Profile`)
                .setThumbnail(user.displayAvatarURL())
                .setColor('#3498DB')
                .addFields(
                    {
                        name: 'User',
                        value: user.username,
                        inline: false
                    },
                    {
                        name: 'Stats',
                        value: 
                            `💰 **Amash:** ${bucks}\n` +
                            `⭐ **Reputation:** ${rep}\n` +
                            `🏆 **Rank:** #${rank}`,
                        inline: false
                    }
                )
                .setFooter({ text: `Requested by ${message.author.username}` });

            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Profile Command Error:", err);
            return message.reply('An error occurred while fetching the profile.');
        }
    }
};
