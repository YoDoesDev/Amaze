const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'amash', 
  category: 'Economy', 
  description: 'Use this command to gain amash everyday.', 
  async execute(message){
    const targetUser = message.mentions.users.first() || message.author
    db.get(`SELECT bucks FROM amash WHERE userid = ?`, [targetUser.id], (err, row) => {
      if (err) return;
      
      if(!row){
        return message.reply("The user doesn't have an amash account. Use `!daily` to open one! ");
        } 
      
      const embed = new EmbedBuilder().setColor('#E6E510').setTitle(`${targetUser.username}'s Balance`).setDescription(`${targetUser.username} has ${row.bucks} Amash.`).setFooter({text: `Requested By: ${message.author.username}`});
      
      message.reply({embeds: [embed]});
      }
    )
  }
}