const { db } = require("../../database.js");
const { emojis } = require("../../config.js");

module.exports = {
  name: "coinflip", 
  aliases: ["cf"], 
  category: "Gambling", 
  cooldown: 20,
  description: "Choose your call and gamble money on a coin!\n\nSyntax: `!coinflip <amash >[h/t]\n\n[] = OPTIONAL\n<> = REQUIRED`", 
  async execute(message, args){
    let call = args[1] || "h";
    const amt = parseInt(args[0]);
    let stones, monie;
    const validCalls = ["h", "t", "heads", "tails"];
    if(!validCalls.includes(call.toLowerCase())){
      return message.reply("Please choose a valid call (heads/tails)!");
    }
    if(isNaN(amt) || amt < 1 || !(amt%1 == 0)){
      return message.reply("Please choose a valid amount of Amash.");
    }
    
    try{
      const invData = db.prepare(`SELECT pstone FROM inventory WHERE userid = ?`).get(message.author.id);
      stones = invData? invData.pstone:0;
      
      const amashData = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(message.author.id);
      monie = amashData? amashData.bucks:0;
      if(monie < amt){
        return message.reply(`You don't have enough ${emojis.amash} Amash!`);
        
      }
      if(stones > 0){
        message.reply(`Your coinflip is enhanced by ${stones} 💎!`);
      }
    } catch(err){
      message.reply("A Database error occurred whilst fetching philosopher's stones and amash.");
      return console.log(err);
    }
    call = call.startsWith("h")? "heads":"tails";
    message.channel.send(`${emojis.cf} ${message.author.username} bets ${amt} and chooses ${call}`);
    
    if(stones > 20){
      stones = 20;
    }
    
    if(Math.random() < (0.5 + 0.0125 * stones)){
      
      
      try{
        db.prepare(`UPDATE amash SET bucks = bucks + ? WHERE userid = ?`).run(amt, message.author.id);
      }catch(err){
        return message.reply("An error occurred while transferring amash.");
      }
      setTimeout(() = {
      msg.edit(`You have won ${amt * 2} ${emojis.amash}!`);}, 1500);
      return;
    } else{
      try{
        db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(amt, message.author.id);
      }catch(err){
        return message.reply("An error occurred while transferring amash.");
      }
      setTimeout(() => {
      msg.edit(`You have lost ${amt} ${emojis.amash}.`);}, 1500);
    }
  }
}
