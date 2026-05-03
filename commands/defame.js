const { db } = require('../database.js');

module.exports = {
    name: 'defame',
    category: 'Reputation', 
    description: 'Defame a user with a 8-hour cooldown per person.\n\nSyntax: `!vouch <@user>`',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        const authorId = message.author.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000;

        if (!targetUser || targetUser.id === authorId || targetUser.bot) return;

        // 1. STRICT SHIELD & COOLDOWN CHECK
        // We fetch the target's shield AND the specific history between these two people
        db.get(
            `SELECT 
                (SELECT pr_tp FROM inventory WHERE userid = ?) as target_shield,
                (SELECT timestamp FROM vouch_history WHERE voucher_id = ? AND receiver_id = ?) as last_vouch,
                (SELECT ddbl_tp FROM inventory WHERE userid = ?) as author_doubler`,
            [targetUser.id, authorId, targetUser.id, authorId],
            (err, row) => {
                if (err) return console.error(err);

                // Check Shield First (The most important wall)
                if (row && row.target_shield && now < row.target_shield) {
                    return message.reply(`🛡️ **PR Shield Active!** ${targetUser.username} is protected.`);
                }

                // Check Cooldown (To stop the "3 times in a row" guy)
                if (row && row.last_vouch && (now - row.last_vouch) < cooldownTime) {
                    const timeLeft = Math.ceil((cooldownTime - (now - row.last_vouch)) / (60 * 1000));
                    return message.reply(`Slow down! Cooldown active for another **${Math.floor(timeLeft/60)}h ${timeLeft%60}m**.`);
                }

                const multiplier = (row && row.author_doubler && now < row.author_doubler) ? 2 : 1;

                // 2. THE ATOMIC UPDATE
                db.serialize(() => {
                    // Lock the cooldown immediately
                    db.run(`INSERT OR REPLACE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`, 
                        [authorId, targetUser.id, now]);
                    
                    db.run(`INSERT OR IGNORE INTO reputation (user_id, points) VALUES (?, 0)`);
                    db.run(`UPDATE reputation SET points = points - ? WHERE user_id = ?`, [multiplier, targetUser.id]);
                    
                    // Impact investors
                    db.run(`UPDATE investments SET profit = profit - (stocks * ?) WHERE invested = ?`, [5 * multiplier, targetUser.id]);

                    db.get(`SELECT points FROM reputation WHERE user_id = ?`, [targetUser.id], (e, res) => {
                        if (res) {
                            message.channel.send(`🥀 **Defamed!** ${targetUser.username} now has **${res.points}** rep. ${multiplier > 1 ? '↘️ **(x2)**' : ''}`);
                        }
                    });
                });
            }
        );
    }
};
