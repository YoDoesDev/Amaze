const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { universalGet } = require("../../../utils/database.js");

module.exports = {
  // The main loop in slay.js extracts these properties to build the sub-command options
  data: new SlashCommandBuilder()
    .setName("charinfo")
    .setDescription("Get stats about your character!"),
    
  async execute(interaction) {
    // Access user data cleanly from the interaction object
    const userId = interaction.user.id;
    const member = interaction.member;
    const stats = universalGet("characters", userId);
    
    if (!stats) {
      return await interaction.editReply({
        content: `<@${userId}>, you haven't created a character in the game yet. Create one using \`/slay start\`!`
      });
    }
    
    const type = stats.type == 1 ? "Attacker" : (stats.type == 2 ? "Defender" : "Endurer");
    
    const spd = stats.spd;
    const str = stats.str;
    const dma = stats.dma;
    
    const xp = stats.xp;
    const lvl = stats.lvl;
    const hp = stats.hp;
    
    const stat = new EmbedBuilder()
      .setTitle(`${interaction.member.displayName?message.member.displayName : interaction.user.globalName}'s Stats:`)
      .setDescription(`⚔️ Type: ${type}\n\n 🏃‍♂️ SPD: ${spd}\n 🗡 STR: ${str}\n🧱 DMA: ${dma}\n🟩 HP: ${hp}\n\n↗️ LVL: ${lvl}\n🧘‍♂️ XP: ${xp}`)
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [stat] });
  }
};
