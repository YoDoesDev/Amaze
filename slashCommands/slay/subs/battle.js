const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { universalGet } = require("../../../utils/database.js");
const { runBattleContext } = require("../../../utils/battle/engine.js");

const games = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("battle")
        .setDescription("Battle with another character.")
        .addUserOption(option => option.setName("opponent").setDescription("The user you want to battle.").setRequired(true)),
    cooldown: 10,
    async execute(interaction) {
        const opponentUser = interaction.options.getUser("opponent");

        if (games.has(interaction.channelId)) return interaction.editReply({ content: "A battle is already in progress here." });
        if (interaction.user.id === opponentUser.id) return interaction.editReply({ content: "You can't battle yourself." });

        const char = universalGet("characters", interaction.user.id);
        const char2 = universalGet("characters", opponentUser.id);

        if (!char) return interaction.editReply({ content: "You don't have a character setup yet." });
        if (!char2) return interaction.editReply({ content: "Your opponent doesn't have a character setup." });

        // Challenge phase
        const ask = new EmbedBuilder().setTitle("Battle Request").setDescription(`${interaction.user.username} has challenged ${opponentUser.username}!`);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("accept").setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("decline").setLabel("Decline").setStyle(ButtonStyle.Danger)
        );

        const challengeMessage = await interaction.editReply({ embeds: [ask], components: [row] });

        try {
            const select = await challengeMessage.awaitMessageComponent({ filter: i => i.user.id === opponentUser.id, time: 30000 });
            await select.update({ components: [] });
            if (select.customId !== "accept") return interaction.editReply({ content: "Challenge declined!" });
        } catch {
            return interaction.editReply({ content: "Timed out!", components: [] });
        }

        // Pass to Engine with user app webhook safety wrappers
        await runBattleContext({
            selfUser: interaction.user,
            oppUser: opponentUser,
            char1: char,
            char2: char2,
            games: games,
            channelId: interaction.channelId,
            sendInitial: (options) => interaction.followUp(options),
            updateMessage: (msg, options) => interaction.webhook.editMessage(msg.id, options)
        });
    }
};