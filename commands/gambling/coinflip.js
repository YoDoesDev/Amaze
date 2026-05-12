const { db } = require("../../utils/database.js");
const { emojis } = require("../../utils/config.js");

module.exports = {
  name: "coinflip", 
  aliases: ["cf"], 
  category: "Gambling", 
  cooldown: 20,
  description: "Choose your call and gamble money on a coin!\n\nSyntax: `!coinflip <amash> [h/t]\n\n[] = OPTIONAL\n<> = REQUIRED`", 
  async execute(message, args){
    // 1. Argument Handling (amt first, then call)
    const amt = parseInt(args[0]);
    let call = args[1] || "h";
    
    // 2. Validations
    const validCalls = ["h", "t", "heads", "tails"];
    if(!validCalls.includes(call.toLowerCase())){
      return message.reply("Please choose a valid call (heads/tails)!");
    }
    if(isNaN(amt) || amt < 1 || !(amt % 1 === 0)){
      return message.reply("Please choose a valid amount of Amash.");
    }
    
    let stones, monie;
    try {
      // 3. Database Fetching with Fallbacks
      const invData = db.prepare(`SELECT pstone FROM inventory WHERE userid = ?`).get(message.author.id);
      stones = invData ? invData.pstone : 0;
      
      const amashData = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(message.author.id);
      monie = amashData ? amashData.bucks : 0;

      if(monie < amt){
        return message.reply(`You don't have enough ${emojis.amash} Amash!`);
      }
    } catch(err) {
      console.error(err);
      return message.reply("A Database error occurred.");
    }

    // 4. Game Setup
    call = call.startsWith("h") ? "heads" : "tails";
    const effectiveStones = Math.min(stones, 20);
    const winChance = 0.5 + (0.0125 * effectiveStones);

    // 5. Execution & Animation
    // We send the flipping message and store it in 'msg'
    const msg = await message.channel.send(`${emojis.cf} **${message.author.username}** flips a coin and calls **${call}**...`);

    if(stones > 0){
      message.channel.send(`*✨ Your Philosopher's Stones (${stones}) are vibrating...*`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // 6. The Result Timer
    setTimeout(async () => {
      const isWin = Math.random() < winChance;

      try {
        if (isWin) {
          db.prepare(`UPDATE amash SET bucks = bucks + ? WHERE userid = ?`).run(amt, message.author.id);
          await msg.edit(`🎉 The coin landed on **${call}**! You won **${amt * 2}** ${emojis.amash}!`);
        } else {
          db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(amt, message.author.id);
          await msg.edit(`💀 It landed on the other side. You lost **${amt}** ${emojis.amash}.`);
        }
      } catch (err) {
        console.error(err);
        await msg.edit("⚠️ An error occurred while updating your balance.");
      }
    }, 2000); // 2-second delay for suspense
  }
};
