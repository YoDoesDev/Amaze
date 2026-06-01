const { EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
  name: 'inventory', 
  category: 'Shop', 
  aliases: ['inv'], 
  description: 'Use this to check what you have bought.', 
  cooldown: 30,
  async execute(message) { 
    const authorId = message.author.id;
    const now = Date.now(); // Using Date.now() for consistency with your timestamps

    try {
      // 1. Fetch the entire row
      const row = db.prepare(`SELECT * FROM inventory WHERE userid = ?`).get(authorId);

      // 2. Empty Check
      if (!row) {
        return message.reply("Your inventory is empty! Use the shop to buy items.");
      } 

      const url = message.author.displayAvatarURL({ 
          extension: 'png', 
          size: 1024, 
          forceStatic: false
      });
      
      // 3. Status Logic
      // Check if current time is less than the stored expiry timestamp
      const pr = row.pr_tp > now ? "🟢 ON" : "🔴 OFF";
      const ddbl = row.ddbl_tp > now ? "🟢 ON" : "🔴 OFF";
      const dblv = row.dblv_tp > now ? "🟢 ON" : "🔴 OFF";
      const pstone = row.pstone ?? 0;
      const lic = row.stocklic >= 1 ? '✅ ACQUIRED' : '❌ NOT ACQUIRED';
      
      const msg = `1. 🛡 **PR Shield:** ${pr}\n2. ⏭️ **Vouch Doubler:** ${dblv}\n3. ↘️ **Defame Doubler:** ${ddbl}\n4. 💎 **Philosopher's Stone:** ${pstone}\n5. 📃 **Stock License:** ${lic}`;
      
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Inventory`)
        .setThumbnail(url)
        .setDescription(msg)
        .setTimestamp()
        .setColor('#3A70DC');
      
      return message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Inventory Error:", err);
      clearCooldown(message.author.id, module.exports);
      return message.reply("A database error occurred while checking your inventory.");
    }
  }
};
