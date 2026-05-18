const { db } = require("../../utils/database.js");
const { emojis } = require("../../utils/config.js");

// EV 0.85.
module.exports = {
  name: "slots",
  aliases: ["s"],
  category: "Gambling",
  cooldown: 15,
  description: "Bet some money to win prizes!\n\nSyntax: `!slots <amash>`\n\n<> = REQUIRED",
  async execute(message, args) {
    const amt = parseInt(args[0]);
    
    // 1. Validation
    if (isNaN(amt) || amt % 1 > 0 || amt < 1) {
      return message.reply("Please enter a valid amount of amash!");
    }

    // 2. Database Check
    let monie;
    try {
      const balData = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(message.author.id);
      if (!balData) {
        return message.reply("You don't hold an Amash account yet! Use `!daily` to open one.");
      }
      monie = balData.bucks;
      if (monie < amt) {
        return message.reply(`You don't have enough ${emojis.amash}!`);
      }
    } catch (err) {
      console.log(err);
      return message.reply("A Database error occurred while checking amash.");
    }

    // 3. Setup the Reels
    const slotEmojis = [
       "🔥", "🐧", "💦", "💦", "🔥", "🐧", "🔥", "🏮", "💦", "🦄", "🏮", ":phoenix:", "🦄"
    ];

    const jackpotPayouts = { 
      "🔥": 3.2, 
      "💦": 4,
      "🐧": 6.5,
      "🏮": 7,
      "🦄": 9,
      ":phoenix:": 17
    };

    const roll = () => {
      return slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
    };

    const r1 = roll();
    const r2 = roll();
    const r3 = roll();
    const result = [r1, r2, r3];

    const isMatch = (a, b, c) => a === b && b === c;
    const isTwoMatch = (a, b, c) =>
      a === b || b === c || a === c;

    // 4. Calculate Payout using a Set
    let multiplier = 0;
    let winMessage = "";

    if (isMatch(r1, r2, r3)) {
      // JACKPOT (3 Match)
      multiplier = jackpotPayouts[r1];
      winMessage = `🎰 **JACKPOT!** You won **${amt * multiplier}** ${emojis.amash}!`;
    } else if (isTwoMatch(r1, r2, r3)) {
      // SMALL WIN (2 Match)
      multiplier = 1.0;
      winMessage = `✨ **Nice!** Two matched. You won **${Math.floor(amt * multiplier)}** ${emojis.amash}!`;
    } else {
      // LOSS (3 Unique)
      multiplier = -1;
      winMessage = `💀 **Oof.** Better luck next time. Lost **${amt}** ${emojis.amash}.`;
    }

    // 5. Update Database
    try {
      if (multiplier > 0) {
        const totalWin = Math.floor(amt * multiplier);
        db.prepare(`UPDATE amash SET bucks = bucks + ? WHERE userid = ?`).run(totalWin, message.author.id);
      } else {
        db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(amt, message.author.id);
      }
    } catch (err) {
      console.log(err);
      return message.reply("Error updating your balance.");
    }

    // 6. Visual Output
    const msg = await message.reply(`${emojis.slots} *The reels are spinning...*`);

    setTimeout(async () => {
      await msg.edit(`| **[ ${r1} | ${r2} | ${r3} ]** |\n${winMessage}`);
    }, 2000);
  }
};
