const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// FIXED: Brought back pinpoint matrix tools, keeping 'db' for targeted query aggregation
const { universalGet, db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Check a user's Amaze profile, including amash and reputation standing")
        .addUserOption(option => 
            option.setName("target")
                .setDescription("The user whose profile you want to check")
                .setRequired(false)
        ),
    category: 'Reputation', 
    cooldown: 90,

    async execute(interaction) {
        const authorId = interaction.user.id;
        const user = interaction.options.getUser("target") || interaction.user;

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
            // Only perform rank calculations if they actually have a record in the rep table
            if (repRow) {
                const countRow = db.prepare(`SELECT COUNT(*) as higherPlayers FROM reputation WHERE points > ?`).get(rep);
                const higherPlayersCount = countRow?.higherPlayers ?? 0;
                
                // Rank is equal to the number of players above them + 1
                rank = higherPlayersCount + 1;
            }

            // 3. Build the profile embed
            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Profile`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setColor('#3498DB')
                .addFields(
                    {
                        name: 'User',
                        value: `<@${user.id}>`,
                        inline: false
                    },
                    {
                        name: 'Stats',
                        value: 
                            `💰 **Amash:** ${bucks}\n` +
                            `⭐ **Reputation:** ${rep}\n` +
                            `🏆 **Global Rank:** #${rank}`,
                        inline: false
                    }
                )
                .setFooter({ text: `Requested by ${interaction.user.username}` })
                .setTimestamp();

            // 4. Send the visual profile back
            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("Profile Command Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply('An error occurred while fetching the profile.');
        }
    }
};
