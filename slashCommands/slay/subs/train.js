 const {
  universalGet, 
  universalSet, 
} = require("../../../utils/database.js");

const {
  checkXP
} = require("../../../utils/battle/leveling.js");

const {
  EmbedBuilder, 
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
  .setName("train")
  .setDescription("Train your character by using 10 Amash."), 
  category: "Slayin' It (Under Construction ⚠️)",
  
  async execute(interaction){
    const authorId = interaction.user.id;
    
    const cash = universalGet("amash", authorId);
    const stats = universalGet("characters", authorId);
    
    if(!cash || cash.bucks < 10)
      return interaction.editReply("You don't have enough Amash to train (you need 10 Amash per training)!");
      
    if(!stats)
      return interaction.editReply("You don't own a character in the game yet! Use `!slay start` command to begin!");
      
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
    .setDescription(`${interaction.member.displayName?interaction.member.displayName : interaction.user.globalName}, your character's stats have improved!\n\nSTR: ${Math.round(newStats.str)} (+${Math.round(nstr)})\nSPD: ${Math.round(newStats.spd)}(+${Math.round(nspd)})\nDMA: ${Math.round(newStats.dma)} (+${Math.round(ndma)})\n\nYour character gained ${Math.round(nxp)} xp!`)
    .setColor("#3AB9F4")
    .setTimestamp();
    
    interaction.editReply({embeds: [embed]});
    
    if(leveledUp) {
      return interaction.followUp(`Congrats, champ! You just progressed from level ${stats.lvl} to level ${newStats.lvl}! Your HP increases to ${newStats.hp}`);
    }
  }
}