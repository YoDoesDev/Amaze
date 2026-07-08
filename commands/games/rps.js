const { 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder, 
  EmbedBuilder, 
  ComponentType 
} = require('discord.js');

const ongGames = new Map();

module.exports = {
  name: "rps",
  description: "Play rock paper scissors with friends or a bot via prefix.",
  category: "Games",

  async execute(message, args) {
    // Determine unique session container (Channel ID or DM User ID fallback)
    const channelId = message.channelId || message.author.id;

    // 1. PARSE ARGUMENTS
    let totalRounds = parseInt(args[0]);
    if (!totalRounds || isNaN(totalRounds) || totalRounds <= 0 || totalRounds > 10) {
      // Default to 3 rounds if invalid or unspecified to keep it user-friendly
      totalRounds = 3; 
    }

    if (ongGames.has(channelId)) {
      return message.reply({ 
        content: "There is already a game going on here. Try somewhere else maybe?" 
      }).catch(() => null);
    }

    // Attempt to extract mentioned opponent
    const targetUser = message.mentions.users.first();

    // 2. CONFIG OBJECT SETUP
    const game = {
      self: message.author.username,
      selfId: message.author.id,
      opp: "bot",
      oppId: "bot",
      isAccepted: false,
      channel: channelId,
      rounds: totalRounds,
      crntRound: 1,
      selfChoice: "TBD",
      oppChoice: "TBD",
      selfW: 0,
      oppW: 0,
      expiresAt: 120000 // 2 minutes
    };

    if (!targetUser) {
      game.opp = "bot";
      game.oppId = "bot";
      game.isAccepted = true;
    } else {
      if (targetUser.id === message.author.id) {
        return message.reply({ content: "Aww man, see this loner, play with the bot dude 🥀" }).catch(() => null);
      }
      if (targetUser.bot) {
        return message.reply({ content: "You can't play against external bots!" }).catch(() => null);
      }
      game.opp = targetUser.username;
      game.oppId = targetUser.id;
    }

    ongGames.set(channelId, game);

    // =======================================================
    // PHASE 1: MULTIPLAYER CHALLENGE LOBBY
    // =======================================================
    if (game.opp !== "bot") {
      const challEmbed = new EmbedBuilder()
        .setTitle("Challenge incoming!")
        .setDescription(`<@${targetUser.id}>, <@${message.author.id}> challenges you to a game of Rock, Paper and Scissors.\n\n**Rounds:** ${game.rounds}\nDo you wanna accept or decline?`)
        .setColor('#A20FB7')
        .setTimestamp();

      const challRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("accept").setLabel("Accept").setEmoji("✅").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("decline").setLabel("Decline").setEmoji("❌").setStyle(ButtonStyle.Danger)
      );

      const askMessage = await message.channel.send({
        content: `<@${targetUser.id}>`,
        embeds: [challEmbed],
        components: [challRow]
      }).catch(() => {
        ongGames.delete(channelId);
        return null;
      });

      if (!askMessage) return;

      try {
        const acceptInteraction = await askMessage.awaitMessageComponent({
          filter: i => i.user.id === targetUser.id,
          time: game.expiresAt
        });

        await acceptInteraction.deferUpdate();

        if (acceptInteraction.customId === "decline") {
          ongGames.delete(channelId);
          return askMessage.edit({ content: "Challenge declined!", embeds: [], components: [] }).catch(() => null);
        }

        game.isAccepted = true;
      } catch (err) {
        ongGames.delete(channelId);
        return askMessage.edit({ content: "⌛ Match timed out!", embeds: [], components: [] }).catch(() => null);
      }
    } else {
      const startMsg = await message.channel.send({ content: "🤖 Starting a match against Amaze Bot..." }).catch(() => null);
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (startMsg) await startMsg.delete().catch(() => null);
    }

    // =======================================================
    // PHASE 2: RUNTIME MULTI-ROUND GAME ENGINE
    // =======================================================
    runGameEngine(message, game, null);
  }
};

// --- CORE GAME ENGINE LOOP (PREFIX ROUTING) ---
async function runGameEngine(message, game, targetMessage = null) {
  const weapons = ['rock', 'paper', 'scissors'];
  const winConditions = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

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

  let gameMessage;
  try {
    if (!targetMessage) {
      gameMessage = await message.channel.send({
        embeds: [renderStatusEmbed()],
        components: [weaponRow]
      });
    } else {
      gameMessage = await targetMessage.edit({
        content: "",
        embeds: [renderStatusEmbed()],
        components: [weaponRow]
      });
    }
  } catch (err) {
    return ongGames.delete(game.channel);
  }

  // Use a standard message component collector pinned to the active message frame
  const collector = gameMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000 
  });

  collector.on('collect', async i => {
    const clickerId = i.user.id;

    if (clickerId !== game.selfId && clickerId !== game.oppId) {
      return i.reply({ content: "You aren't a participant in this duel!", ephemeral: true });
    }

    const selectedWeapon = i.customId.replace('p_', '');

    if (clickerId === game.selfId) {
      if (game.selfChoice !== 'TBD') return i.reply({ content: "Move already declared!", ephemeral: true });
      game.selfChoice = selectedWeapon;
    } 
    else if (clickerId === game.oppId) {
      if (game.oppChoice !== 'TBD') return i.reply({ content: "Move already declared!", ephemeral: true });
      game.oppChoice = selectedWeapon;
    }

    if (game.oppId === 'bot') {
      game.oppChoice = weapons[Math.floor(Math.random() * weapons.length)];
    }

    // Both choices locked in -> immediately stop the collector safely
    if (game.selfChoice !== 'TBD' && game.oppChoice !== 'TBD') {
      try {
        await i.deferUpdate();
      } catch {}
      return collector.stop('round_complete');
    }

    // Acknowledge single lock choices cleanly via ephemeral message
    try {
      await i.reply({ content: `You locked in **${selectedWeapon.toUpperCase()}**!`, ephemeral: true });
      await gameMessage.edit({ embeds: [renderStatusEmbed()] });
    } catch (err) {
      null; 
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason !== 'round_complete') {
      ongGames.delete(game.channel);
      return gameMessage.edit({ content: "🛑 Match canceled due to round selection inactivity.", embeds: [], components: [] }).catch(() => null);
    }

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

    game.selfChoice = 'TBD';
    game.oppChoice = 'TBD';

    const intermediateEmbed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle(`📊 Round ${game.crntRound} Settled!`)
      .setDescription(`${roundResult}\n\n🏆 **Current Match Standings:**\n• ${game.self}: **${game.selfW}**\n• ${game.opp}: **${game.oppW}**`)
      .setTimestamp();

    await gameMessage.edit({ embeds: [intermediateEmbed], components: [] }).catch(() => null);

    setTimeout(async () => {
      game.crntRound++;

      if (game.crntRound > game.rounds) {
        let finalWinner = "It's an ultimate tie match!";
        if (game.selfW > game.oppW) finalWinner = `👑 **${game.self} is the Ultimate Champion!**`;
        else if (game.oppW > game.selfW) finalWinner = `👑 **${game.opp} is the Ultimate Champion!**`;

        const finalEmbed = new EmbedBuilder()
          .setColor('#3498DB')
          .setTitle('🏁 Tournament Complete!')
          .setDescription(`🏆 **Final Results:**\n\n🥇 ${finalWinner}\n\n📊 **Final Statistics Matrix:**\n• ${game.self}: ${game.selfW} Wins\n• ${game.opp}: ${game.oppW} Wins`)
          .setTimestamp();

        ongGames.delete(game.channel);
        return gameMessage.edit({ embeds: [finalEmbed], components: [] }).catch(() => null);
      } else {
        runGameEngine(message, game, gameMessage);
      }
    }, 3500);
  });
}