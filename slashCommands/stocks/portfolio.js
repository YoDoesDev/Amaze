const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/cooldowns.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("portfolio")
    .setDescription("View the stocks you or another user have invested in")
    .addUserOption(option => 
        option.setName("target")
            .setDescription("The user whose portfolio you want to inspect")
            .setRequired(false)
    ),
  category: 'Stocks', 
  cooldown: 25,

  async execute(interaction) { 
    const authorId = interaction.user.id;
    // Default to the interaction author if no target user is provided
    const target = interaction.options.getUser("target") || interaction.user;

    try {
      // 1. Fetch investment holdings rows
      const rows = db.prepare(`SELECT invested, stocks, profit FROM investments WHERE investor = ?`)
                     .all(target.id);

      // 2. Portfolio Empty Validation Guard
      if (rows.length === 0) {
        return interaction.editReply(`**${target.username}** hasn't bought any stocks yet!`);
      }
      
      // 3. Map list entries directly from row data array
      const list = rows.map((row, index) => {
        const netProfit = Math.round(row.profit);
        const profitSign = netProfit >= 0 ? "+" : "";
        return `**${index + 1}.** Invested in <@${row.invested}>: **${row.stocks}** stocks (\`${profitSign}${netProfit}\` Amash profit)`;
      }).join('\n');
      
      // 4. Assemble the final Portfolio readout
      const embed = new EmbedBuilder()
        .setColor('#E8AE1B')
        .setTitle(`💼 ${target.username}'s Investment Portfolio`)
        .setDescription(list)
        .setFooter({ text: `Requested By: ${interaction.user.username}` })
        .setTimestamp();
      
      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Portfolio Error:", err);
      // Clean up internal command cooldown if the query crashes
      clearCooldown(authorId, module.exports);
      return interaction.editReply("A database error occurred while fetching the portfolio!");
    }
  }
}
