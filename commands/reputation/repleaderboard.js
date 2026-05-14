const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/cooldowns.js");

module.exports = {
    name: 'repleaderboard',
    category: 'Reputation',
    aliases: ['replb', 'rl'],
    cooldown: 30,
    description: 'Toggle between Global and Server rankings.',

    async execute(message) {
        try {
            const createLeaderboard = async (isGlobal) => {
                // Fetch Top 100 to ensure we find enough server members
                const allData = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC LIMIT 100`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    const topIds = allData.map(r => r.userid);
                    // Targeted fetch: only the top 100 IDs
                    const fetchedMembers = await message.guild.members.fetch({ user: topIds }).catch(() => new Map());
                    const guildMemberIds = Array.from(fetchedMembers.keys());
                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                const list = data.length 
                    ? data.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                    : "No data available for this view.";

                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? 0xFEE75C : 0x5865F2)
                    .setTitle(isGlobal ? `🌐 Global Reputation` : `🏆 ${message.guild.name} Rankings`)
                    .setDescription(list)
                    .setFooter({ text: `Requested by ${message.author.tag}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('lb_server').setLabel('Server').setStyle(ButtonStyle.Primary).setDisabled(!isGlobal),
                    new ButtonBuilder().setCustomId('lb_global').setLabel('Global').setStyle(ButtonStyle.Secondary).setDisabled(isGlobal)
                );

                return { embeds: [embed], components: [buttons] };
            };

            const response = await message.reply(await createLeaderboard(false));
            const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async i => {
    // 1. Security Check
    if (i.user.id !== message.author.id) {
        return i.reply({ content: "Unauthorized.", ephemeral: true });
    }

    try {
        // 2. STOP THE CLOCK (Tells Discord: "Working on it!")
        await i.deferUpdate();

        // 3. Update the board
        const updatedBoard = await createLeaderboard(i.customId === 'lb_global');
        await i.editReply(updatedBoard); 

    } catch (error) {
        console.error("Leaderboard Button Error:", error);
    }
});


            collector.on('end', () => response.edit({ components: [] }).catch(() => null));
        } catch (error) {
            console.error(error);
            clearCooldown(message.author.id, module.exports);
            message.reply("Leaderboard error.");
        }
    }
};
