const { db } = require('../database.js');

module.exports = {
    name: 'vouch',
    description: 'Vouch for a user with a 2-hour cooldown per person.',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        const authorId = message.author.id;
        const now = Date.now();
        const cooldownTime = 2 * 60 * 60 * 1000;

       
        if (!targetUser) return message.reply("Mention someone to vouch for them!");
        if (targetUser.id === authorId) return message.reply("Self-vouching? Focus on the work, not the praise.");
        if (targetUser.bot) return message.reply("Bots don't have reputations.");

        
        db.get(
            `SELECT timestamp FROM vouch_history WHERE voucher_id = ? AND receiver_id = ?`,
            [authorId, targetUser.id],
            (err, row) => {
                if (err) {
                    console.error("Database Error:", err);
                    return message.reply("A logic error occurred while checking history.");
                }

                if (row && (now - row.timestamp) < cooldownTime) {
                    const timeLeft = Math.ceil((cooldownTime - (now - row.timestamp)) / (60 * 1000));
                    return message.reply(`You've already vouched for this person recently. Wait **${timeLeft} minutes** to vouch again.`);
                }

                db.serialize(() => {
                    
                    db.run(
                        `INSERT OR REPLACE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`,
                        [authorId, targetUser.id, now]
                    );

                    
                    db.run(
                        `INSERT OR IGNORE INTO reputation (user_id, points) VALUES (?, 0)`,
                        [targetUser.id]
                    );

                    
                    db.run(
                        `UPDATE reputation SET points = points + 1 WHERE user_id = ?`,
                        [targetUser.id],
                        (updateErr) => {
                            if (updateErr) return console.error(updateErr);

                            
                            db.get(
                                `SELECT points FROM reputation WHERE user_id = ?`,
                                [targetUser.id],
                                (fetchErr, repRow) => {
                                    message.channel.send(
                                        `✨ **Vouch Recorded!** ${targetUser.username} now has **${repRow.points}** reputation points.`
                                    );
                                }
                            );
                        }
                    );
                });
            }
        );
    }
};