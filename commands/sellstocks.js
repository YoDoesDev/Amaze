const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
    name: 'sellstocks',
    category: 'Economy', 
    aliases: ['ss'],
    cooldownGroup: "stocks",
    cooldown: 180,
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
            // 1. Fetch Investment Data
            const row = db.prepare(`SELECT stocks, profit, lastpurchase FROM investments WHERE invested = ? AND investor = ?`)
                          .get(target.id, authorId);

            if (!row || row.stocks <= 0) {
                return message.reply(`You have not invested in ${target.username}!`);
            }

            // 2. Tax Logic (Time-based fees)
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

            // 3. Amount Logic
            let numToSell = noOfStocksInput.toLowerCase() === 'all' ? row.stocks : parseInt(noOfStocksInput);
            if (numToSell > row.stocks) return message.reply(`You only have ${row.stocks} stocks!`);

            // 4. Financial Calculations
            const rawProfitForTheseStocks = (row.profit / row.stocks) * numToSell;
            const principalValue = numToSell * 70;
            const grossValue = principalValue + rawProfitForTheseStocks;
            
            const taxAmount = Math.round(grossValue * tFee);
            const finalPayout = Math.round(grossValue - taxAmount);
            const profitLoss = finalPayout - principalValue;

            // 5. Atomic Database Updates
            if (numToSell >= row.stocks) {
                db.prepare(`DELETE FROM investments WHERE investor = ? AND invested = ?`).run(authorId, target.id);
            } else {
                db.prepare(`UPDATE investments SET stocks = stocks - ?, profit = profit - ? WHERE investor = ? AND invested = ?`)
                  .run(numToSell, rawProfitForTheseStocks, authorId, target.id);
            }

            // Add the money to balance
            db.prepare(`UPDATE amash SET bucks = bucks + ? WHERE userid = ?`).run(finalPayout, authorId);

            // 6. Response Embed
            const keyword = profitLoss > 0 ? "profit of" : (profitLoss === 0 ? "break-even of" : "loss of");
            const color = profitLoss >= 0 ? '#10E647' : '#E61010';

            const embed = new EmbedBuilder()
                .setTitle(`📊 Stocks Sold!`)
                .setColor(color)
                .setDescription(`Sold **${numToSell}** stocks of **${target.username}**.\n\n` +
                                `**Market Tax:** ${feeLabel}\n` +
                                `**Tax Paid:** -${taxAmount} Amash\n` +
                                `**Final Payout:** ${finalPayout} Amash\n\n` +
                                `You hit a ${keyword} **${Math.abs(Math.round(profitLoss))}** Amash.`)
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("SellStocks Error:", err);
            return message.reply("A database error occurred during the sale.");
        }
    }
};
