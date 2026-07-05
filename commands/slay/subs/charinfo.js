const { universalGet } = require("../../../utils/database.js");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "charinfo", 
  aliases: ["ci", "info"], 
  category: "Slay (In progress!)", 
  description: "Get stats about your character!", 
  cooldown: 20,
  async execute(message){
    const authorId = message.author.id;
    const stats = universalGet("characters", authorId);
    
    if(!stats) return message.channel.send(`<@${authorId}>, you haven't created a character in the game yet. Create one using \`!slay start\`!`);
    
    const type = stats.type == 1? "Attacker":(stats.type == 2? "Defender":"Endurer");
    
    const spd = Math.round(stats.spd);
    const str = Math.round(stats.str);
    const dma = Math.round(stats.dma);
    
    const xp = Math.round(stats.xp);
    const lvl = stats.lvl;
    const hp = stats.hp;
    
    const stat = new EmbedBuilder()
    .setTitle(`${message.member.displayName? message.member.displayName:message.author.globalName}'s Stats:`)
    .setDescription(`⚔️ Type: ${type}\n\n🏃‍♂️ SPD: ${spd}\n🗡 STR: ${str}\n🧱 DMA: ${dma}\n🟩 HP: ${hp}\n\n↗️ LVL: ${lvl}\n🧘‍♂️ XP: ${xp}`)
    .setTimestamp()
    .setColor("#D4AF37");
    
    return message.channel.send({embeds: [stat]});
  }
}