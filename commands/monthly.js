const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'monthly', 
  aliases: ['m'], 
  category: 'Economy', 
  description: 'Use this command to gain amash every month.\n\nAlias: !m', 
  async execute(message){
    const embed = new EmbedBuilder()
      .setTitle("Amash collected!")
      .setDescription("You receive 400 Amash! Come back next month!")
      .setColor('#57F287');
    
    db.get(`SELECT mTimestamp FROM amash WHERE userid = ?`, [message.author.id], (err, row) => {
      if(err) {
        console.log(err);
        return;
      }
      
      const now = Date.now();
      const cooldown = 2592000000;
      
      if(row && (now - row.mTimestamp < cooldown)){
        const days = Math.floor((cooldown - (now - row.mTimestamp))/86400000);
        const hrs = Math.floor((cooldown - (now - row.mTimestamp))/3600000);
          const end = days > 1? (days + " days."):(hrs + " hours.");
        return message.reply("Be patient! You can claim your monthly in " + end);
      }  

      db.run(`INSERT INTO amash (userid, bucks, mTimestamp) 
      VALUES (?, ?, ?)
      ON CONFLICT (userid) 
      DO UPDATE SET bucks = bucks + 400,
      mTimestamp = excluded.mTimestamp
      `, [message.author.id, 400, now], (err) => {
          if (err) return console.log(err);
          message.reply({ embeds: [embed] });
      });
    });
  }
}
