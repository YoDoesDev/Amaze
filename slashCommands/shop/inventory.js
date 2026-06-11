const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { universalGet } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Check the items and active boosters you have bought"),
  category: 'Shop', 
  cooldown: 30,

  async execute(interaction) { 
    const authorId = interaction.user.id;
    const now = Date.now();

    try {
      // 1. Fetch user row from DB
      const row = universalGet("inventory", authorId);

      // 2. Empty Check
      if (!row) {
        return interaction.editReply("Your inventory is empty! Use `/shop` to browse items.");
      } 

      // 3. User Avatar URL
      const url = interaction.user.displayAvatarURL({ dynamic: true, size: 1024 });
      
      // 4. Expiration Status Logic
      const pr = (row?.pr_tp ?? 0) > now ? "🟢 ON" : "🔴 OFF";
      const dblv = (row?.dblv_tp ?? 0) > now ? "🟢 ON" : "🔴 OFF";
      const ddbl = (row?.ddbl_tp ?? 0) > now ? "🟢 ON" : "🔴 OFF";
      const pstone = row?.pstone ?? 0;
      const lic = (row?.stocklic ?? 0) >= 1 ? '✅ ACQUIRED' : '❌ NOT ACQUIRED';
      
      const msg = `1. 🛡️ **PR Shield:** ${pr}\n2. ⏭️ **Vouch Doubler:** ${dblv}\n3. ↘️ **Defame Doubler:** ${ddbl}\n4. 💎 **Philosopher's Stone:** ${pstone}\n5. 📃 **Stock License:** ${lic}`;
      
      // 5. Build Embed
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Inventory`)
        .setThumbnail(url)
        .setDescription(msg)
        .setTimestamp()
        .setColor('#3A70DC');
      
      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Inventory Error:", err);
      // Clean up internal command cooldown if it fails
      clearCooldown(authorId, module.exports);
      return interaction.editReply("A database error occurred while checking your inventory.");
    }
  }
};
