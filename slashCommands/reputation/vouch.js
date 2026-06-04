 const { SlashCommandBuilder } = require('discord.js');
// 1. FIXED: Migrated to your matrix wrappers, keeping 'db' for the targeted investment sweep
const { universalGet, universalSet, universalCreate, db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vouch")
        .setDescription("Vouch for a user to increase their reputation (8-hour cooldown)")
        .addUserOption(option => 
            option.setName("target")
                .setDescription("The user you want to vouch for")
                .setRequired(true)
        ),
    category: 'Reputation', 
    cooldown: 10,

    async execute(interaction) {
        const targetUser = interaction.options.getUser("target");
        const authorId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000; // 8 hours in ms

        // 1. Initial Input Validations
        if (targetUser.id === authorId) {
            return interaction.editReply("Self-vouching? Focus on the work, not the praise.");
        }
        if (targetUser.bot) {
            return interaction.editReply("Bots don't have reputations.");
        }

        try {
            // =======================================================
            // 2. FETCH DATA VIA MATRIX WRAPPERS
            // =======================================================
            const authorDoublerRow = universalGet("inventory", authorId);
            const targetRepRow = universalGet("reputation", targetUser.id);
            
            // Compound key check for user history mapping
            const historyKey = `${authorId}_${targetUser.id}`;
            const historyRow = universalGet("vouch_history", historyKey);

            const lastVouch = historyRow?.timestamp ?? 0;
            const vouchDoublerExpiration = authorDoublerRow?.dblv_tp ?? 0;
            const currentRepPoints = targetRepRow?.points ?? 0;

            // 3. Cooldown Logic Check
            if (lastVouch && (now - lastVouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - lastVouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return interaction.editReply(`This user's reputation was recently influenced. Wait **${hrs}h ${mins}m** to fame them again.`);
            }

            // 4. Check for Doubler Status
            const isDoubled = vouchDoublerExpiration && now < vouchDoublerExpiration;
            const multiplier = isDoubled ? 2 : 1;

            // =======================================================
            // 5. EXECUTION MATRIX MUTATIONS (SEQUENTIAL & ATOMIC)
            // =======================================================
            
            // Update history tracking key
            if (!historyRow) {
                universalCreate("vouch_history", historyKey);
            }
            universalSet("vouch_history", historyKey, {
                voucher_id: authorId,
                receiver_id: targetUser.id,
                timestamp: now
            });

            // Ensure reputation row exists, then update
            if (!targetRepRow) {
                universalCreate("reputation", targetUser.id);
            }
            const finalRepPoints = currentRepPoints + multiplier;
            universalSet("reputation", targetUser.id, {
                points: finalRepPoints
            });

            // HIGH PERFORMANCE: Extract *only* the specific portfolio records for this target from disk
            const targetedInvestors = db.prepare(`SELECT investor, stocks, profit FROM investments WHERE invested = ?`).all(targetUser.id);
            const portfolioGainPerStock = 5 * multiplier;

            // Execute matrix mutation precisely for each active investor
            for (const investorRow of targetedInvestors) {
                const investorKey = `${investorRow.investor}_${targetUser.id}`;
                const currentProfit = investorRow.profit ?? 0;
                const stocksOwned = investorRow.stocks ?? 0;

                universalSet("investments", investorKey, {
                    profit: currentProfit + (stocksOwned * portfolioGainPerStock)
                });
            }

            // 6. Respond with Results
            let responseMsg = `✨ **Vouch Recorded!** ${targetUser.username} now has **${finalRepPoints}** reputation points.`;
            if (isDoubled) responseMsg = `⏭️ **VOUCH DOUBLER ACTIVE!** ${responseMsg}`;

            return interaction.editReply(responseMsg);

        } catch (err) {
            console.error("Vouch Command Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred while recording the vouch.");
        }
    }
};
