const {
  universalGet, 
  universalSet, 
} = require("../../../utils/database.js");

const {
  checkXP
} = require("../../../utils/battle/leveling.js");

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
    
    if(!cash || cash.bucks < 10)
      return message.reply("You don't have enough Amash to train (you need 10 Amash per training)!");
      
    if(!stats)
      return message.reply("You don't own a character in the game yet! Use `!slay start` command to begin!");
      
    const monie = cash.bucks;
    universalSet("amash", authorId, {
      bucks: monie - 10
    })
    
    let ostr = stats.str;
    let ospd = stats.spd;
    let odma = stats.dma;
    let oxp = stats.xp;
    
    let nstr = Math.round(Math.random() * 4) + 2;
    let nspd = Math.round(Math.random() * 4) + 2;
    let ndma = Math.round(Math.random() * 4) + 2;
    let nxp = Math.ceil(Math.random() * 16) + 10;
    const type = stats.type;
    
    if(type == 1){
      nstr += 2;
    } else if(type == 2){
      nspd += 2;
    } else{
      ndma += 2;
    }
    
    universalSet("characters", authorId, {
        str: Math.round(ostr) + nstr,
        spd: Math.round(ospd) + nspd, 
        dma: Math.round(odma) + ndma, 
        xp: oxp + nxp
      })
    
    const leveledUp = await checkXP(authorId);
    const newStats = universalGet("characters", authorId);
    
    const embed = new EmbedBuilder()
    .setTitle("Training Complete!")
    .setDescription(`${message.member.displayName}, your character's stats have improved!\n\nSTR: ${Math.round(newStats.str)} (+${Math.round(nstr)})\nSPD: ${Math.round(newStats.spd)}(+${Math.round(nspd)})\nDMA: ${Math.round(newStats.dma)} (+${Math.round(ndma)})\n\nYour character gained ${Math.round(nxp)} xp!`)
    .setColor("#3AB9F4")
    .setTimestamp();
    
    message.reply({embeds: [embed]});
    
    if(leveledUp) {
      return message.channel.send(`Congrats, champ! You just progressed from level ${stats.lvl} to level ${newStats.lvl}! Your HP increases to ${newStats.hp}`);
    }
  }
}