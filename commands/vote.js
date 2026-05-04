const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'vote', 
  aliases: ['v'], 
  description: 'Use this command to vote our bot on top.gg!', 
  async execute(message){
    const embed = new EmbedBuilder().setTitle("Vote Me!").setColor('#F7C105').setDescription("Glad that you want to vote me!\n\nVote me on: https://top.gg/bot/1494637741722566656/vote\nReward: 150 Amash");
    
    return message.reply({embeds: [embed]})
  }
}
