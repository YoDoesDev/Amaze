const { EmbedBuilder } = require('discord.js')
const { db } = require('../database.js');

module.exports = {
  name: 'repleaderboard', 
  category: 'Reputation', 
  aliases: ['replb', 'rl'], 
  description: 'Shows a leaderboard of members with highest reputation points. \n\nAliases: !replb, !rl',
  async execute(message){
    db.all(`SELECT *
    FROM reputation
    ORDER BY points DESC 
    LIMIT 10`, (err, rows) => {
      try{
        if(err){
          return;
        }
        
        const gleaderboard = rows.length
          ? rows.map((row, index) => {
            return `${index + 1}. <@!${row.user_id}> — ${row.points} points`;
          }).join('\n')
          : 'No data found.';



          
    
    const embed = new EmbedBuilder().setColor(0x5865F2).setTitle(`Reputation Leaderboard`).setDescription(gleaderboard).setFooter({text: `Requested By: ${message.author.tag}`});
    
    message.channel.send({embeds: [embed]})
      } catch (error) {
            console.error(">>> [CRITICAL] Execution crashed:", error);
        }
    })
  }
}
