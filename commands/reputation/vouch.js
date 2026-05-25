const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/cooldowns.js");

module.exports = {
    name: 'vouch',
    category: 'Reputation', 
    cooldown: 10,
    description: 'Vouch for a user with an 8-hour cooldown per person.\n\nSyntax: `!vouch <@user>`',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        const authorId = message.author.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000;

        // 1. Validations with Cooldown Resets
        if (!targetUser) {
            clearCooldown(authorId, module.exports);
            return message.reply("Mention someone to vouch for them!");
        }
        if (targetUser.id === authorId) {
            clearCooldown(authorId, module.exports);
            return message.reply("Self-vouching? Focus on the work, not the praise.");
        }
        if (targetUser.bot) {
            clearCooldown(authorId, module.exports);
            return message.reply("Bots don't have reputations.");
        }

        try {
            // 2. Fetch History and Doubler Status
            const row = db.prepare(`
                SELECT 
                    (SELECT timestamp FROM vouch_history WHERE voucher_id = ? AND receiver_id = ?) as last_vouch,
                    (SELECT dblv_tp FROM inventory WHERE userid = ?) as vouch_doubler
            `).get(authorId, targetUser.id, authorId);

            // 3. Cooldown Check
            if (row?.last_vouch && (now - row.last_vouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - row.last_vouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return message.reply(`This user's reputation was recently influenced. Wait **${hrs}h ${mins}m** to fame them again.`);
            }

            // 4. Check for Doubler
            const isDoubled = row?.vouch_doubler && now < row.vouch_doubler;
            const multiplier = isDoubled ? 2 : 1;
            const profitGain = 5 * multiplier;

            // 5. Atomic Execution (Sequential Writes)
            
            // Log this interaction to the history table
            db.prepare(`INSERT OR REPLACE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`).run(authorId, targetUser.id, now);

            // Ensure reputation row exists and update reputation points
            db.prepare(`INSERT OR IGNORE INTO reputation (userid, points) VALUES (?, 0)`).run(targetUser.id);
            db.prepare(`UPDATE reputation SET points = points + ? WHERE userid = ?`).run(multiplier, targetUser.id);

            // SAFELY PAYOUT THE TARGET: Ensure user exists in economy table, then add direct balance profit
            db.prepare(`INSERT OR IGNORE INTO economy (userid, coins) VALUES (?, 0)`).run(targetUser.id);
            db.prepare(`UPDATE economy SET coins = coins + ? WHERE userid = ?`).run(profitGain, targetUser.id);

            // SAFELY PAYOUT INVESTORS: Distribute profit dividends to people holding stocks in this user
            db.prepare(`
                UPDATE investments 
                SET profit = COALESCE(profit, 0) + (COALESCE(stocks, 0) * ?) 
                WHERE invested = ?
            `).run(profitGain, targetUser.id);

            // 6. Fetch Final Values and Respond
            const repRow = db.prepare(`SELECT points FROM reputation WHERE userid = ?`).get(targetUser.id);

            let msg = `✨ **Vouch Recorded!** ${targetUser.username} gained personal profits and now has **${repRow?.points ?? 0}** reputation points.`;
            if (isDoubled) msg = `⏭️ **VOUCH DOUBLER ACTIVE!** ${msg}`;

            await message.channel.send(msg);

        } catch (err) {
            console.error("Vouch Command Error:", err);
            clearCooldown(message.author.id, module.exports);
            return message.reply("A database error occurred while recording the vouch.");
        }
    }
};
