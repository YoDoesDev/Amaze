const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { universalGet } = require("../../../utils/database.js");
const { runBattleContext } = require("../../../utils/battle/engine.js");

const games = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("battle")
        .setDescription("Battle with another character.")
        .addUserOption(option => option.setName("opponent").setDescription("The user you want to battle.").setRequired(true))
        // FIX 1: Explicitly allow the command to be used anywhere as a User App
        .setIntegrationTypes([0, 1]) 
        .setContexts([0, 1, 2]), 
    cooldown: 10,
    async execute(interaction) {
        const opponentUser = interaction.options.getUser("opponent");

        // FIX 2: Use interaction.channelId OR the user's ID as a fallback fallback map key 
        // because channelId can occasionally return null/undefined in external user contexts.
        const sessionKey = interaction.channelId || interaction.user.id;

        if (games.has(sessionKey)) return interaction.editReply({ content: "A battle is already in progress here." });
        if (interaction.user.id === opponentUser.id) return interaction.editReply({ content: "You can't battle yourself." });

        const char = universalGet("characters", interaction.user.id);
        const char2 = universalGet("characters", opponentUser.id);

        if (!char) return interaction.editReply({ content: "You don't have a character setup yet." });
        if (!char2) return interaction.editReply({ content: "Your opponent doesn't have a character setup." });

        // Challenge phase
        const ask = new EmbedBuilder()
            .setTitle("Battle Challenge")
            .setDescription(`${interaction.user} has challenged ${opponentUser} to a battle!`)
            .setColor(0xFF0000)
            .setFooter({ text: "You have 30 seconds to accept or decline." });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("accept").setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("decline").setLabel("Decline").setStyle(ButtonStyle.Danger)
        );

        const challengeMessage = await interaction.editReply({ embeds: [ask], components: [row] });

        try {
            // FIX 3: Component collectors on interaction replies can fail in cross-server user contexts.
            // Using the interaction webhook instead ensures Discord processes the component state securely.
            const select = await interaction.webhook.awaitMessageComponent({
                message: challengeMessage.id,
                filter: i => i.user.id === opponentUser.id,
                time: 30000
            });
            
            await select.update({ components: [] });
            if (select.customId !== "accept") return interaction.editReply({ content: "Challenge declined!" });
        } catch {
            return interaction.editReply({ content: "Timed out!", components: [] });
        }

        // Pass to Engine with perfect user app webhook safety wrappers
        await runBattleContext({
            selfUser: interaction.user,
            oppUser: opponentUser,
            char1: char,
            char2: char2,
            games: games,
            channelId: sessionKey,
            sendInitial: (options) => interaction.followUp(options),
            updateMessage: (msg, options) => interaction.webhook.editMessage(msg.id, options)
        });
    }
};