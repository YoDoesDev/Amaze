const { items } = require('./shop.js');
const { EmbedBuilder } = require('discord.js');
const { universalGet, universalSet } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
  name: "sell", 
  description: `Sell Philosopher's Stone for Amash\nSyntax: \`!sell [amount]\`\n\n[] = OPTIONAL`,
  category: "Shop", 
  cooldown: 10,
  async execute(message, args){
    const amt = parseInt(args[0]) || 1;
    const author = message.author;
    
    // 1. Validation
    if(isNaN(amt) || amt % 1 > 0 || amt <= 0){
      return message.reply("Please enter a valid amount of Philosopher's Stones you wanna sell.");
    }
    
    try {
      // 2. Fetch inventory and amash balance using matrix wrappers
      const invRow = universalGet("inventory", author.id);
      const amashRow = universalGet("amash", author.id);

      const currentStones = invRow?.pstone ?? 0;
      const currentBucks = amashRow?.bucks ?? 0;
      
      // 3. Asset Availability Check
      if (currentStones < amt) {
        return message.reply(`You don't have enough Stones to sell them! You have only **${currentStones}** Philosopher's Stone(s).`);
      }
      
      const payout = 45000 * amt;

      // 4. Execution Matrix Mutations (Sequential & Safe)
      // Deduct from inventory
      universalSet("inventory", author.id, {
        pstone: currentStones - amt
      });

      // Add to amash balance
      universalSet("amash", author.id, {
        bucks: currentBucks + payout
      });
      
      // 5. Build and Send Success Embed
      const embed = new EmbedBuilder()
        .setTitle("💎 Stones Sold!")
        .setDescription(`<@${author.id}>, you have sold **${amt}** Philosopher's Stone(s) and received **${payout.toLocaleString()}** amash!`)
        .setColor('#30E025')
        .setFooter({
          text: `Sold by: ${author.username}`
        })
        .setTimestamp();
      
      return message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Sell Command Error:", err);
      clearCooldown(author.id, module.exports);
      return message.reply("A database error occurred while processing your transaction.");
    }
  }
};
