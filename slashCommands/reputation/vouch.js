const { SlashCommandBuilder } = require('discord.js');
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Vouch for a user to increase their reputation (8-hour cooldown).')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to vouch for')
                .setRequired(true)
        ),
    category: 'Reputation',
    cooldown: 10,

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const authorId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000; // 8 Hours

        if (targetUser.id === authorId) return interaction.editReply("Self-vouching? Focus on the work, not the praise.");
        if (targetUser.bot) return interaction.editReply("Bots don't have reputations.");

        try {
            // 1. FETCH LOGIC VIA DUAL-KEY MATRIX
            const authorInventory = universalGet("inventory", authorId);
            const vouchRow = universalGet("vouch_history", authorId, targetUser.id);
            
            const lastVouch = vouchRow?.timestamp ?? null;
            const vouchDoubler = authorInventory?.dblv_tp ?? null;

            // 2. Cooldown Check
            if (lastVouch && (now - lastVouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - lastVouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return interaction.editReply(`This user's reputation was recently influenced. Wait **${hrs}h ${mins}m** to vouch again.`);
            }

            const isDoubled = vouchDoubler && now < vouchDoubler;
            const multiplier = isDoubled ? 2 : 1;

            // 3. EXECUTION MUTATIONS (DUAL-KEY DISPATCH)
            if (!vouchRow) universalCreate("vouch_history", authorId, targetUser.id);
            
            universalSet("vouch_history", authorId, targetUser.id, { timestamp: now });

            // Update Target Reputation
            const repRow = universalGet("reputation", targetUser.id);
            if (!repRow) universalCreate("reputation", targetUser.id);
            
            const finalPoints = (repRow?.points ?? 0) + multiplier;
            universalSet("reputation", targetUser.id, { points: finalPoints });

            // Update Investor Profits (Must use dual-key for investments table)
            // Note: Fixed to fetch by (investor, invested) per schema
            const investmentRow = universalGet("investments", authorId, targetUser.id);
            if (investmentRow) {
                universalSet("investments", authorId, targetUser.id, {
                    profit: (investmentRow.profit ?? 0) + (investmentRow.stocks * (5 * multiplier))
                });
            }

            // 4. Output Response
            let msg = `✨ **Vouch Recorded!** ${targetUser.username} now has **${finalPoints}** reputation points.`;
            if (isDoubled) msg = `⏭️ **VOUCH DOUBLER ACTIVE!** ${msg}`;

            return interaction.editReply(msg);

        } catch (err) {
            console.error("Vouch Slash Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred while recording the vouch.");
        }
    }
};
