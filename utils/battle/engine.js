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

        // Render Start Frame
        const firstImageRaw = await render(game.self, game.opp, 1, selfMaxHP, oppMaxHP);
        // FIX: Ensure we use Buffer.from() to cast the stream explicitly to prevent engine resolution failure
        const firstImage = Buffer.isBuffer(firstImageRaw) ? firstImageRaw : Buffer.from(firstImageRaw);
        const firstAttachment = new AttachmentBuilder(firstImage, { name: "battleStart.png" });

        const firstEmbed = new EmbedBuilder()
            .setDescription("The battle begins!")
            .setImage("attachment://battleStart.png")
            .setColor("#006eff");

        let battleMessage = await sendInitial({ embeds: [firstEmbed], files: [firstAttachment] });

        // Combat Engine Loop
        while (!isBattleOver.result) {
            isBattleOver = takeTurn(game.self, game.opp);
            turns++;

            if (isBattleOver.result) {
                await wait(400);
                const finalImageRaw = await render(game.self, game.opp, 3, selfMaxHP, oppMaxHP);
                lastImage = Buffer.isBuffer(finalImageRaw) ? finalImageRaw : Buffer.from(finalImageRaw);
                break;
            }

            // Smart rate-limit gate (only update visually every 4 turns)
            if (turns % 4 === 0) {
                await wait(400);
                const progressionRaw = await render(game.self, game.opp, 2, selfMaxHP, oppMaxHP);
                progression = Buffer.isBuffer(progressionRaw) ? progressionRaw : Buffer.from(progressionRaw);
                
                const turnImgName = `battle_turn_${turns}.png`;
                const loopAttachment = new AttachmentBuilder(progression, { name: turnImgName });

                const loopEmbed = new EmbedBuilder()
                    .setTitle(`Battle in Progress...`)
                    .setDescription(`⚔️ **Turn ${turns}**\nBoth fighters are trading heavy blows!`)
                    .setImage(`attachment://${turnImgName}`)
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

        const finalAttachment = new AttachmentBuilder(lastImage, { name: "battleEnds.png" });

        const resultEmbed = new EmbedBuilder()
            .setColor("#bcdf1f")
            .setTitle("Battle Result")
            .setDescription(`<@${winner.user.id}> has defeated <@${loser.user.id}>!`)
            .setImage("attachment://battleEnds.png");

        await updateMessage(battleMessage, { embeds: [resultEmbed], files: [finalAttachment] });

        await checkXP(winner.user.id);
        await checkXP(loser.user.id);

    } finally {
        games.delete(channelId);
    }
}

module.exports = { runBattleContext };
