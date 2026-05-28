const { EmbedBuilder, SlashCommandBuilder} = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Use this command to receive amash everyday"), 
  category: 'Economy', 
  cooldown: 60,
  async execute(interaction) { 
    const authorId = interaction.user.id;
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
        
        const timeLeft = hrs > 0 ? `${hrs}h ${mins}m` : (mins > 0 ? `${mins}m` : "less than a minute");
        return interaction.editReply(`Be patient! You can claim your daily in **${timeLeft}**.`);
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

      interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Daily Command Error:", err);
      if(interaction.isDeferred){
      interaction.editReply("Something went wrong while claiming your daily reward.");
      } else {
        interaction.reply("Something went wrong while claiming your daily reward.");
      }
    }
  }
}
