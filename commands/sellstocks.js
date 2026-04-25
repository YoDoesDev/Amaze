const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
    name: 'sellstocks',
    category: 'Economy', 
    aliases: ['ss'],
    description: 'Use this to sell your stocks you invested on a person \n\n Syntax: `!sellstocks <@user> <no_of_stocks>`\nAlias: !ss',
    
    async execute(message, args) {
        const target = message.mentions.users.first();
        const noOfStocks = args[1] ? args[1].toString() : "1";
        let num, pft;
        
        if (!target) {
            return message.reply("Whose stocks do you wanna sell?");
        }
        if (target.id === message.author.id) {
            return message.reply("You can't sell your own stocks!");
        }
        if (noOfStocks.toLowerCase() !== 'all' && (isNaN(noOfStocks) || noOfStocks % 1 !== 0 || noOfStocks <= 0)) {
            return message.reply("Please enter a valid whole number or 'all'!");
        }

        // We define the handler function inside execute so it can access 'num', 'pft', and 'target'
        const handlerFunc = (err) => {
            if (err) {
                console.log(err);
                return message.reply("A Database Error Occured!");
            }
            
            db.run(`UPDATE amash SET bucks = bucks + ? + 70 * ? WHERE userid = ?`, [pft, num, message.author.id], (err) => {
                if (err) {
                    console.log(err);
                    return message.reply("A Database Error Occured.");
                }
                
                const keyword = pft > 0 ? "received a profit of" : (pft == 0 ? "received" : "hit by a loss of");
                
                const embed = new EmbedBuilder()
                    .setTitle(`Stocks Sold!`)
                    .setDescription(`You have sold ${num} stocks of ${target.username} and ${keyword} ${Math.round(Math.abs(pft))}`)
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            });
        };
        
        db.get(`SELECT stocks, profit FROM investments WHERE invested = ? AND investor = ?`, [target.id, message.author.id], (err, row) => {
            if (err) {
                console.log(err);
                return message.reply("A Database Error Occured!");
            }
            if (!row || row.stocks <= 0) {
                return message.reply(`You have not yet invested on ${target.username}!`);
            }
            
            if (noOfStocks.toLowerCase() === 'all') {
                num = parseInt(row.stocks);
                pft = row.profit;
            } else {
                num = parseInt(noOfStocks);
                if (num > row.stocks) {
                    return message.reply(`You only have ${row.stocks} stocks!`);
                }
                pft = (row.profit / row.stocks) * num;
            }
            
            // Logic to DELETE if selling everything, otherwise UPDATE
            if (num >= row.stocks) {
                db.run(`DELETE FROM investments WHERE investor = ? AND invested = ?`, [message.author.id, target.id], handlerFunc);
            } else {
                db.run(`UPDATE investments SET stocks = stocks - ?, profit = profit - ? WHERE investor = ? AND invested = ?`, [num, pft, message.author.id, target.id], handlerFunc);
            }
        });
    }
};