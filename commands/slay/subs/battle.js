const {
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
    name: "battle",
    description: "Battle with another character.",
    cooldown: 10,
    aliases: ["fight", "duel", "b"],
    async execute(message, args) {
        const game = {
            channel: message.channel.id,
            isAccepted: false,
            self: {
                user: message.author,
                hp: null,
                str: null,
                dma: null,
                spd: null,
                xp: null,
            },
            opp: {
                user: message.mentions.users.first(),
                hp: null,
                str: null,
                dma: null,
                spd: null,
                xp: null,
            }
        };
        
        if (games.has(message.channel.id)) {
            return message.reply("A battle is already in progress in this channel.");
        }
        if (!game.opp.user) {
            return message.reply("You need to mention a user to battle with.");
        }
        if (game.self.user.id === game.opp.user.id) {
            return message.reply("You can't battle yourself.");
        }
        
        const char = universalGet("characters", game.self.user.id);
        const char2 = universalGet("characters", game.opp.user.id);
        
        if (!char) {
            return message.reply("You dont have a character to be able to battle yet. Use `!start` to create one.");
        }
        if (!char2) {
            return message.reply("The user you mentioned does not have a character to battle with.");
        }
        
        games.set(message.channel.id, game);
        try {
            const ask = new EmbedBuilder()
                .setColor("#006eff")
                .setTitle("Battle Request")
                .setDescription(`${game.self.user.username} has challenged ${game.opp.user.username} to a battle!`)
                .addFields({ name: "Accept", value: "Click the button below to accept the challenge." }, { name: "Decline", value: "Click the button below to decline the challenge." })
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
            
            const battleMessage = await message.channel.send({ embeds: [ask], components: [row] });
            try {
                const interaction = await battleMessage.awaitMessageComponent({
                    filter: i => i.user.id === game.opp.user.id,
                    time: 30000
                });
                
                game.isAccepted = interaction.customId === "accept";
                
                await interaction.update({
                    embeds: [ask],
                    components: []
                });
            }
            catch (err) {
                console.error(err);
                return battleMessage.edit({
                    content: `${game.opp.user.username} did not respond in time!`,
                    embeds: [],
                    components: []
                });
            }
            
            if (!game.isAccepted) {
                await battleMessage.edit({
                    content: `${game.opp.user.username} has declined the challenge!`,
                    embeds: [],
                    components: []
                });
                return;
            }
            
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
            const firstImage = await render(game.self, game.opp, 1);
            let lastImage, progression;
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
            
            const firstEmbed = new EmbedBuilder()
                .setDescription("The battle begins!")
                .setImage("attachment://battle.png")
                .setColor("#006eff")
            
            const battle = await message.channel.send({
                embeds: [firstEmbed],
                files: [firstImage]
            });
            
            while (!isBattleOver.result) {
                isBattleOver = takeTurn(game.self, game.opp);
                turns++;
                
                if (isBattleOver.result) {
                    await wait(400);
                    
                    lastImage = await render(game.self, game.opp, 3);
                    break;
                }
                
                if (turns % 4 === 0) {
                    await wait(400);
                    
                    progression = await render(game.self, game.opp, 2);
                    
                    const embed = new EmbedBuilder()
                        .setDescription(`Turn ${turns}`)
                        .setImage("attachment://battle.png")
                        .setColor("#006eff");
                    
                    await battle.edit({
                        embeds: [embed],
                        files: [progression]
                    });
                }
            }
            
            const winner = isBattleOver.winner;
            const loser = isBattleOver.loser;
            
            universalSet("characters", winner.user.id, {
                xp: winner.xp,
            });
            universalSet("characters", loser.user.id, {
                xp: loser.xp,
            });
            
            const resultEmbed = new EmbedBuilder()
                .setColor("#bcdf1f")
                .setTitle("Battle Result")
                .setDescription(`<@${winner.user.id}> has defeated <@${loser.user.id}>!`)
                .setImage(
                    "attachment://battle.png"
                );
            
            await battle.edit({ embeds: [resultEmbed], files: [lastImage] });
            
            await checkXP(winner.user.id);
            await checkXP(loser.user.id);
            
        } finally {
            games.delete(message.channel.id);
        }
    }
}