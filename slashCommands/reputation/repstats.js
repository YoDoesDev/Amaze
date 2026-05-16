const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/database.js'); 
const { clearCooldown } = require("../../utils/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("repstats")
        .setDescription("Check your or another user's reputation points")
        .addUserOption(option => 
            option.setName("target")
                .setDescription("The user whose reputation you want to check")
                .setRequired(false)
        ),
    category: 'Reputation', 
    cooldown: 10,

    async execute(interaction) {
        const authorId = interaction.user.id;
        // If no target is provided, it defaults to the command executor
        const targetUser = interaction.options.getUser("target") || interaction.user;

        try {
            // 1. Fetch points (Synchronous & Direct)
            const row = db.prepare(`SELECT points FROM reputation WHERE userid = ?`).get(targetUser.id);
            const points = row?.points ?? 0;

            // 2. Build the Embed
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`${targetUser.username}'s Standing`)
                .setDescription(`✨ **Total Reputation:** ${points} points`)
                .setFooter({ text: "Amaze Reputation System" })
                .setTimestamp();

            // 3. Send the response
            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(">>> [CRITICAL] RepStats Execution crashed:", error);
            
            // Clean up the internal command cooldown so they can try again
            clearCooldown(authorId, module.exports);
            
            return interaction.editReply("Could not retrieve reputation data at this moment.");
        }
    }
};
