const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
const { items } = require('./shop.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Purchase an item or booster from the shop")
        .addStringOption(option => 
            option.setName("item")
                .setDescription("The item you want to purchase")
                .setRequired(true)
                .addChoices(
                    { name: '🛒 1. PR Shield (300 Amash)', value: '1' },
                    { name: '🛒 2. Stock License (1200 Amash)', value: '2' },
                    { name: '🛒 3. Philosopher\'s Stone (5000 Amash)', value: '3' },
                    { name: '🛒 4. Vouch Doubler (150 Amash)', value: '4' },
                    { name: '🛒 5. Defame Doubler (220 Amash)', value: '5' }
                )
        ),
    category: 'Shop',
    cooldown: 5,

    async execute(interaction) { 
        const itemCode = interaction.options.getString("item");
        const item = items[itemCode];
        const userId = interaction.user.id;

        // Extra defensive validation (redundant due to choices menu, but clean)
        if (!item) {
            return interaction.editReply("Invalid item selection! Use `/shop` to view details.");
        }

        try {
            // 1. Fetch Currency and Target Column Data dynamically
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
                return interaction.editReply(`You need **${item.price} Amash** to buy this, but you only have **${balance}**.`);
            }

            // 3. Ownership / Expiration Constraints
            if (itemCode !== "3") { 
                if (item.isPerm && itemStatus >= 1) {
                    return interaction.editReply(`You already own a **${item.name}**!`);
                }
                if (!item.isPerm && itemStatus > now) {
                    return interaction.editReply(`You already have an active **${item.name}**! Wait for it to expire.`);
                }
            }

            // 4. State Modification Logic
            let newStatus;
            if (item.id === 'pstone') {
                newStatus = (itemStatus || 0) + 1;
            } else if (item.isPerm) {
                newStatus = 1;
            } else {
                const duration = (item.id === 'pr_tp') ? (24 * 60 * 60 * 1000) : (12 * 60 * 60 * 1000);
                newStatus = now + duration;
            }

            // 5. Atomic Sequence Execution
            db.prepare(`INSERT OR IGNORE INTO inventory (userid) VALUES (?)`).run(userId);
            db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(item.price, userId);
            db.prepare(`UPDATE inventory SET ${item.id} = ? WHERE userid = ?`).run(newStatus, userId);

            // 6. Complete Transaction Context Output
            let successDetail = item.id === 'pstone' 
                ? `You now own **${newStatus}** Philosopher's Stones! 💎` 
                : `Successfully bought **${item.name}**.`;

            return interaction.editReply(`💸 **Purchase Successful!** ${successDetail}\nRemaining balance: **${balance - item.price} Amash**.`);

        } catch (err) {
            console.error("Buy Command Error:", err);
            clearCooldown(userId, module.exports);
            return interaction.editReply("An error occurred while processing your purchase.");
        }
    }
};
