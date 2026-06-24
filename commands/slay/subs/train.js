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
      return message.reply("You don't have enough amash to train!");
      
    if(!stats)
      return message.reply("You don't own a character in the game yet! Use `!slay start` command to begin!");
      
    const monie = cash.bucks;
    universalSet("amash", authorId, {
      bucks: monie - 10
    })
    
    let ostr = stats.str;
    let ospd = stats.spd;
    let odma = stats.dma;
    
    let nstr = Math.random() * 4;
    let nspd = Math.random() * 4;
    let ndma = Math.random() * 4;
    const type = stats.type;
    
    if(type == 1){
      nstr += 4;
      universalSet("characters", authorId, {
        str: ostr + nstr,
        spd: ospd + nspd, 
        dma: odma + ndma
      });
    } else if(type == 2){
      nspd += 4;
      universalSet("characters", authorId, {
        str: ostr + nstr,
        spd: ospd + nspd, 
        dma: odma + ndma
      });
    } else{
      ndma += 4;
      universalSet("characters", authorId, {
        str: ostr + nstr,
        spd: ospd + nspd, 
        dma: odma + ndma
      })
    }
    
    const newStats = universalGet("characters", authorId);
    
    const embed = new EmbedBuilder()
    .setTitle("Training Complete!")
    .setDescription(`${message.member.displayName}, your character's stats have improved!\n\nSTR: ${Math.round(newStats.str)} (+${Math.round(nstr)})\nSPD: ${Math.round(newStats.spd)}(+${Math.round(nspd)})\nDMA: ${Math.round(newStats.dma)} (+${Math.round(ndma)})`)
    .setColor("#3AB9F4")
    .setTimestamp();
    
    return message.reply({embeds: [embed]})
  }
}