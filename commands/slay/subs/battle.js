const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { universalGet } = require("../../../utils/database.js");
const { runBattleContext } = require("../../../utils/battle/engine.js");

const games = new Map();

module.exports = {
    name: "battle",
    description: "Battle with another character using prefix command.",
    cooldown: 10,
    
    async execute(message, args) {
        const mention = args[0];
        let opponentUser;

        if (mention) {
            // FIX: Corrected regex token to safely grab numeric user IDs
            const matches = mention.match(/^<@!?(\d+)>/);
            const id = matches ? matches[1] : mention;
            opponentUser = await message.client.users.fetch(id).catch(() => null);
        }

        if (!opponentUser) {
            return message.reply("Please mention a valid user or provide their ID to battle. (e.g. `!battle @username`)");
        }

        const sessionKey = message.channelId || message.author.id;

        // Validation Rules
        if (games.has(sessionKey)) return message.reply("A battle is already in progress here.");
        if (message.author.id === opponentUser.id) return message.reply("You can't battle yourself.");

        const char = universalGet("characters", message.author.id);
        const char2 = universalGet("characters", opponentUser.id);

        if (!char) return message.reply("You don't have a character setup yet.");
        if (!char2) return message.reply("Your opponent doesn't have a character setup.");

        // Build Challenge Phase UI
        const ask = new EmbedBuilder()
            .setTitle("Battle Challenge")
            .setDescription(`${message.author} has challenged ${opponentUser} to a battle!`)
            .setColor("#ff4466")
            .setFooter({ text: "You have 30 seconds to accept or decline." });
            
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("accept").setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("decline").setLabel("Decline").setStyle(ButtonStyle.Danger)
        );

        const challengeMessage = await message.reply({ embeds: [ask], components: [row] });

        // Channel-level component collector works perfectly inside DMs too
        const collector = message.channel.createMessageComponentCollector({
            filter: i => i.user.id === opponentUser.id && i.message.id === challengeMessage.id,
            componentType: ComponentType.Button,
            time: 30000,
            max: 1 
        });

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
                return challengeMessage.edit({ content: "Challenge declined!", embeds: [], components: [] });
            }
        } catch (err) {
            return challengeMessage.edit({ content: "Timed out!", embeds: [], components: [] });
        }

        // Execution wrappers pass message instances safely whether it's a DM or a server channel
        await runBattleContext({
            selfUser: message.author,
            oppUser: opponentUser,
            char1: char,
            char2: char2,
            games: games,
            channelId: sessionKey,
            sendInitial: (options) => message.channel.send(options),
            updateMessage: (msg, options) => msg.edit(options)
        });
    }
};
