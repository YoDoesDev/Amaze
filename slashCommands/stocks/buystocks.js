 const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// 1. FIXED: Supplied distinct dual-keys to the matrix wrappers where requested
const { universalGet, universalSet, universalCreate, db } = require('../../utils/database.js');
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
            // =======================================================
            // 2. FETCH POOLS VIA MATRIX WRAPPERS & TARGETED AGGREGATE
            // =======================================================
            const amashRow = universalGet("amash", authorId);
            const inventoryRow = universalGet("inventory", authorId);
            
            // FIXED: Passing investor and invested IDs as individual arguments
            const investmentRow = universalGet("investments", authorId, targetUser.id);

            // HIGH PERFORMANCE: Let SQLite run a rapid index lookup for the portfolio sum
            const sumRow = db.prepare(`SELECT SUM(stocks) as total_stocks FROM investments WHERE investor = ?`).get(authorId);

            const currentBucks = amashRow?.bucks ?? 0;
            const hasLicense = inventoryRow?.stocklic ?? 0;
            const currentTotalStocks = sumRow?.total_stocks ?? 0;
            const currentPositionStocks = investmentRow?.stocks ?? 0;

            // 3. Portfolio Capacity License Logic Check
            if (!hasLicense && (currentTotalStocks + amt) > 20) {
                return interaction.editReply(`⚠️ **Stock Limit Reached!** Without a **Stock License**, you can only hold a total of **20 stocks**. You currently have **${currentTotalStocks}**. Buy a license in the \`/shop\` to expand your ceiling!`);
            }

            // 4. Liquidity / Funding Sufficiency Check
            if (currentBucks < totalCost) {
                return interaction.editReply(`You don't have enough Amash! You need **${totalCost.toLocaleString()}** but you only have **${currentBucks.toLocaleString()}**.`);
            }

            // =======================================================
            // 5. EXECUTE ATOMIC TRANSACTION MUTATIONS (MATRIX WRAPPERS)
            // =======================================================
            
            // Deduct purchase cost from buyer account
            universalSet("amash", authorId, {
                bucks: currentBucks - totalCost
            });

            // FIXED: Passing separate conditional arguments for table mapping instantiation
            if (!investmentRow) {
                universalCreate("investments", authorId, targetUser.id);
            }

            // FIXED: Passed dual key references cleanly into universalSet mutation parameters
            universalSet("investments", authorId, targetUser.id, {
                investor: authorId,
                invested: targetUser.id,
                stocks: currentPositionStocks + amt,
                lastpurchase: now
            });

            // 6. Success Output Manifest Construction
            const successMsg = new EmbedBuilder()
                .setColor('#10E647')
                .setTitle('Purchase Successful! 📈')
                .setDescription(`Spent: **${totalCost.toLocaleString()} Amash**\nBought: **${amt}** stocks of **${targetUser.username}**.\nTotal Portfolio: **${currentTotalStocks + amt}** stocks.\n\n**Market Stability Fees (Exit Tax):**\n🕒 < 30 mins: \`4% fee\`\n🕒 < 2 hrs: \`2% fee\`\n🕒 > 2 hrs: \`1% fee\`\n\n**NOTE**: The exit timer resets every single time you scale your position on this person.`)
                .setTimestamp();

            return interaction.editReply({ embeds: [successMsg] });

        } catch (err) {
            console.error("BuyStocks Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred during the transaction.");
        }
    }
};
