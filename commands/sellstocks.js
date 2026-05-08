const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');
const { cooldown } = require('./ping.js');

module.exports = {
    name: 'sellstocks',
    category: 'Economy', 
    aliases: ['ss'],
    cooldownGroup: "stocks",
    cooldown: 180,
    description: 'Use this to sell your stocks you invested on a person \n\n Syntax: `!sellstocks <@user> <no_of_stocks>`\nAlias: !ss',
    
    async execute(message, args) {
        const target = message.mentions.users.first();
        const noOfStocksInput = args[1] ? args[1].toString() : "1";
        const now = message.createdTimestamp;
        
        if (!target) return message.reply("Whose stocks do you wanna sell?");
        if (target.id === message.author.id) return message.reply("You can't sell your own stocks!");

        if (noOfStocksInput.toLowerCase() !== 'all' && (isNaN(noOfStocksInput) || noOfStocksInput <= 0)) {
            return message.reply("Please enter a valid whole number or 'all'!");
        }

        db.get(`SELECT stocks, profit, lastpurchase FROM investments WHERE invested = ? AND investor = ?`, [target.id, message.author.id], (err, row) => {
            if (err) return message.reply("A Database Error Occurred!");
            if (!row || row.stocks <= 0) return message.reply(`You have not invested in ${target.username}!`);

            // 1. VARIABLE FIX: Access lastpurchase from row
            const timeHeld = now - row.lastpurchase;
            let tFee;
            let feeLabel;

            if (timeHeld < 1000 * 1800) { // 30 mins
                tFee = 0.04;
                feeLabel = "7% (Paper Hands)";
            } else if (timeHeld < 1000 * 7200) { // 2 hours
                tFee = 0.02;
                feeLabel = "3% (Early Exit)";
            } else {
                tFee = 0.01;
                feeLabel = "1% (Market Standard)";
            }

            let numToSell = noOfStocksInput.toLowerCase() === 'all' ? row.stocks : parseInt(noOfStocksInput);
            if (numToSell > row.stocks) return message.reply(`You only have ${row.stocks} stocks!`);

            // 2. MATH FIX: Calculate raw value and apply tax
            const rawProfitForTheseStocks = (row.profit / row.stocks) * numToSell;
            const principalValue = numToSell * 70;
            const grossValue = principalValue + rawProfitForTheseStocks;
            
            const taxAmount = Math.round(grossValue * tFee);
            const finalPayout = Math.round(grossValue - taxAmount);
            
            // This 'pft' is what we add to their balance after the principal 70*num is accounted for
            // Simplest way: Add finalPayout directly to balance.
            
            const handlerFunc = (err) => {
                if (err) return message.reply("A Database Error Occurred!");
                
                db.run(`UPDATE amash SET bucks = bucks + ? WHERE userid = ?`, [finalPayout, message.author.id], (err) => {
                    if (err) return message.reply("A Database Error Occurred.");
                    
                    const profitLoss = finalPayout - principalValue;
                    const keyword = profitLoss > 0 ? "profit of" : (profitLoss === 0 ? "break-even of" : "loss of");
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`📊 Stocks Sold!`)
                        .setColor(profitLoss >= 0 ? '#10E647' : '#E61010')
                        .setDescription(`Sold **${numToSell}** stocks of **${target.username}**.\n\n` +
                                        `**Market Tax:** ${feeLabel}\n` +
                                        `**Tax Paid:** -${taxAmount} Amash\n` +
                                        `**Final Payout:** ${finalPayout} Amash\n\n` +
                                        `You hit a ${keyword} **${Math.abs(Math.round(profitLoss))}** Amash.`)
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                });
            };

            if (numToSell >= row.stocks) {
                db.run(`DELETE FROM investments WHERE investor = ? AND invested = ?`, [message.author.id, target.id], handlerFunc);
            } else {
                db.run(`UPDATE investments SET stocks = stocks - ?, profit = profit - ? WHERE investor = ? AND invested = ?`, 
                [numToSell, rawProfitForTheseStocks, message.author.id, target.id], handlerFunc);
            }
        });
    }
};
