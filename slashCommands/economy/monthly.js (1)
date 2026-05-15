const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("monthly")
    .setDescription("Use this command to receive 400 amash every month"), 
  category: 'Economy', 
  cooldown: 5, // Internal command cooldown
  async execute(interaction) { 
    const authorId = interaction.user.id;
    const now = Date.now();
    const cooldownTime = 2592000000; // 30 days in milliseconds

    try {
      // 1. Fetch current timestamp from DB
      const row = db.prepare(`SELECT mTimestamp FROM amash WHERE userid = ?`).get(authorId);
      
      // 2. Cooldown Logic
      if (row && row.mTimestamp && (now - row.mTimestamp < cooldownTime)) {
        const remaining = cooldownTime - (now - row.mTimestamp);
        const days = Math.floor(remaining / 86400000);
        const hrs = Math.floor((remaining % 86400000) / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        
        let timeStr;
        if (days > 0) {
          timeStr = `**${days} days and ${hrs} hours**`;
        } else if (hrs > 0) {
          timeStr = `**${hrs} hours and ${mins} minutes**`;
        } else {
          timeStr = `**${mins} minutes**`;
        }

        return interaction.editReply(`Be patient! You can claim your monthly in ${timeStr}.`);
      }

      // 3. Atomic Upsert Logic
      db.prepare(`
        INSERT INTO amash (userid, bucks, mTimestamp) 
        VALUES (?, 400, ?)
        ON CONFLICT (userid) 
        DO UPDATE SET 
          bucks = bucks + 400,
          mTimestamp = excluded.mTimestamp
      `).run(authorId, now);

      const embed = new EmbedBuilder()
        .setTitle("Monthly Amash Collected!")
        .setDescription("You received **400 Amash**! 💰\nCome back in 30 days.")
        .setColor('#57F287')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Monthly Command Error:", err);
      return interaction.editReply("Something went wrong while claiming your monthly reward.");
    }
  }
}
