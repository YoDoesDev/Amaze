const { EmbedBuilder } = require('discord.js');
// 1. FIXED: Matrix wrappers are now used with dual-key logic
const { universalGet, universalSet, universalDelete } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'sellstocks',
    category: 'Stocks', 
    aliases: ['ss'],
    cooldownGroup: "stocks",
    cooldown: 20,
    description: 'Use this to sell your stocks you invested on a person.',
    
    async execute(message, args) {
        const target = message.mentions.users.first();
        const noOfStocksInput = args[1] ? args[1].toString() : "1";
        const now = Date.now();
        const authorId = message.author.id;
        
        if (!target) return message.reply("Whose stocks do you wanna sell?");
        if (target.id === authorId) return message.reply("You can't sell your own stocks!");

        if (noOfStocksInput.toLowerCase() !== 'all' && (isNaN(noOfStocksInput) || parseInt(noOfStocksInput) <= 0)) {
            return message.reply("Please enter a valid whole number or 'all'!");
        }

        try {
            // =======================================================
            // 2. FETCH DATA VIA DUAL-KEY WRAPPERS
            // =======================================================
            const amashRow = universalGet("amash", authorId);
            // FIXED: Passing separate keys to the dual-key wrapper
            const row = universalGet("investments", authorId, target.id);

            if (!row || row.stocks <= 0) {
                return message.reply(`You have not invested in ${target.username}!`);
            }

            const currentBucks = amashRow?.bucks ?? 0;

            // 3. Tax Logic
            const timeHeld = now - row.lastpurchase;
            let tFee;
            let feeLabel;

            if (timeHeld < 1000 * 1800) { // < 30 mins
                tFee = 0.04;
                feeLabel = "4% (Paper Hands)";
            } else if (timeHeld < 1000 * 7200) { // < 2 hours
                tFee = 0.02;
                feeLabel = "2% (Early Exit)";
            } else {
                tFee = 0.01;
                feeLabel = "1% (Market Standard)";
            }

            // 4. Amount Logic
            let numToSell = noOfStocksInput.toLowerCase() === 'all' ? row.stocks : parseInt(noOfStocksInput);
            if (numToSell > row.stocks) return message.reply(`You only have ${row.stocks} stocks!`);

            // 5. Financial Calculations
            const rawProfitForTheseStocks = (row.profit / row.stocks) * numToSell;
            const principalValue = numToSell * 70;
            const grossValue = principalValue + rawProfitForTheseStocks;
            
            const taxAmount = Math.round(grossValue * tFee);
            const finalPayout = Math.round(grossValue - taxAmount);
            const profitLoss = finalPayout - principalValue;

            // =======================================================
            // 6. EXECUTION MATRIX MUTATIONS (DUAL-KEY DISPATCH)
            // =======================================================
            
            if (numToSell >= row.stocks) {
                // FIXED: Passing separate keys to universalDelete
                universalDelete("investments", authorId, target.id);
            } else {
                // FIXED: Passing separate keys to universalSet
                universalSet("investments", authorId, {
                    stocks: row.stocks - numToSell,
                    profit: row.profit - rawProfitForTheseStocks
                }, target.id);
            }

            // Pay the final cash balance
            universalSet("amash", authorId, {
                bucks: currentBucks + finalPayout
            });

            // 7. Response Embed
            const keyword = profitLoss > 0 ? "profit of" : (profitLoss === 0 ? "break-even of" : "loss of");
            const color = profitLoss >= 0 ? '#10E647' : '#E61010';

            const embed = new EmbedBuilder()
                .setTitle(`📊 Stocks Sold!`)
                .setColor(color)
                .setDescription(`Sold **${numToSell}** stocks of **${target.username}**.\n\n` +
                                `**Market Tax:** ${feeLabel}\n` +
                                `**Tax Paid:** -${taxAmount.toLocaleString()} Amash\n` +
                                `**Final Payout:** ${finalPayout.toLocaleString()} Amash\n\n` +
                                `You hit a ${keyword} **${Math.abs(Math.round(profitLoss)).toLocaleString()}** Amash.`)
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("SellStocks Error:", err);
            clearCooldown(message.author.id, module.exports);
            return message.reply("A database error occurred during the sale.");
        }
    }
};
