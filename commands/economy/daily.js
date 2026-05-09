const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database.js');

module.exports = {
  name: 'daily', 
  aliases: ['d'], 
  category: 'Economy', 
  description: 'Use this command to gain amash everyday.', 
  cooldown: 60,
  async execute(message) { 
    const authorId = message.author.id;
    const now = Date.now();
    const cooldown = 86400000; // 24 hours in ms

    try {
      // 1. Check current timestamp
      const row = db.prepare(`SELECT dTimestamp FROM amash WHERE userid = ?`).get(authorId);
      
      // 2. Cooldown Logic
      if (row && (now - row.dTimestamp < cooldown)) {
        const remaining = cooldown - (now - row.dTimestamp);
        const hrs = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        
        return message.reply(`Be patient! You can claim your daily in **${hrs} hours and ${mins} minutes**.`);
      }

      // 3. Update or Insert Data
      // Since it's synchronous, this runs exactly when the check passes
      db.prepare(`
        INSERT INTO amash (userid, bucks, dTimestamp) 
        VALUES (?, ?, ?)
        ON CONFLICT (userid) 
        DO UPDATE SET 
          bucks = bucks + 40,
          dTimestamp = excluded.dTimestamp
      `).run(authorId, 40, now);

      const embed = new EmbedBuilder()
        .setTitle("Amash collected!")
        .setDescription("You receive **40 Amash**! Come back tomorrow!")
        .setColor('#57F287');

      message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Daily Command Error:", err);
      message.reply("Something went wrong while claiming your daily reward.");
    }
  }
}
