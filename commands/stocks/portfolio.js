const { EmbedBuilder } = require('discord.js');
const { universalFetchAll } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
  name: 'portfolio', 
  aliases: ['port', 'pf'], 
  category: 'Stocks', 
  cooldown: 25,
  description: 'Shows a list of stocks you/others have bought.', 
  async execute(message) { 
    const target = message.mentions.users.first() || message.author;

    try {
      // 1. Fetch all rows (Returns an array immediately)
      const rows = universalFetchAll("investments", target.id)

      // 2. Empty Check
      if (rows.length === 0) {
        return message.reply(`${target.username} hasn't bought any stocks yet!`);
      }
      
      // 3. Map the list (Directly from the result)
      const list = rows.map((row, index) => {
        return `**${index + 1}.** Invested in <@${row.invested}>: **${row.stocks}** stocks (**${Math.round(row.profit)}** profit)`;
      }).join('\n');
      
      const embed = new EmbedBuilder()
        .setColor('#E8AE1B')
        .setTitle(`${target.username}'s Portfolio`)
        .setDescription(list)
        .setFooter({ text: `Requested By: ${message.author.username}` })
        .setTimestamp();
      
      return message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Portfolio Error:", err);
      clearCooldown(message.author.id, module.exports);
      return message.reply("A database error occurred while fetching the portfolio!");
    }
  }
}
