const {
  universalSet, 
  universalCreate, 
  universalGet
} = require("../../utils/database.js");

const {
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonStyle, 
  ButtonBuilder, 
  ComponentType
} = require("discord.js");

module.exports = {
  name: "start", 
  category: "Slayin' It (Under Construction ⚠️)", 
  cooldown: 10,
  description: 'Start your journey in the game by getting a character with a fighting style and specific stats.', 
  async execute(message) {
    const authorId = message.author.id;
    const btnRow = new ActionRowBuilder().addComponents(
      
      new ButtonBuilder()
      .setCustomId("attacker")
      .setLabel("Attacker")
      .setStyle(ButtonStyle.Danger), 
      
      new ButtonBuilder()
      .setCustomId("defender")
      .setLabel("Defender")
      .setStyle(ButtonStyle.Primary), 
      
      new ButtonBuilder()
      .setCustomId("endurer")
      .setLabel("Endurer")
      .setStyle(ButtonStyle.Success)
    );
    
    const embed = new EmbedBuilder()
    .setTitle(`Buckle up, ${message.member.displayName}!`)
    .setDescription("Your journey in the game Slayin' It starts here!\n")
    .addFields({
      name: "Choose your fighting style:", 
      value: "🗡 Attacker: You start off with more melee damage, you cause more damage than other fighting styles\n\n🛡 Defender: You start off with more speed, dodging opponent's attacks if you're faster than them, you can dodge more effectively than other fighting styles\n\n🧱 Endurer: You start off with more damage absorption abilites, to withstand your opponent's attacks more effective than other fighting styles" 
    })
    .setTimestamp();
    
    const styleMsg = await message.channel.send({
      embeds: [embed], 
      components: [btnRow]
    });
    
    let fspd, fstr, fdma, ftype;
    let reason = "time_finished";
    
    const collector = styleMsg.createMessageComponentCollector({
      componentType: ComponentType.Button, 
      time: 60000
    });
    
    collector.on("collect", async i => {
      if(i.user.id != authorId){
        return i.reply({
          content: "This is not for you 👎", 
          ephemeral: true
        })
      }
      
      if(fspd || fstr || fdma){
        return i.reply({
          content: "You already selected one!"
        })
      }
      
      if(i.customId == "attacker"){
        fstr = 25;
        ftype = 1;
      }
      if(i.customId == "defender"){
        fspd = 15;
        ftype = 2;
      }
      if(i.customId == "endurer"){
        fdma = 10;
        ftype = 3
      }
      
      reason = "type_selected";
      
      await i.update({
        content: "⏳ Locking in your choice, preparing your character data...",
        embeds: [], 
        components: []
      }); 
      
      collector.stop("type_selected");
    })
    
    collector.on("end", async (_, reason) => {
      if(reason != "type_selected"){
        return styleMsg.edit("You took too long, baii 👋");
      }
      
      fstr = fstr || 20;
      fspd = fspd || 10;
      fdma = fdma || 10;
      
      universalCreate("characters", authorId);
      universalSet("characters", authorId, {
        str: fstr, 
        spd: fspd, 
        dma: fdma, 
        type: ftype
      });
      
      const stats = universalGet("characters", authorId);
    
    let style;
   
    if(stats.type == 1){
      style = "an attacker";
    } else if(stats.type == 2){
      style = "a defender";
    } else{
      style = "an endurer"
    }
    
    const info = new EmbedBuilder()
    .setTitle("A new fighter has stepped in!")
    .setDescription("You have successfully made your debut in the game! These are your stats:\n")
    .addFields(
      {
        name: "Strike", 
        value: `${stats.str}`, 
      }, 
      {
        name: "Speed", 
        value: `${stats.spd}`
      }, 
      {
        name: "Damage Absorption", 
        value: `${stats.dma}`
      }
    )
    .setFooter({
      text: `You are ${style} now!`
    })
    .setTimestamp();
    
    return styleMsg.edit({embeds: [info], content: null});
    });
  }
}