 const { SlashCommandBuilder } = require('discord.js');
const { universalGet, universalSet } = require("../../utils/database.js");
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
      // 2. MATRIX DATA FETCH
      const balData = universalGet("amash", authorId);
      
      if (!balData) {
        return interaction.editReply("You don't have an Amash account yet! Use `/daily` to open one.");
      }

      const currentBucks = balData.bucks ?? 0;

      if (currentBucks < amt) {
        return interaction.editReply(`You don't have enough ${emojis.amash}! You only have **${currentBucks}**.`);
      }

      // 3. FIXED: Corrected the guild check boolean precedence bug
      if (interaction.guild?.id !== "1499416975531573429") {
        if (amt > 250000) {
          return interaction.editReply(`The maximum amount to gamble is 250,000 at a time!`);
        }
      }

      // 4. Setup the Reels
      const slotEmojis = [
         "🐐", "🐧", "🐱", "🦅", "🐐", "🐧", "🐱", "🦅", "🐐", "🦅", "🐧", "phoenix", "phoenix"
      ];

      const jackpotPayouts = { 
        "🦅": 3.2, 
        "🐐": 4,
        "🐧": 6.5,
        "🐱": 7,
        "phoenix": 12
      };
      
      const roll = () => slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
      const r1 = roll(), r2 = roll(), r3 = roll();

      // 5. Payout & Net Change Calculations
      let winMessage = "";
      let netChange = 0; // Tracks exact balance adjustments

      if (r1 === r2 && r2 === r3) {
        // JACKPOT (3 Match) -> Pays out multiplier * bet, minus the cost to play
        const multiplier = jackpotPayouts[r1];
        const winAmount = Math.floor(amt * multiplier);
        netChange = winAmount - amt; 
        winMessage = `🎰 **JACKPOT!** You won **${winAmount}** ${emojis.amash}!`;
      } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        // SMALL WIN (2 Match) -> Gives money back (Break even, net change is 0)
        netChange = 0; 
        winMessage = `✨ **Nice!** Two matched. You won your **${amt}** ${emojis.amash} back!`;
      } else {
        // LOSS -> Lose the bet amount
        netChange = -amt;
        winMessage = `💀 **Oof.** Better luck next time. Lost **${amt}** ${emojis.amash}.`;
      }

      // 6. EXECUTION MATRIX MUTATION
      universalSet("amash", authorId, {
        bucks: currentBucks + netChange
      });

      // 7. Visual Output
      // Format emojis safely for raw text vs custom text strings
      const formatEmoji = (e) => e === "phoenix" ? emojis.phoenix || "🔥" : e;

      await interaction.editReply(`${emojis.slots} *The reels are spinning...*`);

      setTimeout(async () => {
        await interaction.editReply(
          `| **[ ${formatEmoji(r1)} | ${formatEmoji(r2)} | ${formatEmoji(r3)} ]** |\n${winMessage}`
        );
      }, 2000);

    } catch (err) {
      console.error("Slots Error:", err);
      return interaction.editReply("A Database error occurred.");
    }
  }
};
