const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
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
        // If no target is provided, default to the command executor
        const user = interaction.options.getUser("target") || interaction.user;

        try {
            // 1. Fetch Amash balance
            const amashRow = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(user.id);
            const bucks = amashRow ? amashRow.bucks : '0 (UNOPENED)';

            // 2. Fetch All Reputations for Ranking calculation
            const rows = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC`).all();

            let rep = 0;
            let rank = 'Unranked';

            const index = rows.findIndex(r => r.userid === user.id);

            if (index !== -1) {
                rep = rows[index].points;
                rank = index + 1;
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
            // Reset command cooldown on failure
            clearCooldown(authorId, module.exports);
            return interaction.editReply('An error occurred while fetching the profile.');
        }
    }
};
