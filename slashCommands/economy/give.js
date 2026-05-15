const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give someone some amash!")
    .addUserOption(opt => opt.setName("user").setDescription("The lucky person").setRequired(true))
    .addIntegerOption(opt => opt.setName("amount").setDescription("Amount to give").setMinValue(1).setMaxValue(100000).setRequired(true)),
  
  category: 'Economy',
  cooldown: 120,
  
  async execute(interaction) { 
    const target = interaction.options.getUser("user");
    const amt = interaction.options.getInteger("amount");
    const authorId = interaction.user.id;

    if (target.id === authorId) {
      return interaction.editReply("😭 You can't give money to yourself!");
    }
    if (target.bot) {
      return interaction.editReply("Bots don't need amash; they live on electricity.");
    }

    try {
      const row = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(authorId);
      const balance = row?.bucks ?? 0;

      if (balance < amt) {
        return interaction.editReply(`You need **${amt}** Amash, but you only have **${balance}**.`);
      }

      // Perform the transfer
      db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(amt, authorId);
      db.prepare(`
        INSERT INTO amash (userid, bucks) VALUES (?, ?)
        ON CONFLICT (userid) DO UPDATE SET bucks = bucks + excluded.bucks
      `).run(target.id, amt);

      const embed = new EmbedBuilder()
        .setColor('#23A559')
        .setTitle("Transfer Successful!")
        .setDescription(`You sent <@${target.id}> **${amt}** Amash.\n\`\`\`js\n${interaction.user.username} ➔ ${amt} ➔ ${target.username}\n\`\`\``)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Give Command Error:", err);
      return interaction.editReply("Something went wrong with the database.");
    }
  }
}
