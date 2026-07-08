const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

const {
    universalGet,
    universalSet,
} = require("../../../utils/database.js");

const {
    checkXP,
} = require("../../../utils/battle/leveling.js");

const {
    render,
} = require("../../../utils/battle/renderer.js");

const {
    takeTurn,
} = require("../../../utils/battle/actions.js");

const games = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("battle")
        .setDescription("Battle with another character.")
        .addUserOption(option =>{
            return option.setName("opponent")
                .setDescription("The user you want to battle.")
                .setRequired(true)
        }),
    cooldown: 10,
    async execute(interaction) {
        const opponentUser = interaction.options.getUser("opponent");

        const game = {
            channel: interaction.channelId,
            isAccepted: false,
            self: {
                user: interaction.user,
                hp: null,
                str: null,
                dma: null,
                spd: null,
                xp: null,
            },
            opp: {
                user: opponentUser,
                hp: null,
                str: null,
                dma: null,
                spd: null,
                xp: null,
            }
        };

        // 1. Initial Validations
        if (games.has(interaction.channelId)) {
            return interaction.editReply({ content: "A battle is already in progress in this channel." });
        }
        if (game.self.user.id === game.opp.user.id) {
            return interaction.editReply({ content: "You can't battle yourself." });
        }

        const char = universalGet("characters", game.self.user.id);
        const char2 = universalGet("characters", game.opp.user.id);

        if (!char) {
            return interaction.editReply({ content: "You don't have a character to be able to battle yet. Use `/start` to create one." });
        }
        if (!char2) {
            return interaction.editReply({ content: "The user you challenged does not have a character to battle with." });
        }

        // Reserve channel session
        games.set(interaction.channelId, game);

        try {
            // 2. Build Challenge Embed & Buttons
            const ask = new EmbedBuilder()
                .setColor("#006eff")
                .setTitle("Battle Request")
                .setDescription(`${game.self.user.username} has challenged ${game.opp.user.username} to a battle!`)
                .addFields(
                    { name: "Accept", value: "Click the button below to accept the challenge." },
                    { name: "Decline", value: "Click the button below to decline the challenge." }
                )
                .setFooter({ text: "You have 30 seconds to respond." });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("accept")
                        .setLabel("Accept")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("decline")
                        .setLabel("Decline")
                        .setStyle(ButtonStyle.Danger)
                );

            // Edit the deferred placeholder into the challenge notification
            const challengeMessage = await interaction.editReply({ 
                embeds: [ask], 
                components: [row]
            });

            let buttonInteraction;
            try {
                buttonInteraction = await challengeMessage.awaitMessageComponent({
                    filter: i => i.user.id === game.opp.user.id,
                    time: 30000
                });

                game.isAccepted = buttonInteraction.customId === "accept";

                // Clear buttons out right away on choice execution
                await buttonInteraction.update({
                    embeds: [ask],
                    components: []
                });
            } catch (err) {
                return await interaction.editReply({
                    content: `${game.opp.user.username} did not respond in time!`,
                    embeds: [],
                    components: []
                });
            }

            if (!game.isAccepted) {
                return await interaction.editReply({
                    content: `${game.opp.user.username} has declined the challenge!`,
                    embeds: [],
                    components: []
                });
            }

            // 3. Game State Initialization Setup
            Object.assign(game.self, {
                hp: char.hp,
                str: char.str,
                dma: char.dma,
                spd: char.spd,
                xp: char.xp,
            });

            Object.assign(game.opp, {
                hp: char2.hp,
                str: char2.str,
                dma: char2.dma,
                spd: char2.spd,
                xp: char2.xp,
            });

            let turns = 0;
            let isBattleOver = { result: false };
            
            //  FIX: Fetch character documents properly, pull max values safely
            const selfMaxHP = char.hp || 1000;
            const oppMaxHP = char2.hp || 1000;

            // Generate canvas entry asset frame
            const firstImage = await render(game.self, game.opp, 1, selfMaxHP, oppMaxHP);
            let lastImage, progression;
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

            const firstEmbed = new EmbedBuilder()
                .setDescription("The battle begins!")
                .setImage("attachment://battle.png")
                .setColor("#006eff");

            const battleMessage = await interaction.followUp({
                embeds: [firstEmbed],
                files: [firstImage]
            });

            // 4. Main Battle Pipeline Engine Loop
            while (!isBattleOver.result) {
                isBattleOver = takeTurn(game.self, game.opp);
                turns++;

                if (isBattleOver.result) {
                    await wait(400);
                    lastImage = await render(game.self, game.opp, 3, selfMaxHP, oppMaxHP);
                    break;
                }

                if (turns % 4 === 0) {
                    await wait(400);
                    progression = await render(game.self, game.opp, 2, selfMaxHP, oppMaxHP);

                    const loopEmbed = new EmbedBuilder()
                        .setDescription(`Turn ${turns}`)
                        .setImage("attachment://battle.png")
                        .setColor("#006eff");

                    //  FIX: Bypasses local message cache lookup 
                    await interaction.webhook.editMessage(battleMessage.id, {
                        embeds: [loopEmbed],
                        files: [progression]
                    });
                }
            }

            // 5. Wrap Up Result Processing Execution
            const winner = isBattleOver.winner;
            const loser = isBattleOver.loser;

            universalSet("characters", winner.user.id, { xp: winner.xp });
            universalSet("characters", loser.user.id, { xp: loser.xp });

            const resultEmbed = new EmbedBuilder()
                .setColor("#bcdf1f")
                .setTitle("Battle Result")
                .setDescription(`<@${winner.user.id}> has defeated <@${loser.user.id}>!`)
                .setImage("attachment://battle.png");

            //  FIX: Bypasses local message cache lookup
            await interaction.webhook.editMessage(battleMessage.id, { 
                embeds: [resultEmbed], 
                files: [lastImage] 
            });

            await checkXP(winner.user.id);
            await checkXP(loser.user.id);

        } finally {
            // Ensure session release execution clears regardless of operational crashes
            games.delete(interaction.channelId);
        }
    }
};
