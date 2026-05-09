const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database.js');

module.exports = {
  name: 'monthly', 
  aliases: ['m'], 
  category: 'Economy', 
  cooldown: 60,
  description: 'Use this command to gain amash every month.', 
  async execute(message) { 
    const authorId = message.author.id;
    const now = Date.now();
    const cooldown = 2592000000; // 30 days in ms

    try {
      // 1. Check current timestamp
      const row = db.prepare(`SELECT mTimestamp FROM amash WHERE userid = ?`).get(authorId);
      
      // 2. Cooldown Logic
      if (row && (now - row.mTimestamp < cooldown)) {
        const remaining = cooldown - (now - row.mTimestamp);
        const days = Math.floor(remaining / 86400000);
        const hrs = Math.floor((remaining % 86400000) / 3600000);
        
        // Logical string building for better UX
        const timeStr = days > 0 
            ? `**${days} days and ${hrs} hours**` 
            : `**${hrs} hours**`;

        return message.reply(`Be patient! You can claim your monthly in ${timeStr}.`);
      }

      // 3. Update or Insert Data
      db.prepare(`
        INSERT INTO amash (userid, bucks, mTimestamp) 
        VALUES (?, ?, ?)
        ON CONFLICT (userid) 
        DO UPDATE SET 
          bucks = bucks + 400,
          mTimestamp = excluded.mTimestamp
      `).run(authorId, 400, now);

      const embed = new EmbedBuilder()
        .setTitle("Amash collected!")
        .setDescription("You receive **400 Amash**! Come back next month!")
        .setColor('#57F287');

      message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Monthly Command Error:", err);
      message.reply("A database error occurred while claiming your monthly reward.");
    }
  }
}
