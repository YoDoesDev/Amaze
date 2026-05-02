const { db } = require('../database.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'profile',
    category: 'Reputation', 
    description: 'Check a user\'s profile. \n\nSyntax: `!profile [@user]`\n\n<> = REQUIRED\n[] = OPTIONAL',
    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;

        db.get(`SELECT bucks FROM amash WHERE userid = ?`, [user.id], (err, row) => {
            if (err) {
                console.error(err);
                return message.reply('Database error.');
            }

            const bucks = row ? row.bucks : '0 (UNOPENED)';

            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Profile`)
                .setThumbnail(user.displayAvatarURL())
                .setColor('#3498DB')
                .addFields(
                    { name: 'Username', value: user.username, inline: true },
                    { name: 'Amash', value: bucks.toString(), inline: true }
                )
                .setFooter({ text: `Requested by ${message.author.username}` });

            message.reply({ embeds: [embed] });
        });
        
    }
};
