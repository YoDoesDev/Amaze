const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'buystocks', 
  description: 'Buy the stocks of a person to get profit from their reputation.', 
  async execute (message, args){
    const targetUser = message.mentions.users.first();
    const amt = isNaN(args[1]) ? 1 : parseInt(args[1]);
    const costPerStock = 70; 
    const totalCost = amt * costPerStock;
    
    
    if (!targetUser) {
        const errMsg2 = new EmbedBuilder().setColor('#E61010').setTitle(`⚠️ Command Error!`).setDescription("Who do you wanna invest in?\n\nSyntax: `!buystocks @user <number>`");
        return message.reply({embeds: [errMsg2]});
    }
    if (amt < 1) {
        const errMsg = new EmbedBuilder().setColor('#E61010').setTitle(`⚠️ Command Error!`).setDescription("Please write a positive number!\n\nSyntax: `!buystocks @user <+ve number>`");
        return message.reply({embeds: [errMsg]});
    }
    if (targetUser.id === message.author.id) return message.reply("You cannot invest in yourself!");

    db.get(`SELECT bucks FROM amash WHERE userid = ?`, [message.author.id], (err, row) => {
      if (err) return console.error(err);
      
      if (!row || row.bucks < totalCost) {
          return message.reply(`You don't have enough Amash! You need **${totalCost}** but you only have **${row ? row.bucks : 0}**.`);
      }

      db.serialize(() => {

        db.run(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`, [totalCost, message.author.id]);

        db.run(`INSERT INTO investments (investor, invested, stocks) VALUES (?, ?, ?)
          ON CONFLICT (investor, invested) DO UPDATE SET stocks = stocks + excluded.stocks`, 
          [message.author.id, targetUser.id, amt], (insErr) => {
            
          if (insErr) {
            console.error(insErr);
            return message.reply("A database error occurred during the transaction.");
          }

          const successMsg = new EmbedBuilder()
            .setColor('#10E647')
            .setTitle('Purchase Successful!')
            .setDescription(`You spent **${totalCost} Amash** to buy **${amt}** stocks of **${targetUser.username}**.\n\nWhen someone vouches them, you'll earn a profit of 5 Amash per stock.`);
          
          message.reply({embeds: [successMsg]});
        });
      });
    });
  }
}
