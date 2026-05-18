const { SlashCommandBuilder } = require('discord.js');
const { db } = require("../../utils/database.js");
const { emojis } = require("../../utils/config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Bet some money to win prizes!")
    .addIntegerOption(opt => 
        opt.setName("amount")
           .setDescription("How much Amash to bet")
           .setRequired(true)
           .setMinValue(1)
    ),
  category: "Gambling",
  cooldown: 15,

  async execute(interaction) {
    // interaction.deferReply() is handled in index.js
    const authorId = interaction.user.id;
    const amt = interaction.options.getInteger("amount");

    try {
      // 1. Database Check
      const balData = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(authorId);
      
      if (!balData) {
        return interaction.editReply("You don't have an Amash account yet! Use `/daily` to open one.");
      }

      if (balData.bucks < amt) {
        return interaction.editReply(`You don't have enough ${emojis.amash}! You only have **${balData.bucks}**.`);
      }

    if(balData.bucks > 250000){
        return interaction.editReply(`The maximum amount to gamble is 250,000 at a time!`);
}

      // 2. Setup the Reels
          const slotEmojis = [
       "🐐", "🐧", "🐱", "🦅", "🐐", "🐧", "🐱", "🦅", "🐐", "🦅", "🐧", ":phoenix:", ":phoenix:"
    ];

    const jackpotPayouts = { 
      "🦅": 3.2, 
      "🐐": 4,
      "🐧": 6.5,
      "🐱": 7,
      ":phoenix:": 12
    };
      
      const roll = () => slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
      const r1 = roll(), r2 = roll(), r3 = roll();

      // 3. Payout Calculation
      let winAmount = 0;
      let winMessage = "";
      let isWin = false;

      if (r1 === r2 && r2 === r3) {
        // JACKPOT (3 Match)
        const multiplier = jackpotPayouts[r1];
        winAmount = Math.floor(amt * multiplier);
        winMessage = `🎰 **JACKPOT!** You won **${winAmount}** ${emojis.amash}!`;
        isWin = true;
      } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        // SMALL WIN (2 Match)
        winAmount = amt; // Matching 2 gives money back (Break even)
        winMessage = `✨ **Nice!** Two matched. You won **${winAmount}** ${emojis.amash}!`;
        isWin = true;
      } else {
        // LOSS
        winMessage = `💀 **Oof.** Better luck next time. Lost **${amt}** ${emojis.amash}.`;
        isWin = false;
      }

      // 4. Update Database
      if (isWin) {
        // For a win, we add the winAmount. (Note: if it's a "tie/refund", we add 0 since they already have the money? 
        // Wait, usually gambling logic subtracts first. Let's stick to your logic: 
        // If it's a 2-match, they "win" the amount back.
        db.prepare(`UPDATE amash SET bucks = bucks + ? WHERE userid = ?`).run(winAmount, authorId);
      } else {
        db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(amt, authorId);
      }

      // 5. Visual Output
      await interaction.editReply(`${emojis.slots} *The reels are spinning...*`);

      setTimeout(async () => {
        await interaction.editReply(`| **[ ${r1} | ${r2} | ${r3} ]** |\n${winMessage}`);
      }, 2000);

    } catch (err) {
      console.error("Slots Error:", err);
      return interaction.editReply("A Database error occurred.");
    }
  }
};
