const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');
 
module.exports = {
  name: 'buystocks', 
  aliases: ['bs'], 
  category: 'Economy', 
  description: 'Buy the stocks of a person to get profit from their reputation.', 

  async execute (message, args){
    const targetUser = message.mentions.users.first();
    const amt = isNaN(args[1]) ? 1 : parseInt(args[1]);
    const costPerStock = 70; 
    const totalCost = amt * costPerStock;
    const authorId = message.author.id;
    
    if (!targetUser) {
        const errMsg2 = new EmbedBuilder().setColor('#E61010').setTitle(`⚠️ Command Error!`).setDescription("Who do you wanna invest in?\n\nSyntax: `!buystocks @user <number>`");
        return message.reply({embeds: [errMsg2]});
    }
    if (amt < 1) {
        const errMsg = new EmbedBuilder().setColor('#E61010').setTitle(`⚠️ Command Error!`).setDescription("Please write a positive number!");
        return message.reply({embeds: [errMsg]});
    }
    if (targetUser.id === authorId) return message.reply("You cannot invest in yourself!");

    // 1. Check Balance, Current Total Stocks, and License status
    db.get(
      `SELECT 
        (SELECT bucks FROM amash WHERE userid = ?) as bucks,
        (SELECT SUM(stocks) FROM investments WHERE investor = ?) as total_stocks,
        (SELECT stocklic FROM inventory WHERE userid = ?) as has_license`,
      [authorId, authorId, authorId], 
      (err, row) => {
        if (err) return console.error(err);
        
        const currentBucks = row ? row.bucks : 0;
        const currentTotalStocks = row ? (row.total_stocks || 0) : 0;
        const hasLicense = row ? row.has_license : 0;

        // 2. Stock Limit Logic
        if (!hasLicense && (currentTotalStocks + amt) > 20) {
            return message.reply(`⚠️ **Stock Limit Reached!** Without a **Stock License**, you can only hold a total of **20 stocks**. You currently have **${currentTotalStocks}**. Buy a license in the shop to invest more!`);
        }

        // 3. Balance Check
        if (currentBucks < totalCost) {
            return message.reply(`You don't have enough Amash! You need **${totalCost}** but you only have **${currentBucks}**.`);
        }

        db.serialize(() => {
            db.run(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`, [totalCost, authorId]);

            db.run(`INSERT INTO investments (investor, invested, stocks) VALUES (?, ?, ?)
              ON CONFLICT (investor, invested) DO UPDATE SET stocks = stocks + excluded.stocks`, 
              [authorId, targetUser.id, amt], (insErr) => {
                
              if (insErr) {
                console.error(insErr);
                return message.reply("A database error occurred during the transaction.");
              }

              const successMsg = new EmbedBuilder()
                .setColor('#10E647')
                .setTitle('Purchase Successful!')
                .setDescription(`Spent: **${totalCost} Amash**\nBought: **${amt}** stocks of **${targetUser.username}**.\nTotal Portfolio: **${currentTotalStocks + amt}** stocks.`);
              
              message.reply({embeds: [successMsg]});
            });
        });
      }
    );
  }
}
