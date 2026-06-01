const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { items } = require('./shop.js');
const { db } = require('../../utils/database.js');

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
    const author = interaction.user; // 'interaction.user' replaces 'message.author'

    // 3. INPUT VALIDATION 
    // Slash commands enforce whole integers, but we keep the <= 0 shield active
    if (amt <= 0) {
      return interaction.editReply({
        content: "Please enter a valid, positive amount of Philosopher's Stones you wanna sell."
      });
    }
    
    // 4. DATABASE INTEGRITY CHECK
    const pstones = db.prepare("SELECT pstone FROM inventory WHERE userid = ?").get(author.id);
    
    if (!pstones || pstones.pstone < amt) {
      const uHave = !pstones ? 0 : pstones.pstone;
      return interaction.editReply({
        content: `You don't have enough Stones to sell them! You have only ${uHave} Philosopher's Stone(s).`
      });
    }
    
    // 5. TRANSACTION PROCESSING
    const totalEarnings = 45000 * amt;
    db.prepare("UPDATE inventory SET pstone = pstone - ? WHERE userid = ?").run(amt, author.id);
    db.prepare("UPDATE amash SET amash = amash + ? WHERE userid = ?").run(totalEarnings, author.id);
    
    // 6. RENDER TRANSACTION RECEIPT EMBED
    const embed = new EmbedBuilder()
      .setTitle("💎 Stones Sold!")
      .setDescription(`<@${author.id}>, you have sold ${amt} Philosopher's Stone(s) and received ${totalEarnings} amash!`)
      .setColor('#30E025')
      .setFooter({
        text: `Sold by: ${author.tag}` // Using your clean, unmentionable tag update!
      })
      .setTimestamp();
    
    // 7. DISPATCH VIA EDITREPLY
    return interaction.editReply({ content: null, embeds: [embed] });
  }
}
