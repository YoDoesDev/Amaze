const { EmbedBuilder } = require("discord.js");
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
        const firstImage = await render(game.self, game.opp, 1, selfMaxHP, oppMaxHP);
        const firstEmbed = new EmbedBuilder()
            .setDescription("The battle begins!")
            .setImage("attachment://battle.png")
            .setColor("#006eff");

        let battleMessage = await sendInitial({ embeds: [firstEmbed], files: [firstImage] });

        // Combat Engine Loop
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

                await updateMessage(battleMessage, { embeds: [loopEmbed], files: [progression] });
            }
        }

        // Processing Results
        const winner = isBattleOver.winner;
        const loser = isBattleOver.loser;

        universalSet("characters", winner.user.id, { xp: winner.xp });
        universalSet("characters", loser.user.id, { xp: loser.xp });

        const resultEmbed = new EmbedBuilder()
            .setColor("#bcdf1f")
            .setTitle("Battle Result")
            .setDescription(`<@${winner.user.id}> has defeated <@${loser.user.id}>!`)
            .setImage("attachment://battle.png");

        await updateMessage(battleMessage, { embeds: [resultEmbed], files: [lastImage] });

        await checkXP(winner.user.id);
        await checkXP(loser.user.id);

    } finally {
        games.delete(channelId);
    }
}

module.exports = { runBattleContext };