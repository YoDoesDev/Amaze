const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("vote")
  .setDescription("Use this to get a link to vote the bot in top.gg"), 
  cooldown: 30,
  async execute(interaction){
    const embed = new EmbedBuilder().setTitle("Vote Me!").setColor('#F7C105').setDescription("Glad that you want to vote me!\n\nVote me on: https://top.gg/bot/1494637741722566656/vote\nReward: 150 Amash");
    
    return interaction.editReply({embeds: [embed]});
  }
}
