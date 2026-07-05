const { 
  SlashCommandBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder, 
  EmbedBuilder, 
  ComponentType 
} = require('discord.js');
const { emojis } = require('../../utils/config.js'); // Assuming this is present in your local directories
const ongGames = new Map();

module.exports = {
  // Update the data mapping setup for User-Installable Context frameworks
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock paper scissors with friends or a bot.")
    .addIntegerOption(option =>
      option.setName("rounds")
        .setDescription("Number of rounds to play (1-10)")
        .setRequired(true)
    )
    .addUserOption(option =>
      option.setName("opponent")
        .setDescription("The user you want to duel (leave blank to play against the bot)")
        .setRequired(false)
    )
    // Essential flags to make this work anywhere as a user command setup
    .setIntegrationTypes([0, 1]) // 0 = Guild Install, 1 = User Install
    .setContexts([0, 1, 2]),    // 0 = Guilds, 1 = Bot DMs, 2 = Group DMs / External Guilds

  category: "Games",
  cooldown: 10,

  async execute(interaction) {
    // Graceful fallback to interaction.channelId since interaction.channel can be null in User App installations
    const channelId = interaction.channelId || interaction.user.id;
    
    const totalRounds = interaction.options.getInteger("rounds");
    const targetUser = interaction.options.getUser("opponent");

    // 1. INPUT VALIDATION
    if (totalRounds <= 0 || totalRounds > 10) {
      return interaction.editReply({ 
        content: "Please keep the rounds between 1 and 10 to prevent channel spam!" 
      });
    }

    if (ongGames.has(channelId)) {
      return interaction.editReply({ 
        content: "There is already a game going on here. Try somewhere else maybe?" 
      });
    }

    // 2. CONFIG OBJECT SETUP
    const game = {
      self: interaction.user.username,
      selfId: interaction.user.id,
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
      selfAfk: 0,
      oppAfk: 0,
      expiresAt: 120000 // 2 minutes
    };

    if (!targetUser) {
      game.opp = "bot";
      game.oppId = "bot";
      game.isAccepted = true;
    } else {
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply({ content: "Aww man, see this loner, play with the bot dude 🥀" });
      }
      if (targetUser.bot) {
        return interaction.editReply({ content: "You can't play against external bots!" });
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
        .setDescription(`<@${targetUser.id}>, <@${interaction.user.id}> challenges you to a game of Rock, Paper and Scissors.\n\n**Rounds:** ${game.rounds}\nDo you wanna accept or decline?`)
        .setColor('#A20FB7')
        .setTimestamp();

      const challRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("accept").setLabel("Accept").setEmoji("✅").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("decline").setLabel("Decline").setEmoji("❌").setStyle(ButtonStyle.Danger)
      );

      const askMessage = await interaction.editReply({
        content: `<@${targetUser.id}>`,
        embeds: [challEmbed],
        components: [challRow]
      });

      try {
        const acceptInteraction = await askMessage.awaitMessageComponent({
          filter: i => i.user.id === targetUser.id,
          time: game.expiresAt
        });

        await acceptInteraction.deferUpdate();

        if (acceptInteraction.customId === "decline") {
          ongGames.delete(channelId);
          return interaction.editReply({ content: "Challenge declined!", embeds: [], components: [] });
        }

        game.isAccepted = true;
      } catch (err) {
        ongGames.delete(channelId);
        return interaction.editReply({ content: "⌛ Match timed out!", embeds: [], components: [] });
      }
    } else {
      await interaction.editReply({ content: "🤖 Starting a match against Amaze Bot..." }).catch(() => null);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // =======================================================
    // PHASE 2: RUNTIME MULTI-ROUND GAME ENGINE
    // =======================================================
    // Instead of deleting/sending new channel messages, we continuously use editReply
    runGameEngine(interaction, game);
  }
};

// --- CORE GAME ENGINE LOOP ---
async function runGameEngine(interaction, game) {
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

  // Safe approach for User Apps: We modify our interaction token directly
  const gameMessage = await interaction.editReply({
    content: "",
    embeds: [renderStatusEmbed()],
    components: [weaponRow]
  });

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
      await i.reply({ content: `You locked in **${selectedWeapon.toUpperCase()}**!`, ephemeral: true });
    } 
    else if (clickerId === game.oppId) {
      if (game.oppChoice !== 'TBD') return i.reply({ content: "Move already declared!", ephemeral: true });
      game.oppChoice = selectedWeapon;
      await i.reply({ content: `You locked in **${selectedWeapon.toUpperCase()}**!`, ephemeral: true });
    }

    if (game.oppId === 'bot') {
      game.oppChoice = weapons[Math.floor(Math.random() * weapons.length)];
    }

    await interaction.editReply({ embeds: [renderStatusEmbed()] }).catch(() => null);

    if (game.selfChoice !== 'TBD' && game.oppChoice !== 'TBD') {
      collector.stop('round_complete');
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason !== 'round_complete') {
      ongGames.delete(game.channel);
      return interaction.editReply({ content: "🛑 Match canceled due to round selection inactivity.", embeds: [], components: [] }).catch(() => null);
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

    await interaction.editReply({ embeds: [intermediateEmbed], components: [] }).catch(() => null);

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
        return interaction.editReply({ embeds: [finalEmbed], components: [] }).catch(() => null);
      } else {
        // Continuous looping on the interaction token ensures it works outside your native guilds!
        runGameEngine(interaction, game);
      }
    }, 3500);
  });
}
