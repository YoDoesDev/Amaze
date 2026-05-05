const { db } = require('../database.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'profile',
    category: 'Reputation', 
    description: 'Check a user\'s profile.',
    
    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;

        // Get da money from the base
        db.get(`SELECT bucks FROM amash WHERE userid = ?`, [user.id], (err, amashRow) => {
            if (err) {
                console.error(err);
                return message.reply('Database error.');
            }

            const bucks = amashRow ? amashRow.bucks : '0 (UNOPENED)';

            // Get reps and ranks
            db.all(`SELECT user_id, points FROM reputation ORDER BY points DESC`, [], (err, rows) => {
                if (err) {
                    console.error(err);
                    return message.reply('Database error.');
                }

                let rep = 0;
                let rank = 'Unranked';

                const index = rows.findIndex(r => r.user_id === user.id);

                if (index !== -1) {
                    rep = rows[index].points;
                    rank = index + 1;
                }

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

                message.reply({ embeds: [embed] });
            });
        });
    }
};