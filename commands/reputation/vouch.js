const { db } = require('../../utils/database.js');

module.exports = {
    name: 'vouch',
    category: 'Reputation', 
    cooldown: 10,
    description: 'Vouch for a user with a 8-hour cooldown per person.\n\nSyntax: `!vouch <@user>`',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        const authorId = message.author.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000;

        if (!targetUser) return message.reply("Mention someone to vouch for them!");
        if (targetUser.id === authorId) return message.reply("Self-vouching? Focus on the work, not the praise.");
        if (targetUser.bot) return message.reply("Bots don't have reputations.");

        try {
            // 1. Fetch History and Doubler Status
            const row = db.prepare(`
                SELECT 
                    (SELECT timestamp FROM vouch_history WHERE voucher_id = ? AND receiver_id = ?) as last_vouch,
                    (SELECT dblv_tp FROM inventory WHERE userid = ?) as vouch_doubler
            `).get(authorId, targetUser.id, authorId);

            // 2. Cooldown Check
            if (row?.last_vouch && (now - row.last_vouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - row.last_vouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return message.reply(`This user's reputation was recently influenced. Wait **${hrs}h ${mins}m** to fame them again.`);
            }

            // 3. Check for Doubler
            const isDoubled = row?.vouch_doubler && now < row.vouch_doubler;
            const multiplier = isDoubled ? 2 : 1;

            // 4. Atomic Execution (Sequential)
            // Update history
            db.prepare(`INSERT OR REPLACE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`).run(authorId, targetUser.id, now);

            // Ensure reputation row exists and Update
            db.prepare(`INSERT OR IGNORE INTO reputation (userid, points) VALUES (?, 0)`).run(targetUser.id);
            db.prepare(`UPDATE reputation SET points = points + ? WHERE userid = ?`).run(multiplier, targetUser.id);

            // Update Investor Profits (Multiplied)
            const profitGain = 5 * multiplier;
            db.prepare(`UPDATE investments SET profit = profit + (stocks * ?) WHERE invested = ?`).run(profitGain, targetUser.id);

            // 5. Fetch and Respond
            const repRow = db.prepare(`SELECT points FROM reputation WHERE userid = ?`).get(targetUser.id);

            let msg = `✨ **Vouch Recorded!** ${targetUser.username} now has **${repRow?.points ?? 0}** reputation points.`;
            if (isDoubled) msg = `⏭️ **VOUCH DOUBLER ACTIVE!** ${msg}`;

            await message.channel.send(msg);

        } catch (err) {
            console.error("Vouch Command Error:", err);
            return message.reply("A database error occurred while recording the vouch.");
        }
    }
};
