const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { universalGet } = require("../../../utils/database.js");
const { runBattleContext } = require("../../../utils/battle/engine.js");

const games = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("battle")
        .setDescription("Battle with another character.")
        .addUserOption(option => option.setName("opponent").setDescription("The user you want to battle.").setRequired(true))
        .setIntegrationTypes([0, 1]) // Allows deployment as a User App
        .setContexts([0, 1, 2]),    // Accessible in Servers, Bot DMs, and Group DMs
        
    cooldown: 10,
    
    async execute(interaction) {
        const opponentUser = interaction.options.getUser("opponent");
        const sessionKey = interaction.channelId || interaction.user.id;

        // Validation Checks
        if (games.has(sessionKey)) return interaction.editReply({ content: "A battle is already in progress here." });
        if (interaction.user.id === opponentUser.id) return interaction.editReply({ content: "You can't battle yourself." });

        const char = universalGet("characters", interaction.user.id);
        const char2 = universalGet("characters", opponentUser.id);

        if (!char) return interaction.editReply({ content: "You don't have a character setup yet." });
        if (!char2) return interaction.editReply({ content: "Your opponent doesn't have a character setup." });

        // Build Challenge Phase UI
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

        // Fallback for DM/User contexts where channel tracking might lack direct properties
        const channel = interaction.channel || await interaction.user.createDM().catch(() => null);
        if (!channel) return interaction.editReply({ content: "Unable to establish a secure interaction channel context." });

        // Create a rock-solid channel-level collector
        const collector = channel.createMessageComponentCollector({
            filter: i => i.user.id === opponentUser.id && i.message.id === challengeMessage.id,
            componentType: ComponentType.Button,
            time: 30000,
            max: 1 // Automatically stops collecting after the first click
        });

        // Wrap the collection sequence in a promise to control the code flow execution safely
        const getSelection = () => new Promise((resolve, reject) => {
            collector.on('collect', async (i) => {
                await i.update({ components: [] }).catch(() => null);
                resolve(i.customId);
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    reject(new Error('timeout'));
                }
            });
        });

        try {
            const customId = await getSelection();
            if (customId !== "accept") {
                return interaction.editReply({ content: "Challenge declined!", embeds: [], components: [] });
            }
        } catch (err) {
            // Clears components on a true, legitimate 30-second timeout expiration
            return interaction.editReply({ content: "Timed out!", embeds: [], components: [] });
        }

        // Pass to Engine with user app webhook safety wrappers
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