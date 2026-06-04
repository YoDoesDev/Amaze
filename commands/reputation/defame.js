const { EmbedBuilder } = require('discord.js');
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'defame',
    category: 'Reputation', 
    cooldown: 10,
    description: 'Defame a user with a 8-hour cooldown per person.\n\nSyntax: `!defame <@user>\n\n(Costs 100 Amash in selected servers)`',
    async execute(message, args) { 
        const targetUser = message.mentions.users.first();
        const authorId = message.author.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000; // 8 Hours in ms

        if (!targetUser) return message.reply("Mention someone to defame them.");
        if (targetUser.id === authorId) return message.reply("Self-defaming? Chin up, soldier, don't be too hard on yourself.");
        if (targetUser.bot) return message.reply("Bots don't have reputations.");

        try {
            // =======================================================
            // 1. FETCH LOGIC VIA DUAL-KEY MATRIX WRAPPERS
            // =======================================================
            const targetInventory = universalGet("inventory", targetUser.id);
            const authorInventory = universalGet("inventory", authorId);
            
            // FIXED: Passing separate keys for the composite vouch_history table
            const vouchRow = universalGet("vouch_history", authorId, targetUser.id);

            const targetShield = targetInventory ? targetInventory.pr_tp : null;
            const authorDoubler = authorInventory ? authorInventory.ddbl_tp : null;
            const lastVouch = vouchRow ? vouchRow.timestamp : null;

            // 2. Shield & Cooldown Checks
            if (targetShield && now < targetShield) {
                return message.reply(`🛡️ **PR Shield Active!** ${targetUser.username} is protected.`);
            }

            if (lastVouch && (now - lastVouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - lastVouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return message.reply(`Slow down! Cooldown active for another **${hrs}h ${mins}m**.`);
            }

            const multiplier = (authorDoubler && now < authorDoubler) ? 2 : 1;

            // =======================================================
            // 3. EXECUTION MATRIX MUTATIONS (DUAL-KEY DISPATCH)
            // =======================================================
            
            if (!vouchRow) {
                // FIXED: Passing separate keys to universalCreate
                universalCreate("vouch_history", authorId, targetUser.id);
            }
            // FIXED: Passing separate keys to universalSet
            universalSet("vouch_history", authorId, targetUser.id, {
                timestamp: now
            });

            // Update Target Reputation
            const repRow = universalGet("reputation", targetUser.id);
            if (!repRow) {
                universalCreate("reputation", targetUser.id);
            }
            const currentPoints = repRow?.points ?? 0;
            const finalPoints = currentPoints - multiplier;
            
            universalSet("reputation", targetUser.id, {
                points: finalPoints
            });

            // FIXED: Impact investors (Fetch dual-key for investments table)
            const investmentRow = universalGet("investments", authorId, targetUser.id);
            if (investmentRow) {
                const currentProfit = investmentRow.profit ?? 0;
                const stocks = investmentRow.stocks ?? 0;
                // FIXED: Pass separate keys to universalSet for investments
                universalSet("investments", authorId, targetUser.id, {
                    profit: currentProfit - (stocks * (5 * multiplier))
                });
            }

            // Server-specific tax
            if (message.guild.id === "1226181188054548500") {
                const amashRow = universalGet("amash", authorId);
                const currentBucks = amashRow?.bucks ?? 0;
                universalSet("amash", authorId, { bucks: currentBucks - 100 });
                return message.channel.send(`🥀 **Defamed!** ${targetUser.username} now has **${finalPoints}** rep. ${multiplier > 1 ? '↘️ **(x2 Power)**' : ''}\nCosted 100 Amash.`);
            }

            message.channel.send(`🥀 **Defamed!** ${targetUser.username} now has **${finalPoints}** rep. ${multiplier > 1 ? '↘️ **(x2 Power)**' : ''}`);

        } catch (err) {
            console.error("Defame Error:", err);
            clearCooldown(authorId, module.exports);
            message.reply("A database error occurred during the defamation process.");
        }
    }
};
