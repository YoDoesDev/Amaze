const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("Receive your weekly allowance of 100 amash"), 
  category: 'Economy', 
  cooldown: 5, 
  async execute(interaction) { 
    const authorId = interaction.user.id;
    const now = Date.now();
    const cooldownTime = 604800000; // 7 days in milliseconds

    try {
      // 1. Fetch timestamp
      const row = db.prepare(`SELECT wTimestamp FROM amash WHERE userid = ?`).get(authorId);
      
      // 2. Cooldown Logic
      if (row && row.wTimestamp && (now - row.wTimestamp < cooldownTime)) {
        const remaining = cooldownTime - (now - row.wTimestamp);
        const days = Math.floor(remaining / 86400000);
        const hrs = Math.floor((remaining % 86400000) / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        
        let timeStr;
        if (days > 0) {
          timeStr = `**${days}d and ${hrs}h**`;
        } else if (hrs > 0) {
          timeStr = `**${hrs}h and ${mins}m**`;
        } else {
          timeStr = `**${mins}m**`;
        }

        return interaction.editReply(`Be patient! Your weekly reward is available in ${timeStr}.`);
      }

      // 3. Upsert Logic
      db.prepare(`
        INSERT INTO amash (userid, bucks, wTimestamp) 
        VALUES (?, 100, ?)
        ON CONFLICT (userid) 
        DO UPDATE SET 
          bucks = bucks + 100,
          wTimestamp = excluded.wTimestamp
      `).run(authorId, now);

      const embed = new EmbedBuilder()
        .setTitle("Weekly Reward Claimed!")
        .setDescription("You received **100 Amash**! 💰\nSee you again in 7 days.")
        .setColor('#57F287')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Weekly Command Error:", err);
      return interaction.editReply("Something went wrong while claiming your weekly reward.");
    }
  }
}
