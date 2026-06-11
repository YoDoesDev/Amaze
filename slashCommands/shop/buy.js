const { SlashCommandBuilder } = require('discord.js');
// 1. FIXED: Migrated to your matrix wrappers cleanly
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');
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

        if (!item) {
            return interaction.editReply("Invalid item selection! Use `/shop` to view details.");
        }

        try {
            // =======================================================
            // 2. FETCH POOLS VIA MATRIX WRAPPERS
            // =======================================================
            const amashRow = universalGet("amash", userId);
            const inventoryRow = universalGet("inventory", userId);

            const balance = amashRow?.bucks ?? 0;
            // Dynamically index the item column value from your inventory object representation
            const itemStatus = inventoryRow ? (inventoryRow[item.id] ?? 0) : 0;
            const now = Date.now();

            // 3. Balance Check
            if (balance < item.price) {
                return interaction.editReply(`You need **${item.price} Amash** to buy this, but you only have **${balance}**.`);
            }

            // 4. Ownership / Expiration Constraints
            if (itemCode !== "3") { 
                if (item.isPerm && itemStatus >= 1) {
                    return interaction.editReply(`You already own a **${item.name}**!`);
                }
                if (!item.isPerm && itemStatus > now) {
                    return interaction.editReply(`You already have an active **${item.name}**! Wait for it to expire.`);
                }
            }

            // =======================================================
            // 5. STATE MODIFICATION LAYOUT (DYNAMIC ATTRIBUTES)
            // =======================================================
            let newStatus;
            if (item.id === 'pstone') {
                newStatus = (itemStatus || 0) + 1;
            } else if (item.isPerm) {
                newStatus = 1;
            } else {
                // Dynamically evaluate duration strings from your item config objects if present, or use standard defaults
                const duration = item.duration ?? ((item.id === 'pr_tp') ? (24 * 60 * 60 * 1000) : (12 * 60 * 60 * 1000));
                newStatus = now + duration;
            }

            // Ensure profile lines exist across both tables for fresh user profiles
            if (!amashRow) {
                universalCreate("amash", userId);
            }
            if (!inventoryRow) {
                universalCreate("inventory", userId);
            }

            // =======================================================
            // 6. EXECUTE ATOMIC TRANSACTION MUTATIONS
            // =======================================================
            // Deduct funds from account state balance
            universalSet("amash", userId, {
                bucks: balance - item.price
            });

            // Persist the updated item data to inventory state dynamically
            universalSet("inventory", userId, {
                [item.id]: newStatus
            });

            // 7. Complete Transaction Context Output
            let successDetail = item.id === 'pstone' 
                ? `You now own **${newStatus}** Philosopher's Stones! 💎` 
                : `Successfully bought **${item.name}**.`;

            return interaction.editReply(`💸 **Purchase Successful!** ${successDetail}\nRemaining balance: **${(balance - item.price).toLocaleString()}** Amash.`);

        } catch (err) {
            console.error("Buy Command Error:", err);
            clearCooldown(userId, module.exports);
            return interaction.editReply("An error occurred while processing your purchase.");
        }
    }
};
