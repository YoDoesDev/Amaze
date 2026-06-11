 const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { universalGet, universalSet } = require('../../utils/database.js');
const { items } = require('./shop.js');

module.exports = {
  // 1. SLASH COMMAND DEFINITION
  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Sell Philosopher's Stones for Amash")
    .addIntegerOption(option => 
      option.setName("amount")
        .setDescription("The amount of Philosopher's Stones you want to sell")
        .setRequired(true)
    ),

  category: "Shop", 
  cooldown: 10,

  async execute(interaction) {
    // 2. EXTRACT CONTEXT VALUES
    const amt = interaction.options.getInteger("amount");
    const author = interaction.user;

    // 3. INPUT VALIDATION 
    if (amt <= 0) {
      return interaction.editReply({
        content: "Please enter a valid, positive amount of Philosopher's Stones you wanna sell."
      });
    }
    
    try {
      // =======================================================
      // 4. FETCH POOLS VIA MATRIX WRAPPERS
      // =======================================================
      const inventoryRow = universalGet("inventory", author.id);
      const amashRow = universalGet("amash", author.id);
      
      const currentStones = inventoryRow?.pstone ?? 0;
      const currentBucks = amashRow?.bucks ?? 0;
      
      // Validation Check against inventory state
      if (currentStones < amt) {
        return interaction.editReply({
          content: `You don't have enough Stones to sell them! You have only ${currentStones} Philosopher's Stone(s).`
        });
      }
      
      // =======================================================
      // 5. TRANSACTION PROCESSING (MATRIX MUTATIONS)
      // =======================================================
      const totalEarnings = 45000 * amt;
      const finalBucks = currentBucks + totalEarnings;
      const finalStones = currentStones - amt;

      // Deduct items from inventory state record
      universalSet("inventory", author.id, {
          pstone: finalStones
      });

      // Credit cash balance to account state record
      universalSet("amash", author.id, {
          bucks: finalBucks
      });
      
      // 6. RENDER TRANSACTION RECEIPT EMBED
      const embed = new EmbedBuilder()
        .setTitle("💎 Stones Sold!")
        .setDescription(`<@${author.id}>, you have sold ${amt} Philosopher's Stone(s) and received **${totalEarnings.toLocaleString()}** Amash!`)
        .setColor('#30E025')
        .setFooter({
          text: `Sold by: ${author.username}` // Cleaned up deprecated .tag call
        })
        .setTimestamp();
      
      // 7. DISPATCH VIA EDITREPLY
      return interaction.editReply({ content: null, embeds: [embed] });

    } catch (err) {
        console.error("Sell Command Error:", err);
        return interaction.editReply("An error occurred while trying to sell your items.");
    }
  }
};
