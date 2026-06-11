const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
// 1. FIXED: Imported your matrix utility functions
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');

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
      // =======================================================
      // 2. FETCH DATA FOR BOTH USERS SEAMLESSLY
      // =======================================================
      const authorRow = universalGet("amash", authorId);
      const targetRow = universalGet("amash", target.id);

      const authorBalance = authorRow?.bucks ?? 0;
      const targetBalance = targetRow?.bucks ?? 0;

      // 3. Balance Check
      if (authorBalance < amt) {
        return interaction.editReply(`You need **${amt}** Amash, but you only have **${authorBalance}**.`);
      }

      // =======================================================
      // 4. EXECUTION MATRIX MUTATIONS (SEQUENTIAL & SAFE)
      // =======================================================
      
      // Deduct from sender's balance
      universalSet("amash", authorId, {
        bucks: authorBalance - amt
      });

      // Initialize receiver's profile table row if they are completely new to the bot
      if (!targetRow) {
        universalCreate("amash", target.id);
      }

      // Add to receiver's balance
      universalSet("amash", target.id, {
        bucks: targetBalance + amt
      });

      // 5. Response Embed
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
};
