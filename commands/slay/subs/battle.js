const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { universalGet } = require("../utils/database.js");
const { runBattleContext } = require("../utils/battle/engine.js");

const games = new Map();

module.exports = {
    name: "battle",
    cooldown: 10,
    async execute(message, args) {
        const opponentUser = message.mentions.users.first();
        if (!opponentUser) return message.reply("Please mention a user to battle.");

        if (games.has(message.channelId)) return message.reply("A battle is already in progress here.");
        if (message.author.id === opponentUser.id) return message.reply("You can't battle yourself.");

        const char = universalGet("characters", message.author.id);
        const char2 = universalGet("characters", opponentUser.id);

        if (!char) return message.reply("You don't have a character setup yet.");
        if (!char2) return message.reply("The mentioned user doesn't have a character setup.");

        const ask = new EmbedBuilder()
            .setTitle("Battle Challenge")
            .setDescription(`${message.author.id} has challenged ${opponentUser.id} to a battle!`)
            .setColor(0xFF0000)
            .setFooter({ text: "You have 30 seconds to accept or decline." });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("accept").setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("decline").setLabel("Decline").setStyle(ButtonStyle.Danger)
        );

        const challengeMessage = await message.reply({ embeds: [ask], components: [row] });

        try {
            const select = await challengeMessage.awaitMessageComponent({ filter: i => i.user.id === opponentUser.id, time: 30000 });
            await select.update({ components: [] });
            if (select.customId !== "accept") return message.reply("Challenge declined!");
        } catch {
            return challengeMessage.edit({ content: "Timed out!", components: [] });
        }

        // Pass to Engine using standard message methods
        await runBattleContext({
            selfUser: message.author,
            oppUser: opponentUser,
            char1: char,
            char2: char2,
            games: games,
            channelId: message.channelId,
            sendInitial: (options) => message.channel.send(options),
            updateMessage: (msg, options) => msg.edit(options)
        });
    }
};