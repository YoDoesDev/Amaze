const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { db } = require("../../utils/database.js");
const { emojis } = require("../../utils/config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Choose your call and gamble money on a coin!")
    .addIntegerOption(opt => 
        opt.setName("amount")
           .setDescription("How much Amash to gamble")
           .setRequired(true)
           .setMinValue(1)
    )
    .addStringOption(opt => 
        opt.setName("call")
           .setDescription("Heads or Tails?")
           .setRequired(false)
           .addChoices(
               { name: 'Heads', value: 'heads' },
               { name: 'Tails', value: 'tails' }
           )
    ),
  category: "Gambling",
  cooldown: 20,

  async execute(interaction) {
    // interaction.deferReply() is handled in index.js
    const authorId = interaction.user.id;
    const amt = interaction.options.getInteger("amount");
    const call = interaction.options.getString("call") || "heads";

    try {
      // 1. Database Fetching
      const invData = db.prepare(`SELECT pstone FROM inventory WHERE userid = ?`).get(authorId);
      const stones = invData ? invData.pstone : 0;
      
      const amashData = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(authorId);
      const monie = amashData ? amashData.bucks : 0;

      if (monie < amt) {
        return interaction.editReply(`You don't have enough ${emojis.amash} Amash! You only have **${monie}**.`);
      }
     if(!interaction.guild.id == "1499416975531573429") {
     if(amt > 250000){
        return interaction.editReply(`The maximum amount to gamble is 250,000 at a time!`);
}}

      // 2. Logic Setup
      const effectiveStones = Math.min(stones, 20);
      const winChance = 0.5 + (0.0125 * effectiveStones);
      const isWin = Math.random() < winChance;

      // 3. Initial Animation Message
      await interaction.editReply(`${emojis.cf} **${interaction.user.username}** flips a coin and calls **${call}**...`);

      // 4. Result Processing (2-second "suspense" delay)
      setTimeout(async () => {
        try {
          if (isWin) {
            db.prepare(`UPDATE amash SET bucks = bucks + ? WHERE userid = ?`).run(amt, authorId);
            await interaction.editReply(`🎉 The coin landed on **${call}**! You won **${amt * 2}** ${emojis.amash}!`);
          } else {
            db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(amt, authorId);
            const landedOn = call === "heads" ? "tails" : "heads";
            await interaction.editReply(`💀 It landed on **${landedOn}**. You lost **${amt}** ${emojis.amash}.`);
          }
          
          // Bonus stone notification (optional cleanup)
          if (stones > 0) {
            await interaction.followUp({ content: `*✨ Your Philosopher's Stones (${stones}) gave you a ${((winChance - 0.5) * 100).toFixed(1)}% boost!*`, ephemeral: true });
          }

        } catch (err) {
          console.error("Result Update Error:", err);
          await interaction.editReply("⚠️ An error occurred while updating your balance.");
        }
      }, 2000);

    } catch (err) {
      console.error("Coinflip Init Error:", err);
      return interaction.editReply("A Database error occurred.");
    }
  }
};
