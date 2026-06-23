const {
  universalGet, 
  universalSet, 
  amash
} = require("../../../utils/database.js");

const {
  EmbedBuilder
} = require("discord.js");

module.exports = {
  name: "train", 
  cooldown: 25,
  aliases: ["t"], 
  category: "Slay (In progress!)", 
  
  async execute(message){
    const authorId = message.author.id;
    
    const cash = universalGet("amash", authorId);
    const stats = universalGet("characters", authorId);
    
    if(!cash)
      return message.reply("You don't have enough amash to hunt!");
      
    if(!stats)
      return message.reply("You don't own a character in the game yet! Use `!start` command to begin!");
      
    
    const nstr = Math.random();
    const nspd = Math.random();
    const ndma = Math.random();
    const type = stats.type;
    
    if(type == 1){
      nstr += 4;
      universalSet("characters", authorId, {
        str: nstr,
        spd: nspd, 
        dma: ndma
      });
    } else if(type == 2){
      nspd += 4;
      universalSet("characters", authorId, {
        str: nstr,
        spd: nspd, 
        dma: ndma
      });
    } else{
      ndma += 4;
      universalSet("characters", authorId, {
        str: nstr,
        spd: nspd, 
        dma: ndma
      })
    }
    
    const newStats = universalGet("characters", authorId);
    
    const embed = new EmbedBuilder()
    .setTitle("Training Complete!")
    .setDescription(`${message.member.displayName}, your character's stats have improved!\n\nSTR: ${newStats.str} (+${nstr})\nSPD: ${newStats.spd} (+${nspd})\nDMA: ${newStats.dma} (+${ndma})`)
    .setTimestamp();
    
    return message.reply({embeds: [embed]})
  }
}