const { db } = require('../database.js');
const { items } = require('./shop.js');

module.exports = {
    name: 'buy',
    category: 'Economy',
    description: 'Purchase an item from the shop.',
    async execute(message, args) {
        const itemCode = args[0];
        const item = items[itemCode];
        const userId = message.author.id;

        if (!item) {
            return message.reply("Invalid item code! Use `!shop` to see available items.");
        }

        db.get(
            `SELECT 
                (SELECT bucks FROM amash WHERE userid = ?) as bucks,
                (SELECT ${item.id} FROM inventory WHERE userid = ?) as current_item`,
            [userId, userId],
            (err, row) => {
                if (err) return console.error("Buy Error:", err);

                const balance = row ? row.bucks : 0;
                const itemStatus = row ? row.current_item : 0;
                const now = Date.now();

                // 1. Balance Check
                if (balance < item.price) {
                    return message.reply(`You need **${item.price} Amash** to buy this, but you only have **${balance}**.`);
                }

                // 2. Ownership Check (SKIP for Philosopher's Stone)
                if (itemCode !== "3") { 
                    // Block duplicate Permanent items (License)
                    if (item.isPerm && itemStatus >= 1) {
                        return message.reply(`You already own a **${item.name}**!`);
                    }
                    // Block duplicate Timed items (Shields/Doublers)
                    if (!item.isPerm && itemStatus > now) {
                        return message.reply(`You already have an active **${item.name}**! Wait for it to expire.`);
                    }
                }

                // 3. Calculate New Value
                let newStatus;
                if (item.id === 'pstone') {
                    // Increment the count for Stones
                    newStatus = (itemStatus || 0) + 1;
                } else if (item.isPerm) {
                    newStatus = 1;
                } else {
                    // Set Expiry Timestamps
                    const duration = (item.id === 'pr_tp') ? (24 * 60 * 60 * 1000) : (12 * 60 * 60 * 1000);
                    newStatus = now + duration;
                }

                // 4. Execution
                db.serialize(() => {
                    db.run(`INSERT OR IGNORE INTO inventory (userid) VALUES (?)`, [userId]);
                    db.run(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`, [item.price, userId]);
                    
                    db.run(`UPDATE inventory SET ${item.id} = ? WHERE userid = ?`, [newStatus, userId], (updErr) => {
                        if (updErr) return console.error(updErr);

                        let successDetail = item.id === 'pstone' 
                            ? `You now own **${newStatus}** Philosopher's Stones! 💎` 
                            : `Successfully bought **${item.name}**.`;

                        message.reply(`💸 **Purchase Successful!** ${successDetail}\nRemaining balance: **${balance - item.price} Amash**.`);
                    });
                });
            }
        );
    }
};
