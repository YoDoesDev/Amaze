const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { emojis } = require('../../utils/config.js');
const { db } = require('../../utils/database.js');

const ongGames = new Map();

module.exports = {
  name: "rps", 
  category: "Games", 
  description: "Play rock paper scissors with friends or a bot.\n\nSyntax: `!rps <rounds> [@user/bot]`\n<> = REQUIRED", 
  cooldown: 10,
  async execute(message, args){
    const game = {
      self: message.author.username,
      opp: "bot", 
      isAccepted: false, 
      channel: "TBD", 
      rounds: "TBD",
      crntRound: 0,
      selfChoice: "TBD", 
      oppChoice: "TBD", 
      selfW: 0,
      oppW: 0,
      selfAfk: 0,
      oppAfk: 0,
      expiresAt: 120000
    }
    
    if(args.length < 2 || !Number.isInteger(parseInt(args[0]))){
      return message.reply({embeds: [
        new EmbedBuilder()
        .setTitle("One or two missing/invalid arguments!")
        .setDescription("Correct Syntax: `!rps <rounds> [@user]`")
      ]})
    }
    
    const tics = db.prepare(`SELECT tickets FROM inventory WHERE userid = ?`).get(message.author.id);
    
    if(tics.tickets < 1){
      return message.reply("You don't have enough tickets to play this game. Buy it from the shop!");
    }
    
    if(ongGames.has(message.channel.id)){
      return message.reply("There is already a game going on in this channel. Try somewhere else maybe?");
    }
    
    const target = message.mentions.users.first();

    if (args[1].toLowerCase() === 'bot') {
      game.opp = "bot";
    } else {
      if (!target) {
        return message.reply("Please mention a valid opponent or type `bot`!");
      }
      if (target.id === message.author.id) {
        return message.reply("Aww man, see this loner, play with the bot dude 🥀");
      }
      if (target.bot) {
        return message.reply("You can't play against external bots!");
      }
      game.opp = target.username;
    }
    
    game.rounds = args[0];
    game.channel = message.channel.id;
    
    if(game.opp != "bot"){
      const challEmbed = new EmbedBuilder()
    .setTitle("Challenge incoming!")
    .setDescription(`<@${target.id}>, <@${message.author.id}> challenges you to a game of Rock, Raper and Scissors. Do you wanna accept or decline?`)
    .setColor('#A20FB7')
    .setTimestamp();
    
    const challRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
      .setCustomId("accept")
      .setLabel("Accept")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success), 
      
      new ButtonBuilder()
      .setCustomId("decline")
      .setLabel("Decline")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
    );
    
    const askMessage = await message.reply({
      embeds: [challEmbed], 
      components: [challRow]
    });
    
    try {
  // JavaScript completely freezes on this line until someone clicks a button
  const interaction = await askMessage.awaitMessageComponent({
    filter: i => i.user.id === target.id,
    time: game.expiresAt 
  });

  // Code only runs here AFTER a click happens
  await interaction.deferUpdate();

  if (interaction.customId === "decline") {
    return askMessage.edit({ content: "Challenge declined!", embeds: [], components: [] });
  }

  // They clicked accept! Proceed straight down to the game loops...
  game.isAccepted = true;

} catch (err) {
  // If they don't click within 2 minutes, it automatically jumps here
  return askMessage.edit({ content: "⌛ Match timed out!", embeds: [], components: [] });
}

    }
  }
}