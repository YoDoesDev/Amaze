const { EmbedBuilder } = require('discord.js')
const { db } = require('../database.js');

module.exports = {
  name: 'repleaderboard', 
  aliases: ['replb', 'rl'], 
  description: 'Shows a leaderboard of members with highest reputation points. ',
  async execute(message){
    db.all(`SELECT *
    FROM reputation
    ORDER BY points DESC 
    LIMIT 10`, (err, rows) => {
      try{
        if(err){
          return;
        }
        
        const leaderboard = rows.map((row, index) => {
        return `${index + 1}. <@!${row.user_id}> — ${row.points} points`;
    }).join('\n');
    
    const embed = new EmbedBuilder().setColor(0x5865F2).setTitle(`Reputation Leaderboard`).setDescription(leaderboard).setFooter({text: `Requested By: ${message.author.tag}`});
    
    message.channel.send({embeds: [embed]})
      } catch (error) {
            console.error(">>> [CRITICAL] Execution crashed:", error);
        }
    })
  }
}
