 const { SlashCommandBuilder } = require('discord.js');
const { universalGet, universalSet } = require('../../utils/database.js');
const { emojis } = require("../../utils/config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Gamble your amash on a coin flip!')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('How much Amash to bet')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('call')
        .setDescription('Heads or tails')
        .setRequired(false)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' }
        )),

  async execute(interaction) {
    const userId = interaction.user.id;
    const amt = interaction.options.getInteger('amount');
    const call = interaction.options.getString('call') || 'heads';

    if (amt < 1) return interaction.editReply({ content: "Bet must be positive!" });

    try {
      const invData = universalGet("inventory", userId);
      const amashData = universalGet("amash", userId);

      const stones = invData?.pstone ?? 0;
      const monie = amashData?.bucks ?? 0;

      if (monie < amt) {
        return interaction.editReply(`You don't have enough ${emojis.amash} Amash!`);
      }

      if (interaction.guildId !== "1499416975531573429" && amt > 250000) {
        return interaction.editReply(`The maximum amount to gamble is 250,000 at a time!`);
      }

      const effectiveStones = Math.min(stones, 20);
      const winChance = 0.5 + (0.005 * effectiveStones);
      const isWin = Math.random() < winChance;

      // Initial visual response
      await interaction.editReply(`${emojis.cf} **${interaction.user.username}** flips a coin and calls **${call}**...`);

      // Delayed result processing
      setTimeout(async () => {
        try {
          if (isWin) {
            // FIXED: Using single-key universalSet correctly
            universalSet("amash", userId, { bucks: monie + amt });
            await interaction.editReply(`🎉 The coin landed on **${call}**! You won **${amt * 2}** ${emojis.amash}!`);
          } else {
            // FIXED: Using single-key universalSet correctly
            universalSet("amash", userId, { bucks: monie - amt });
            await interaction.editReply(`💀 It landed on the other side. You lost **${amt}** ${emojis.amash}.`);
          }
        } catch (updateErr) {
          console.error("Coinflip Edit Error:", updateErr);
        }
      }, 2000);

    } catch (err) {
      console.error("Coinflip Error:", err);
      return interaction.editReply({ content: "A database error occurred." });
    }
  }
};
