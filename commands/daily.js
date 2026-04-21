const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'daily', 
  description: 'Use this command to gain amash everyday.', 
  async execute(message){
    const embed = new EmbedBuilder()
      .setTitle("Amash collected!")
      .setDescription("You receive 40 Amash! Come back tomorrow again!")
      .setColor('#57F287');
    
    db.get(`SELECT dTimestamp FROM amash WHERE userid = ?`, [message.author.id], (err, row) => {
      if(err) {
        console.log(err);
        return;
      }
      
      const now = Date.now();
      const cooldown = 86400000;
      
      if(row && (now - row.dTimestamp < cooldown)){
        const hrs = Math.floor((cooldown - (now - row.dTimestamp))/3600000);
        return message.reply("Be patient! You can claim your daily in " + hrs + " hours.");
      }  

      db.run(`INSERT INTO amash (userid, bucks, dTimestamp) 
      VALUES (?, ?, ?)
      ON CONFLICT (userid) 
      DO UPDATE SET bucks = bucks + 40,
      dTimestamp = excluded.dTimestamp
      `, [message.author.id, 40, now], (err) => {
          if (err) return console.log(err);
          message.reply({ embeds: [embed] });
      });
    });
  }
}
