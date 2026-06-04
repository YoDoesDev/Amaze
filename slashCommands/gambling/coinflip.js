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

    // 1. Inputs are already auto-validated by Discord! (No isNaN checks needed!)
    if (amt < 1) return interaction.reply({ content: "Bet must be positive!", ephemeral: true });

    try {
      // 2. Exact same data logic you already perfected!
      const invData = universalGet("inventory", userId);
      const amashData = universalGet("amash", userId);

      const stones = invData ? invData.pstone : 0;
      const monie = amashData ? amashData.bucks : 0;

      if (monie < amt) {
        return interaction.reply(`You don't have enough ${emojis.amash} Amash!`);
      }

      if (interaction.guildId !== "1499416975531573429" && amt > 250000) {
        return interaction.reply(`The maximum amount to gamble is 250,000 at a time!`);
      }

      // Game math...
      const effectiveStones = Math.min(stones, 20);
      const winChance = 0.5 + (0.005 * effectiveStones);
      const isWin = Math.random() < winChance;

      // 3. Initial response
      await interaction.reply(`${emojis.cf} **${interaction.user.username}** flips a coin and calls **${call}**...`);

      // 4. Update and edit target reply
      setTimeout(async () => {
        if (isWin) {
          universalSet("amash", userId, { bucks: monie + amt });
          await interaction.editReply(`🎉 The coin landed on **${call}**! You won **${amt * 2}** ${emojis.amash}!`);
        } else {
          universalSet("amash", userId, { bucks: monie - amt });
          await interaction.editReply(`💀 It landed on the other side. You lost **${amt}** ${emojis.amash}.`);
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "A database error occurred.", ephemeral: true });
    }
  }
};
