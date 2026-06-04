const { items } = require('./shop.js');
// 1. FIXED: Imported your matrix utility functions
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

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
            // =======================================================
            // 1. FETCH ALL DATA SEAMLESSLY VIA MATRIX WRAPPERS
            // =======================================================
            const amashRow = universalGet("amash", userId);
            const invRow = universalGet("inventory", userId);

            const balance = amashRow?.bucks ?? 0;
            // Dynamically read the specific column based on the item ID
            const itemStatus = invRow ? invRow[item.id] : 0;
            const now = Date.now();

            // 2. Balance Check
            if (balance < item.price) {
                return message.reply(`You need **${item.price} Amash** to buy this, but you only have **${balance}**.`);
            }

            // 3. Ownership Check
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

            // =======================================================
            // 5. EXECUTION MATRIX MUTATIONS (SEQUENTIAL & SAFE)
            // =======================================================
            
            // Deduct money from amash table
            universalSet("amash", userId, {
                bucks: balance - item.price
            });

            // Ensure inventory row exists (Your custom inline INSERT OR IGNORE alternative)
            if (!invRow) {
                universalCreate("inventory", userId);
            }

            // Update inventory column using a computed property name [item.id]
            universalSet("inventory", userId, {
                [item.id]: newStatus
            });

            // 6. Final Response
            let successDetail = item.id === 'pstone' 
                ? `You now own **${newStatus}** Philosopher's Stones! 💎` 
                : `Successfully bought **${item.name}**.`;

            message.reply(`💸 **Purchase Successful!** ${successDetail}\nRemaining balance: **${(balance - item.price).toLocaleString()} Amash**.`);

        } catch (err) {
            console.error("Buy Command Error:", err);
            clearCooldown(message.author.id, module.exports);
            message.reply("An error occurred while processing your purchase.");
        }
    }
};
