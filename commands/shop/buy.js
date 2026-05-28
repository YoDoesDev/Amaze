const { db } = require('../../utils/database.js');
const { items } = require('./shop.js');
const { clearCooldown } = require("../../utils/cooldowns.js");

module.exports = {
    name: 'buy',
    category: 'Shop',
    cooldown: 5,
    description: 'Purchase an item from the shop.',
    async execute(message, args) { 
        const itemCode = args[0];
        const item = items[itemCode];
        const userId = message.author.id;

        if (!item) {
            return message.reply("Invalid item code! Use `!shop` to see available items.");
        }

        try {
            // 1. Fetch Data (Synchronous & Direct)
            // Note: We use .get() for a single row result
            const row = db.prepare(`
                SELECT 
                    (SELECT bucks FROM amash WHERE userid = ?) as bucks,
                    (SELECT ${item.id} FROM inventory WHERE userid = ?) as current_item
            `).get(userId, userId);

            const balance = row?.bucks ?? 0;
            const itemStatus = row?.current_item ?? 0;
            const now = Date.now();

            // 2. Balance Check
            if (balance < item.price) {
                return message.reply(`You need **${item.price} Amash** to buy this, but you only have **${balance}**.`);
            }

            // 3. Ownership Check (Logic remains the same, just cleaner)
            if (itemCode !== "3") { 
                if (item.isPerm && itemStatus >= 1) {
                    return message.reply(`You already own a **${item.name}**!`);
                }
                if (!item.isPerm && itemStatus > now) {
                    return message.reply(`You already have an active **${item.name}**! Wait for it to expire.`);
                }
            }

            // 4. Calculate New Status
            let newStatus;
            if (item.id === 'pstone') {
                newStatus = (itemStatus || 0) + 1;
            } else if (item.isPerm) {
                newStatus = 1;
            } else {
                const duration = (item.id === 'pr_tp') ? (24 * 60 * 60 * 1000) : (12 * 60 * 60 * 1000);
                newStatus = now + duration;
            }

            // 5. Execution (No more .serialize or nested callbacks!)
            // These run one after another perfectly.
            db.prepare(`INSERT OR IGNORE INTO inventory (userid) VALUES (?)`).run(userId);
            db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(item.price, userId);
            db.prepare(`UPDATE inventory SET ${item.id} = ? WHERE userid = ?`).run(newStatus, userId);

            // 6. Final Response
            let successDetail = item.id === 'pstone' 
                ? `You now own **${newStatus}** Philosopher's Stones! 💎` 
                : `Successfully bought **${item.name}**.`;

            message.reply(`💸 **Purchase Successful!** ${successDetail}\nRemaining balance: **${balance - item.price} Amash**.`);

        } catch (err) {
            console.error("Buy Command Error:", err);
            clearCooldown(message.author.id, module.exports);
            message.reply("An error occurred while processing your purchase.");
        }
    }
};
