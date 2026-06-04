 const { EmbedBuilder } = require('discord.js');
const { universalGet, universalFetchAll } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'profile',
    cooldown: 90,
    description: 'Check a user\'s profile.',
    category: 'Reputation', 
    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;

        try {
            // 2. Fetch Amash balance via Matrix Wrapper
            const amashRow = universalGet("amash", user.id);
            const bucks = amashRow ? amashRow.bucks.toLocaleString() : '0 (UNOPENED)';

            // 3. Fetch All Reputations and sort in-memory to find the Rank Position
            const allRepRows = universalFetchAll("reputation") || [];
            
            // Sort rows descending by points
            allRepRows.sort((a, b) => b.points - a.points);

            let rep = 0;
            let rank = 'Unranked';

            // Find the index of the targeted user
            const index = allRepRows.findIndex(r => r.userid === user.id);

            if (index !== -1) {
                rep = allRepRows[index].points;
                rank = index + 1;
            }

            // 4. Build and Send Embed
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
            // Safely clear command cooldown using module exports reference
            clearCooldown(message.author.id, module.exports);
            return message.reply('An error occurred while fetching the profile.');
        }
    }
};
