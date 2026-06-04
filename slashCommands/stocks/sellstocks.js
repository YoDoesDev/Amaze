 const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { universalGet, universalSet, universalDelete, universalCreate } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sellstocks")
        .setDescription("Sell your stock investments on a specific user")
        .addUserOption(option => 
            option.setName("target")
                .setDescription("The user whose stocks you want to sell")
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName("amount")
                .setDescription("Number of stocks to sell, or type 'all'")
                .setRequired(false)
        ),
    category: 'Stocks', 
    cooldown: 20,

    async execute(interaction) {
        const target = interaction.options.getUser("target");
        const noOfStocksInput = interaction.options.getString("amount") || "1";
        const now = Date.now();
        const authorId = interaction.user.id;
        
        // 1. Initial Input Validations
        if (target.id === authorId) {
            return interaction.editReply("You can't sell your own stocks!");
        }

        if (noOfStocksInput.toLowerCase() !== 'all' && (isNaN(noOfStocksInput) || parseInt(noOfStocksInput) <= 0 || !Number.isInteger(Number(noOfStocksInput)))) {
            return interaction.editReply("Please enter a valid whole number or 'all'!");
        }

        try {
            // =======================================================
            // 2. FETCH INVESTMENT & ACCOUNT DATA VIA MATRIX WRAPPERS
            // =======================================================
            const amashRow = universalGet("amash", authorId);
            
            // Reconstruct the unique compound investment matrix tracking key
            const investmentKey = `${authorId}_${target.id}`;
            const investmentRow = universalGet("investments", investmentKey);

            const ownedStocks = investmentRow?.stocks ?? 0;
            const currentProfit = investmentRow?.profit ?? 0;
            const lastPurchaseTime = investmentRow?.lastpurchase ?? 0;
            const currentBucks = amashRow?.bucks ?? 0;

            if (!investmentRow || ownedStocks <= 0) {
                return interaction.editReply(`You have not invested in **${target.username}**!`);
            }

            // 3. Tax Logic (Time-based fee distribution)
            const timeHeld = now - lastPurchaseTime;
            let tFee;
            let feeLabel;

            if (timeHeld < 1000 * 1800) { // < 30 mins
                tFee = 0.04;
                feeLabel = "4% (Paper Hands ❌)";
            } else if (timeHeld < 1000 * 7200) { // < 2 hours
                tFee = 0.02;
                feeLabel = "2% (Early Exit ⏳)";
            } else {
                tFee = 0.01;
                feeLabel = "1% (Market Standard ⚖️)";
            }

            // 4. Position Volume Allocation
            let numToSell = noOfStocksInput.toLowerCase() === 'all' ? ownedStocks : parseInt(noOfStocksInput);
            if (numToSell > ownedStocks) {
                return interaction.editReply(`You only have **${ownedStocks}** stocks!`);
            }

            // 5. Financial Calculations
            const rawProfitForTheseStocks = (currentProfit / ownedStocks) * numToSell;
            const principalValue = numToSell * 70;
            const grossValue = principalValue + rawProfitForTheseStocks;
            
            const taxAmount = Math.round(grossValue * tFee);
            const finalPayout = Math.round(grossValue - taxAmount);
            const profitLoss = finalPayout - principalValue;

            // =======================================================
            // 6. EXECUTE TRANSACTION MUTATIONS (MATRIX DISPATCH)
            // =======================================================
            
            // Cleanly cascade storage state maps based on remaining ownership holdings
            if (numToSell >= ownedStocks) {
                universalDelete("investments", investmentKey);
            } else {
                universalSet("investments", investmentKey, {
                    stocks: ownedStocks - numToSell,
                    profit: currentProfit - rawProfitForTheseStocks
                });
            }

            // Ensure profile lines exist before sending back funds
            if (!amashRow) {
                universalCreate("amash", authorId);
            }

            // Pay the final cash balance into the player's account map state
            universalSet("amash", authorId, {
                bucks: currentBucks + finalPayout
            });

            // 7. Response Embed Layout Assembly
            const keyword = profitLoss > 0 ? "profit of" : (profitLoss === 0 ? "break-even of" : "loss of");
            const color = profitLoss >= 0 ? '#10E647' : '#E61010';

            const embed = new EmbedBuilder()
                .setTitle(`📊 Stocks Sold!`)
                .setColor(color)
                .setDescription(`Sold **${numToSell}** stocks of **${target.username}**.\n\n` +
                                `**Market Tax:** \`${feeLabel}\`\n` +
                                `**Tax Paid:** \`-${taxAmount.toLocaleString()}\` Amash\n` +
                                `**Final Payout:** \`${finalPayout.toLocaleString()}\` Amash\n\n` +
                                `You hit a ${keyword} **${Math.abs(Math.round(profitLoss)).toLocaleString()}** Amash.`)
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("SellStocks Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred during the sale.");
        }
    }
};
