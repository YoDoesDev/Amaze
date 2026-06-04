const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, ComponentType } = require('discord.js');
const { emojis } = require('../../utils/config.js');
const ongGames = new Map();

module.exports = {
  name: "rps", 
  category: "Games", 
  description: "Play rock paper scissors with friends or a bot.\n\nSyntax: `!rps <rounds> [@user/bot]`\n<> = REQUIRED", 
  cooldown: 10,
  async execute(message, args){
    
    // 1. INPUT VALIDATION
    if(args.length < 2 || !Number.isInteger(parseInt(args[0]))){
      return message.reply({embeds: [
        new EmbedBuilder()
        .setTitle("One or two missing/invalid arguments!")
        .setDescription("Correct Syntax: `!rps <rounds> [@user/bot]`")
        .setColor('#ED4245')
      ]});
    }

    const totalRounds = parseInt(args[0]);
    if (totalRounds <= 0 || totalRounds > 10) {
      return message.reply("Please keep the rounds between 1 and 10 to prevent channel spam!");
    }
    
    if(ongGames.has(message.channel.id)){
      return message.reply("There is already a game going on in this channel. Try somewhere else maybe?");
    }
    
    // 2. CONFIG OBJECT (Preserving your blueprint)
    const game = {
      self: message.author.username,
      selfId: message.author.id,
      opp: "bot", 
      oppId: "bot",
      isAccepted: false, 
      channel: message.channel.id, 
      rounds: totalRounds,
      crntRound: 1,
      selfChoice: "TBD", 
      oppChoice: "TBD", 
      selfW: 0,
      oppW: 0,
      selfAfk: 0,
      oppAfk: 0,
      expiresAt: 120000 // 2 minutes
    };
    
    const target = message.mentions.users.first();

    if (args[1].toLowerCase() === 'bot') {
      game.opp = "bot";
      game.oppId = "bot";
      game.isAccepted = true; // Bot accepts instantly
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
      game.oppId = target.id;
    }
    
    ongGames.set(message.channel.id, game);

    // =======================================================
    // PHASE 1: MULTIPLAYER CHALLENGE LOBBY ACCEPT/DECLINE
    // =======================================================
    if(game.opp !== "bot"){
      const challEmbed = new EmbedBuilder()
        .setTitle("Challenge incoming!")
        .setDescription(`<@${target.id}>, <@${message.author.id}> challenges you to a game of Rock, Paper and Scissors.\n\n**Rounds:** ${game.rounds}\nDo you wanna accept or decline?`)
        .setColor('#A20FB7')
        .setTimestamp();
    
      const challRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("accept").setLabel("Accept").setEmoji("✅").setStyle(ButtonStyle.Success), 
        new ButtonBuilder().setCustomId("decline").setLabel("Decline").setEmoji("❌").setStyle(ButtonStyle.Danger)
      );
    
      const askMessage = await message.reply({
        content: `<@${target.id}>`, 
        embeds: [challEmbed], 
        components: [challRow]
      });
    
      try {
        const interaction = await askMessage.awaitMessageComponent({
          filter: i => i.user.id === target.id,
          time: game.expiresAt 
        });

        await interaction.deferUpdate();

        if (interaction.customId === "decline") {
          ongGames.delete(message.channel.id);
          return askMessage.edit({ content: "Challenge declined!", embeds: [], components: [] });
        }

        game.isAccepted = true;
        await askMessage.delete().catch(() => null); // Clear out the invite message

      } catch (err) {
        ongGames.delete(message.channel.id);
        return askMessage.edit({ content: "⌛ Match timed out!", embeds: [], components: [] });
      }
    }

    // =======================================================
    // PHASE 2: RUNTIME MULTI-ROUND GAME ENGINE
    // =======================================================
    runGameEngine(message, game);
  }
};

// --- CORE GAME ENGINE LOOP ---
async function runGameEngine(message, game) {
  const weapons = ['rock', 'paper', 'scissors'];
  const winConditions = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

  // Setup visual attack components
  const weaponRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("p_rock").setLabel("Rock").setEmoji("🪨").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("p_paper").setLabel("Paper").setEmoji("📄").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("p_scissors").setLabel("Scissors").setEmoji("✂️").setStyle(ButtonStyle.Primary)
  );

  const renderStatusEmbed = () => {
    return new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`⚔️ RPS Match: Round ${game.crntRound} / ${game.rounds}`)
      .setDescription(`**Players:** <@${game.selfId}> vs ${game.oppId === 'bot' ? '**Amaze Bot**' : `<@${game.oppId}>`}\n\n` +
                      `🏆 **Scoreboard:**\n` +
                      `• **${game.self}**: ${game.selfW} Wins\n` +
                      `• **${game.opp}**: ${game.oppW} Wins\n\n` +
                      `*Click your choices below! Choices are completely hidden until both lock in.*`)
      .addFields(
        { name: `${game.self}'s Choice`, value: game.selfChoice === 'TBD' ? '❌ Not Locked' : '✅ Locked In', inline: true },
        { name: `${game.opp}'s Choice`, value: game.oppChoice === 'TBD' ? '❌ Not Locked' : '✅ Locked In', inline: true }
      )
      .setTimestamp();
  };

  const gameMessage = await message.channel.send({
    embeds: [renderStatusEmbed()],
    components: [weaponRow]
  });

  const collector = gameMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000 // 60 seconds per round choice
  });

  collector.on('collect', async i => {
    const clickerId = i.user.id;

    // Reject onlookers
    if (clickerId !== game.selfId && clickerId !== game.oppId) {
      return i.reply({ content: "You aren't a participant in this duel!", ephemeral: true });
    }

    const selectedWeapon = i.customId.replace('p_', '');

    // Handle host choice locking
    if (clickerId === game.selfId) {
      if (game.selfChoice !== 'TBD') return i.reply({ content: "Move already declared!", ephemeral: true });
      game.selfChoice = selectedWeapon;
      await i.reply({ content: `You locked in **${selectedWeapon.toUpperCase()}**!`, ephemeral: true });
    } 
    // Handle opponent choice locking
    else if (clickerId === game.oppId) {
      if (game.oppChoice !== 'TBD') return i.reply({ content: "Move already declared!", ephemeral: true });
      game.oppChoice = selectedWeapon;
      await i.reply({ content: `You locked in **${selectedWeapon.toUpperCase()}**!`, ephemeral: true });
    }

    // Process Bot Action synchronously if needed
    if (game.oppId === 'bot') {
      game.oppChoice = weapons[Math.floor(Math.random() * weapons.length)];
    }

    // Update screen display safely
    await gameMessage.edit({ embeds: [renderStatusEmbed()] }).catch(() => null);

    // If both players selected a move, close round collector and compute results
    if (game.selfChoice !== 'TBD' && game.oppChoice !== 'TBD') {
      collector.stop('round_complete');
    }
  });

  collector.on('end', async (_, reason) => {
    // Handle AFK / Missing input timeout strings
    if (reason !== 'round_complete') {
      ongGames.delete(game.channel);
      return gameMessage.edit({ content: "🛑 Match canceled due to round selection inactivity.", embeds: [], components: [] }).catch(() => null);
    }

    // --- EVALUATE ROUND WINNER ---
    let roundResult = "";
    if (game.selfChoice === game.oppChoice) {
      roundResult = `🤝 **Round ${game.crntRound} is a Draw!** Both threw **${game.selfChoice.toUpperCase()}**.`;
    } else if (winConditions[game.selfChoice] === game.oppChoice) {
      game.selfW++;
      roundResult = `💥 **${game.self} wins Round ${game.crntRound}!** **${game.selfChoice.toUpperCase()}** beats **${game.oppChoice.toUpperCase()}**.`;
    } else {
      game.oppW++;
      roundResult = `💥 **${game.opp} wins Round ${game.crntRound}!** **${game.oppChoice.toUpperCase()}** beats **${game.selfChoice.toUpperCase()}**.`;
    }

    // Clean choices up for potential next loops
    game.selfChoice = 'TBD';
    game.oppChoice = 'TBD';

    // Show round results card for 3.5 seconds before progressing
    const intermediateEmbed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle(`📊 Round ${game.crntRound} Settled!`)
      .setDescription(`${roundResult}\n\n🏆 **Current Match Standings:**\n• ${game.self}: **${game.selfW}**\n• ${game.opp}: **${game.oppW}**`)
      .setTimestamp();

    await gameMessage.edit({ embeds: [intermediateEmbed], components: [] }).catch(() => null);

    setTimeout(async () => {
      game.crntRound++;

      // Check if match threshold reached or rounds concluded
      if (game.crntRound > game.rounds) {
        // Complete match conclusion
        let finalWinner = "It's an ultimate tie match!";
        if (game.selfW > game.oppW) finalWinner = `👑 **${game.self} is the Ultimate Champion!**`;
        else if (game.oppW > game.selfW) finalWinner = `👑 **${game.opp} is the Ultimate Champion!**`;

        const finalEmbed = new EmbedBuilder()
          .setColor('#3498DB')
          .setTitle('🏁 Tournament Complete!')
          .setDescription(`🏆 **Final Results:**\n\n🥇 ${finalWinner}\n\n📊 **Final Statistics Matrix:**\n• ${game.self}: ${game.selfW} Wins\n• ${game.opp}: ${game.oppW} Wins`)
          .setTimestamp();

        // CLEANING STATE MAP IMMEDIATELY FOR RAM CONSTRAINTS
        ongGames.delete(game.channel);
        return gameMessage.edit({ embeds: [finalEmbed], components: [] }).catch(() => null);
      } else {
        // Clear message structure and shift down to the next round execution flow
        await gameMessage.delete().catch(() => null);
        runGameEngine(message, game);
      }
    }, 3500);
  });
}


