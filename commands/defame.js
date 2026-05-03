const { db } = require('../database.js');

module.exports = {
    name: 'defame',
    category: 'Reputation', 
    description: 'Defame a user with a 8-hour cooldown per person.\n\nSyntax: `!defame <@user>`',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        const authorId = message.author.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000;

        if (!targetUser) return message.reply("Mention someone to defame them.");
        if (targetUser.id === authorId) return message.reply("Self-defaming? Chin up, soldier, don't be too hard on yourself.");
        if (targetUser.bot) return message.reply("Bots don't have reputations.");

        // 1. Check Cooldown and Inventory for Doubler
        db.get(
            `SELECT v.timestamp, i.ddbl_tp 
             FROM amash a 
             LEFT JOIN vouch_history v ON v.voucher_id = ? AND v.receiver_id = ?
             LEFT JOIN inventory i ON i.userid = ?
             WHERE a.userid = ?`,
            [authorId, targetUser.id, authorId, authorId],
            (err, row) => {
                if (err) {
                    console.error("Database Error:", err);
                    return message.reply("A logic error occurred.");
                }

                // Check Cooldown
                if (row && row.timestamp && (now - row.timestamp) < cooldownTime) {
                    const timeLeft = Math.ceil((cooldownTime - (now - row.timestamp)) / (60 * 1000));
                    const hours = Math.floor(timeLeft / 60);
                    const minutes = timeLeft % 60;
                    return message.reply(`Wait **${hours}h ${minutes}m** to fame or defame them again.`);
                }

                // 2. Determine Multiplier (ddbl_tp stores the expiry timestamp)
                const isDoubled = row && row.ddbl_tp && now < row.ddbl_tp;
                const multiplier = isDoubled ? 2 : 1;

                db.serialize(() => {
                    // Update History
                    db.run(`INSERT OR REPLACE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`, [authorId, targetUser.id, now]);
                    
                    // Ensure reputation row exists
                    db.run(`INSERT OR IGNORE INTO reputation (user_id, points) VALUES (?, 0)`, [targetUser.id]);

                    // 3. Update Reputation (Multiplied)
                    db.run(`UPDATE reputation SET points = points - ? WHERE user_id = ?`, [multiplier, targetUser.id]);

                    // 4. Update Investor Profits (Multiplied)
                    const profitLoss = 5 * multiplier;
                    db.run(`UPDATE investments SET profit = profit - (stocks * ?) WHERE invested = ?`, [profitLoss, targetUser.id]);

                    db.get(`SELECT points FROM reputation WHERE user_id = ?`, [targetUser.id], (fetchErr, repRow) => {
                        if (repRow) {
                            let msg = `🥀 **Defamation Recorded!** ${targetUser.username} now has **${repRow.points}** reputation points.`;
                            if (isDoubled) msg = `↘️ **DOUBLE DEFAME!** ${msg}`;
                            message.channel.send(msg);
                        }
                    });
                });
            }
        );
    }
};
