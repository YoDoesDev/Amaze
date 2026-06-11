const { EmbedBuilder } = require('discord.js');
// FIXED: Kept universalGet for pinpoint data, brought back 'db' for the native COUNT ranking calculation
const { universalGet, db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'profile',
    cooldown: 90,
    description: 'Check a user\'s profile.',
    category: 'Reputation', 
    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;

        try {
            // =======================================================
            // 1. PINPOINT PROFILE FETCH VIA MATRIX WRAPPERS
            // =======================================================
            const amashRow = universalGet("amash", user.id);
            const repRow = universalGet("reputation", user.id);

            const bucks = amashRow ? amashRow.bucks.toLocaleString() : '0 (UNOPENED)';
            const rep = repRow ? repRow.points : 0;
            
            let rank = 'Unranked';

            // =======================================================
            // 2. HIGH-PERFORMANCE TARGETED RANK CALCULATION
            // =======================================================
            // Only query the engine for rank sorting if they actually have a record
            if (repRow) {
                const countRow = db.prepare(`SELECT COUNT(*) as higherPlayers FROM reputation WHERE points > ?`).get(rep);
                const higherPlayersCount = countRow?.higherPlayers ?? 0;
                
                // Position is equal to the number of players above them + 1
                rank = higherPlayersCount + 1;
            }

            // 3. Build and Send Embed
            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Profile`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true })) // Kept fallback thumbnail consistency
                .setColor('#3498DB')
                .addFields(
                    {
                        name: 'User',
                        value: `<@${user.id}>`, // Swapped raw string to user mention for better UI cohesion
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
