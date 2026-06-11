const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('defame')
        .setDescription('Defame a user (8-hour cooldown per person). Costs 100 Amash in some servers.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to defame')
                .setRequired(true)
        ),
    category: 'Reputation',
    cooldown: 10,

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const authorId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000; // 8 Hours

        if (targetUser.id === authorId) return interaction.editReply("Self-defaming? Chin up, soldier, don't be too hard on yourself.");
        if (targetUser.bot) return interaction.editReply("Bots don't have reputations.");

        try {
            // 1. FETCH DATA VIA DUAL-KEY MATRIX WRAPPERS
            const targetInventory = universalGet("inventory", targetUser.id);
            const authorInventory = universalGet("inventory", authorId);
            const vouchRow = universalGet("vouch_history", authorId, targetUser.id);

            const targetShield = targetInventory?.pr_tp ?? null;
            const authorDoubler = authorInventory?.ddbl_tp ?? null;
            const lastVouch = vouchRow?.timestamp ?? null;

            // 2. Constraints
            if (targetShield && now < targetShield) {
                return interaction.editReply(`🛡️ **PR Shield Active!** ${targetUser.username} is protected.`);
            }

            if (lastVouch && (now - lastVouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - lastVouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return interaction.editReply(`Slow down! Cooldown active for another **${hrs}h ${mins}m**.`);
            }

            const multiplier = (authorDoubler && now < authorDoubler) ? 2 : 1;

            // 3. EXECUTION
            if (!vouchRow) universalCreate("vouch_history", authorId, targetUser.id);
            universalSet("vouch_history", authorId, { timestamp: now }, targetUser.id);

            const repRow = universalGet("reputation", targetUser.id);
            if (!repRow) universalCreate("reputation", targetUser.id);
            
            const finalPoints = (repRow?.points ?? 0) - multiplier;
            universalSet("reputation", targetUser.id, { points: finalPoints });

            // Impact investors
            const investmentRow = universalGet("investments", authorId, targetUser.id);
            if (investmentRow) {
                universalSet("investments", authorId, {
                    profit: investmentRow.profit - (investmentRow.stocks * (5 * multiplier))
                }, targetUser.id);
            }

            // Server-specific tax
            let extraInfo = "";
            if (interaction.guildId === "1226181188054548500") {
                const amashRow = universalGet("amash", authorId);
                universalSet("amash", authorId, { bucks: (amashRow?.bucks ?? 0) - 100 });
                extraInfo = "\nCosted 100 Amash.";
            }

            return interaction.editReply(`🥀 **Defamed!** ${targetUser.username} now has **${finalPoints}** rep. ${multiplier > 1 ? '↘️ **(x2 Power)**' : ''}${extraInfo}`);

        } catch (err) {
            console.error("Defame Slash Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred.");
        }
    }
};
