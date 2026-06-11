const { EmbedBuilder } = require('discord.js');
const { universalGet } = require('../../utils/database.js'); 
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'repstats',
    aliases: ['rs'], 
    category: 'Reputation', 
    cooldown: 10,
    description: 'Check your/other\'s reputation points\n\nSyntax: `!repstats [@user]`',
    async execute(message, args) {
        try {
            const targetUser = message.mentions.users.first() || message.author;

            // 1. Fetch points (Synchronous & Direct)
            // No callback needed; the code waits here until db returns the row.
            const row = universalGet("reputation", targetUser.id);
            
            const points = row?.points ?? 0;

            // 2. Build and Send
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`${targetUser.username}'s Standing`)
                .setDescription(`✨ **Total Reputation:** ${points} points`)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error(">>> [CRITICAL] RepStats Execution crashed:", error);
            clearCooldown(message.author.id, module.exports);
            message.reply("Could not retrieve reputation data at this moment.");
        }
    }
};
