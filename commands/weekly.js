const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'weekly', 
  category: 'Economy', 
  description: 'Use this command to gain amash every week.', 
  async execute(message){
    const embed = new EmbedBuilder()
      .setTitle("Amash collected!")
      .setDescription("You receive 100 Amash! Come back next week!")
      .setColor('#57F287');
    
    db.get(`SELECT wTimestamp FROM amash WHERE userid = ?`, [message.author.id], (err, row) => {
      if(err) {
        console.log(err);
        return;
      }
      
      const now = Date.now();
      const cooldown = 604800000;
      
      if(row && (now - row.wTimestamp < cooldown)){
        const days = Math.floor((cooldown - (now - row.wTimestamp))/86400000);
        const hrs = Math.floor((cooldown - (now - row.wTimestamp))/3600000);
        return message.reply("Be patient! You can claim your daily in " + days > 1? (days + "days."):(hrs + " hours."));
      }  

      db.run(`INSERT INTO amash (userid, bucks, wTimestamp) 
      VALUES (?, ?, ?)
      ON CONFLICT (userid) 
      DO UPDATE SET bucks = bucks + 100,
      wTimestamp = excluded.wTimestamp
      `, [message.author.id, 100, now], (err) => {
          if (err) return console.log(err);
          message.reply({ embeds: [embed] });
      });
    });
  }
}
