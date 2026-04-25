const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'portfolio', 
  aliases: ['port', 'pf'], 
  category: 'Economy', 
  description: 'Shows a list of stocks you/others have bought\n\nSyntax: `!portfolio [@user]`\n<> = REQUIRED [] = OPTIONAL\n\n Aliases: !port, !pf', 
  async execute(message){
    const target = message.mentions.users.first() || message.author;
    db.all(`SELECT invested, stocks, profit FROM investments WHERE investor = ?`, [target.id], (err, rows) => {
      if (err){
        console.log(err);
        return message.reply("A Database Error Occured!");
      }
      if(rows.length == 0){
        return message.reply("You have not bought any stocks yet!");
      }
      
      const list = rows.map((row, index) => {
        return `**${index + 1}.** Invested in <@${row.invested}>: **${row.stocks}** stocks (${row.profit} profit)`;
    }).join('\n');
      
      let embed = new EmbedBuilder().setColor('#E8AE1B').setTitle(`${target.username}'s portfolio`).setDescription(list).setFooter({text: `Requested By: ${message.author.username}.`}).setTimestamp();
      
      return message.reply({embeds: [embed]})
    })
  }
}
