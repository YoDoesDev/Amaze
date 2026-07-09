// FIX: Import AttachmentBuilder alongside EmbedBuilder
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { render } = require("./renderer.js");
const { takeTurn } = require("./actions.js");
const { universalSet } = require("../database.js");
const { checkXP } = require("./leveling.js");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runBattleContext({ context, selfUser, oppUser, char1, char2, games, channelId, sendInitial, updateMessage }) {
    const game = {
        channel: channelId,
        self: { user: selfUser, hp: char1.hp, str: char1.str, dma: char1.dma, spd: char1.spd, xp: char1.xp },
        opp: { user: oppUser, hp: char2.hp, str: char2.str, dma: char2.dma, spd: char2.spd, xp: char2.xp }
    };

    games.set(channelId, game);

    try {
        const selfMaxHP = char1.hp || 1000;
        const oppMaxHP = char2.hp || 1000;

        let turns = 0;
        let isBattleOver = { result: false };
        let lastImage, progression;

        // Render Start
        let dynamicName = `battleStart.png`;
        const firstImage = await render(game.self, game.opp, 1, selfMaxHP, oppMaxHP);
        
        // FIX: Wrap the buffer securely using AttachmentBuilder
        const firstAttachment = new AttachmentBuilder(firstImage, { name: dynamicName });

        const firstEmbed = new EmbedBuilder()
            .setDescription("The battle begins!")
            .setImage(`attachment://${dynamicName}`)
            .setColor("#006eff");

        let battleMessage = await sendInitial({ embeds: [firstEmbed], files: [firstAttachment] });

        // Combat Engine Loop
        while (!isBattleOver.result) {
            isBattleOver = takeTurn(game.self, game.opp);
            turns++;

            if (isBattleOver.result) {
                await wait(400);
                lastImage = await render(game.self, game.opp, 3, selfMaxHP, oppMaxHP);
                dynamicName = `battleEnds.png`;
                break;
            }

            // Keep your smart rate-limit gate (only update every 4 turns)
            if (turns % 4 === 0) {
                await wait(400);
                progression = await render(game.self, game.opp, 2, selfMaxHP, oppMaxHP);
                dynamicName = `battle_${turns}.png`;
                
                // FIX: Wrap inside AttachmentBuilder
                const loopAttachment = new AttachmentBuilder(progression, { name: dynamicName });

                const loopEmbed = new EmbedBuilder()
                    .setTitle(`Battle in Progress...`)
                    .setDescription(`⚔️ **Turn ${turns}**\nBoth fighters are trading heavy blows!`)
                    .setImage(`attachment://${dynamicName}`)
                    .setColor("#006eff")
                    .setTimestamp();

                await updateMessage(battleMessage, { 
                    embeds: [loopEmbed], 
                    files: [loopAttachment] 
                });
            }
        }

        // Processing Results
        const winner = isBattleOver.winner;
        const loser = isBattleOver.loser;

        universalSet("characters", winner.user.id, { xp: winner.xp });
        universalSet("characters", loser.user.id, { xp: loser.xp });

        // FIX: Wrap the final output frame inside AttachmentBuilder
        const finalAttachment = new AttachmentBuilder(lastImage, { name: dynamicName });

        const resultEmbed = new EmbedBuilder()
            .setColor("#bcdf1f")
            .setTitle("Battle Result")
            .setDescription(`<@${winner.user.id}> has defeated <@${loser.user.id}>!`)
            .setImage(`attachment://${dynamicName}`);

        await updateMessage(battleMessage, { embeds: [resultEmbed], files: [finalAttachment] });

        await checkXP(winner.user.id);
        await checkXP(loser.user.id);

    } finally {
        games.delete(channelId);
    }
}

module.exports = { runBattleContext };
