const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'vouch',
    category: 'Reputation', 
    cooldown: 10,
    description: 'Vouch for a user with a 8-hour cooldown per person.\n\nSyntax: `!vouch <@user>`',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        const authorId = message.author.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000; // 8 Hours in ms

        if (!targetUser) return message.reply("Mention someone to vouch for them!");
        if (targetUser.id === authorId) return message.reply("Self-vouching? Focus on the work, not the praise.");
        if (targetUser.bot) return message.reply("Bots don't have reputations.");

        try {
            // =======================================================
            // 1. FETCH ALL LOGIC DATA SEAMLESSLY VIA MATRIX WRAPPERS
            // =======================================================
            const authorInventory = universalGet("inventory", authorId);
            
            // Handle the composite mapping logic for vouch history rows
            const vouchHistoryId = `${authorId}_${targetUser.id}`;
            const vouchRow = universalGet("vouch_history", vouchHistoryId);

            const lastVouch = vouchRow ? vouchRow.timestamp : null;
            const vouchDoubler = authorInventory ? authorInventory.dblv_tp : null;

            // 2. Cooldown Check
            if (lastVouch && (now - lastVouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - lastVouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return message.reply(`This user's reputation was recently influenced. Wait **${hrs}h ${mins}m** to fame them again.`);
            }

            // 3. Check for Doubler
            const isDoubled = vouchDoubler && now < vouchDoubler;
            const multiplier = isDoubled ? 2 : 1;

            // =======================================================
            // 4. EXECUTION MATRIX MUTATIONS (SEQUENTIAL & ATOMIC)
            // =======================================================
            
            // Record / Update history record
            if (!vouchRow) {
                universalCreate("vouch_history", vouchHistoryId);
            }
            universalSet("vouch_history", vouchHistoryId, {
                voucher_id: authorId,
                receiver_id: targetUser.id,
                timestamp: now
            });

            // Update Target Reputation (Safe initialization included)
            const repRow = universalGet("reputation", targetUser.id);
            if (!repRow) {
                universalCreate("reputation", targetUser.id);
            }
            const currentPoints = repRow?.points ?? 0;
            const finalPoints = currentPoints + multiplier;

            universalSet("reputation", targetUser.id, {
                points: finalPoints
            });

            // Update Investor Profits (Stock Market boost calculations)
            const investmentRow = universalGet("investments", targetUser.id);
            if (investmentRow) {
                const currentProfit = investmentRow.profit ?? 0;
                const stocks = investmentRow.stocks ?? 0;
                const profitGain = 5 * multiplier;

                universalSet("investments", targetUser.id, {
                    profit: currentProfit + (stocks * profitGain)
                });
            }

            // 5. Output Response
            let msg = `✨ **Vouch Recorded!** ${targetUser.username} now has **${finalPoints}** reputation points.`;
            if (isDoubled) msg = `⏭️ **VOUCH DOUBLER ACTIVE!** ${msg}`;

            await message.reply(msg);

        } catch (err) {
            console.error("Vouch Command Error:", err);
            clearCooldown(message.author.id, module.exports);
            return message.reply("A database error occurred while recording the vouch.");
        }
    }
};
