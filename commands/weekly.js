const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'weekly', 
  aliases: ['wk'], 
  category: 'Economy', 
  cooldown: 60,
  description: 'Use this command to gain amash every week.', 
  async execute(message) {
    const authorId = message.author.id;
    const now = Date.now();
    const cooldown = 604800000; // 7 days in ms

    try {
      // 1. Check current timestamp
      const row = db.prepare(`SELECT wTimestamp FROM amash WHERE userid = ?`).get(authorId);
      
      // 2. Cooldown Logic
      if (row && (now - row.wTimestamp < cooldown)) {
        const remaining = cooldown - (now - row.wTimestamp);
        const days = Math.floor(remaining / 86400000);
        const hrs = Math.floor((remaining % 86400000) / 3600000);
        
        // Logical display: "X days and Y hours" or just "Y hours"
        const timeStr = days > 0 
            ? `**${days} days and ${hrs} hours**` 
            : `**${hrs} hours**`;

        return message.reply(`Be patient! You can claim your weekly in ${timeStr}.`);
      }

      // 3. Atomic Update
      db.prepare(`
        INSERT INTO amash (userid, bucks, wTimestamp) 
        VALUES (?, ?, ?)
        ON CONFLICT (userid) 
        DO UPDATE SET 
          bucks = bucks + 100,
          wTimestamp = excluded.wTimestamp
      `).run(authorId, 100, now);

      const embed = new EmbedBuilder()
        .setTitle("Amash collected!")
        .setDescription("You receive **100 Amash**! Come back next week!")
        .setColor('#57F287');

      await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Weekly Command Error:", err);
      message.reply("A database error occurred while claiming your weekly reward.");
    }
  }
}
