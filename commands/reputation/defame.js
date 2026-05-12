const { db } = require('../../utils/database.js');

module.exports = {
    name: 'defame',
    category: 'Reputation', 
    cooldown: 10,
    description: 'Defame a user with a 8-hour cooldown per person.\n\nSyntax: `!defame <@user>`',
    async execute(message, args) { 
        const targetUser = message.mentions.users.first();
        const authorId = message.author.id;
        const guildId = message.guild.id; // Target specific server rep
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000; // 8 Hours in ms

        if (!targetUser) return message.reply("Mention someone to defame them.");
        if (targetUser.id === authorId) return message.reply("Self-defaming? Chin up, soldier, don't be too hard on yourself.");
        if (targetUser.bot) return message.reply("Bots don't have reputations.");

        try {
            // 1. Fetch logic variables (Inventory is usually global, but history check remains)
            const row = db.prepare(`
                SELECT 
                    (SELECT pr_tp FROM inventory WHERE userid = ?) as target_shield,
                    (SELECT timestamp FROM vouch_history WHERE voucher_id = ? AND receiver_id = ?) as last_vouch,
                    (SELECT ddbl_tp FROM inventory WHERE userid = ?) as author_doubler
            `).get(targetUser.id, authorId, targetUser.id, authorId);

            // 2. Shield Check
            if (row?.target_shield && now < row.target_shield) {
                return message.reply(`🛡️ **PR Shield Active!** ${targetUser.username} is protected.`);
            }

            // 3. Cooldown Check
            if (row?.last_vouch && (now - row.last_vouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - row.last_vouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return message.reply(`Slow down! Cooldown active for another **${hrs}h ${mins}m**.`);
            }

            const multiplier = (row?.author_doubler && now < row.author_doubler) ? 2 : 1;

            // 4. Atomic Execution
            // Lock the cooldown (Global)
            db.prepare(`INSERT OR REPLACE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`).run(authorId, targetUser.id, now);

            // Update Reputation (Server-Specific)
            db.prepare(`INSERT OR IGNORE INTO reputation (userid, guildid, points) VALUES (?, ?, 0)`).run(targetUser.id, guildId);
            db.prepare(`UPDATE reputation SET points = points - ? WHERE userid = ? AND guildid = ?`).run(multiplier, targetUser.id, guildId);

            // Impact investors (Stock Market crash logic)
            db.prepare(`UPDATE investments SET profit = profit - (stocks * ?) WHERE invested = ?`).run(5 * multiplier, targetUser.id);

            // 5. Fetch final points for the response (Server-Specific)
            const finalRep = db.prepare(`SELECT points FROM reputation WHERE userid = ? AND guildid = ?`).get(targetUser.id, guildId);

            message.channel.send(`🥀 **Defamed!** ${targetUser.username} now has **${finalRep?.points ?? 0}** rep. ${multiplier > 1 ? '↘️ **(x2 Power)**' : ''}`);

        } catch (err) {
            console.error("Defame Error:", err);
            message.reply("A database error occurred during the defamation process.");
        }
    }
};
