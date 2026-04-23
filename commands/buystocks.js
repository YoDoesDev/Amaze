const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'buystocks', 
  description: 'Buy the stocks of a person to get profit from their reputation.', 
  async execute (message, args){
    const targetUser = message.mentions.users.first();
    const amt = isNaN(args[1])? 1 : parseInt(args[1]);
    
    const errMsg = new EmbedBuilder().setColor('#E61010').setTitle(`⚠️ Command Error! `).setDescription("Please write a positive number!\n\nSyntax: `!buystocks @user <+ve number>` ");
    const errMsg2 = new EmbedBuilder().setColor('#E61010').setTitle(`⚠️ Command Error! `).setDescription("Who do you wanna invest in?\n\nSyntax: `!buystocks @user <+ve number>` ");
    
    if(amt < 1){
      message.reply({embeds: [errMsg]});
    } else if (!targetUser){
      message.reply({embeds: [errMsg2]});
    } else{
      db.run(`INSERT INTO investments (investor, invested, stocks) VALUES (?, ?, ?)
      ON CONFLICT (investor, invested) DO UPDATE SET stocks = stocks + (excluded.stocks)`, [message.author.id, targetUser.id, amt], (err) => {
        if (err){
          console.error(err);
          return message.reply("A database error occurred.");
        } else{
          const successMsg = new EmbedBuilder().setColor('#10E647').setTitle('Purchase Successful!').setDescription(`You have bought ${amt} stocks of ${targetUser.username}. \n \n When someone vouches them, you'll earn a profit of 5 Amash per stock.`);
      
      message.reply({embeds: [successMsg]});
        }
      } 
      );
    }
  }
}
