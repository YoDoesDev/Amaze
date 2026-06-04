const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("buystocks")
        .setDescription("Buy a user's stocks to generate income from their reputation shifts")
        .addUserOption(option => 
            option.setName("target")
                .setDescription("The user whose market shares you want to purchase")
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName("amount")
                .setDescription("Number of stocks to buy (Defaults to 1)")
                .setRequired(false)
                .setMinValue(1)
        ),
    category: 'Stocks',
    cooldown: 20,

    async execute(interaction) { 
        const targetUser = interaction.options.getUser("target");
        const amt = interaction.options.getInteger("amount") || 1;
        const costPerStock = 70;
        const totalCost = amt * costPerStock;
        const authorId = interaction.user.id;
        const now = interaction.createdTimestamp;

        // 1. Core Constraint Validations
        if (targetUser.id === authorId) {
            return interaction.editReply("You cannot invest in yourself!");
        }

        try {
            // 2. Fetch Portfolio Capacity and Cash States in one travel cycle
            const row = db.prepare(`
                SELECT 
                    (SELECT bucks FROM amash WHERE userid = ?) as bucks,
                    (SELECT SUM(stocks) FROM investments WHERE investor = ?) as total_stocks,
                    (SELECT stocklic FROM inventory WHERE userid = ?) as has_license
            `).get(authorId, authorId, authorId);

            const currentBucks = row?.bucks ?? 0;
            const currentTotalStocks = row?.total_stocks ?? 0;
            const hasLicense = row?.has_license ?? 0;

            // 3. Portfolio Capacity License Logic Check
            if (!hasLicense && (currentTotalStocks + amt) > 20) {
                return interaction.editReply(`⚠️ **Stock Limit Reached!** Without a **Stock License**, you can only hold a total of **20 stocks**. You currently have **${currentTotalStocks}**. Buy a license in the `/shop` to expand your ceiling!`);
            }

            // 4. Liquidity / Funding Sufficiency Check
            if (currentBucks < totalCost) {
                return interaction.editReply(`You don't have enough Amash! You need **${totalCost}** but you only have **${currentBucks}**.`);
            }

            // 5. Sequential Database Mutations
            db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(totalCost, authorId);

            db.prepare(`
                INSERT INTO investments (investor, invested, stocks, lastpurchase) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT (investor, invested) 
                DO UPDATE SET stocks = stocks + excluded.stocks, lastpurchase = excluded.lastpurchase
            `).run(authorId, targetUser.id, amt, now);

            // 6. Success Output Manifest Construction
            const successMsg = new EmbedBuilder()
                .setColor('#10E647')
                .setTitle('Purchase Successful! 📈')
                .setDescription(`Spent: **${totalCost} Amash**\nBought: **${amt}** stocks of **${targetUser.username}**.\nTotal Portfolio: **${currentTotalStocks + amt}** stocks.\n\n**Market Stability Fees (Exit Tax):**\n🕒 < 30 mins: \`4% fee\`\n🕒 < 2 hrs: \`2% fee\`\n🕒 > 2 hrs: \`1% fee\`\n\n**NOTE**: The exit timer resets every single time you scale your position on this person.`);

            return interaction.editReply({ embeds: [successMsg] });

        } catch (err) {
            console.error("BuyStocks Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred during the transaction.");
        }
    }
}
