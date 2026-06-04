const { SlashCommandBuilder } = require('discord.js');
// 1. FIXED: Imported your clean matrix storage handlers and core db for the targeted investor sweep
const { universalGet, universalSet, universalCreate, db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("defame")
        .setDescription("Defame a user to reduce their reputation points (8-hour cooldown)")
        .addUserOption(option => 
            option.setName("target")
                .setDescription("The user you want to defame")
                .setRequired(true)
        ),
    category: 'Reputation', 
    cooldown: 10,

    async execute(interaction) { 
        const targetUser = interaction.options.getUser("target");
        const authorId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000; // 8 Hours in ms

        // Initial Safety Checks
        if (targetUser.id === authorId) {
            return interaction.editReply("Self-defaming? Chin up, soldier, don't be too hard on yourself.");
        }
        if (targetUser.bot) {
            return interaction.editReply("Bots don't have reputations.");
        }

        try {
            // =======================================================
            // 2. FETCH PROFILE & ITEMS SEAMLESSLY VIA MATRIX WRAPPERS
            // =======================================================
            const targetShieldRow = universalGet("inventory", targetUser.id);
            const authorDoublerRow = universalGet("inventory", authorId);
            const amashRow = universalGet("amash", authorId);
            const repRow = universalGet("reputation", targetUser.id);
            
            // Build the compound key to check history between these two specific players
            const historyKey = `${authorId}_${targetUser.id}`;
            const historyRow = universalGet("vouch_history", historyKey);

            const targetShield = targetShieldRow?.pr_tp ?? 0;
            const authorDoubler = authorDoublerRow?.ddbl_tp ?? 0;
            const lastVouch = historyRow?.timestamp ?? 0;
            const currentRepPoints = repRow?.points ?? 0;
            const currentBucks = amashRow?.bucks ?? 0;

            // 3. Shield Check
            if (targetShield && now < targetShield) {
                return interaction.editReply(`🛡️ **PR Shield Active!** ${targetUser.username} is protected.`);
            }

            // 4. Cooldown Check
            if (lastVouch && (now - lastVouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - lastVouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return interaction.editReply(`Slow down! Cooldown active for another **${hrs}h ${mins}m**.`);
            }

            // Evaluate Defame Power
            const multiplier = (authorDoubler && now < authorDoubler) ? 2 : 1;
            const repDeduction = multiplier;

            // =======================================================
            // 5. EXECUTION MATRIX MUTATIONS (SEQUENTIAL & ATOMIC)
            // =======================================================
            
            // Lock the cooldown record
            if (!historyRow) {
                universalCreate("vouch_history", historyKey);
            }
            universalSet("vouch_history", historyKey, {
                voucher_id: authorId,
                receiver_id: targetUser.id,
                timestamp: now
            });

            // Update Target Reputation
            if (!repRow) {
                universalCreate("reputation", targetUser.id);
            }
            const finalRepPoints = currentRepPoints - repDeduction;
            universalSet("reputation", targetUser.id, {
                points: finalRepPoints
            });

            // HIGH PERFORMANCE: Fetch ONLY the specific investors tracking this target from disk
            const targetedInvestors = db.prepare(`SELECT investor, stocks, profit FROM investments WHERE invested = ?`).all(targetUser.id);
            const portfolioLossPerStock = 5 * multiplier;

            // Loop and mutate precisely through matching data slices via custom matrix keys
            for (const investorRow of targetedInvestors) {
                const investorKey = `${investorRow.investor}_${targetUser.id}`;
                const currentProfit = investorRow.profit ?? 0;
                const stocksOwned = investorRow.stocks ?? 0;

                universalSet("investments", investorKey, {
                    profit: currentProfit - (stocksOwned * portfolioLossPerStock)
                });
            }

            // 6. Handle Server-Specific Currency Penalties
            if (interaction.guild?.id === "1226181188054548500") {
                universalSet("amash", authorId, {
                    bucks: currentBucks - 100
                });
                return interaction.editReply(`🥀 **Defamed!** ${targetUser.username} now has **${finalRepPoints}** rep. ${multiplier > 1 ? '↘️ **(x2 Power)**' : ''}\nCosted 100 Amash.`);
            }

            return interaction.editReply(`🥀 **Defamed!** ${targetUser.username} now has **${finalRepPoints}** rep. ${multiplier > 1 ? '↘️ **(x2 Power)**' : ''}`);

        } catch (err) {
            console.error("Defame Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred during the defamation process.");
        }
    }
};
