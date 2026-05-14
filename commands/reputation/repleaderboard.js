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
            // Function to generate the embed and buttons
            const createLeaderboard = async (isGlobal) => {
                const allData = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC LIMIT 100`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    const topIds = allData.map(r => r.userid);
                    const fetchedMembers = await message.guild.members.fetch({ user: topIds }).catch(() => new Map());
                    const guildMemberIds = Array.from(fetchedMembers.keys());
                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                const list = data.length 
                    ? data.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                    : "No data available for this view.";

                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Reputation` : `🏆 ${message.guild.name} Rankings`)
                    .setDescription(list)
                    .setFooter({ text: `Requested by ${message.author.tag}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_server')
                        .setLabel('Server')
                        .setStyle(isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(!isGlobal),
                    new ButtonBuilder()
                        .setCustomId('lb_global')
                        .setLabel('Global')
                        .setStyle(!isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(isGlobal)
                );

                return { embeds: [embed], components: [buttons] };
            };

            // Initial Send
            const initialBoard = await createLeaderboard(false);
            const response = await message.reply(initialBoard);

            // Collector
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                // 1. Safety Gate
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "This isn't your menu!", ephemeral: true });
                }

                try {
                    // 2. The Logic: Determine if Global was clicked
                    const isGlobal = i.customId === 'lb_global';
                    
                    // 3. Generate new content FIRST
                    const nextBoard = await createLeaderboard(isGlobal);

                    // 4. Update the message instantly
                    await i.update(nextBoard);

                } catch (error) {
                    console.error("Leaderboard Button Error:", error);
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: "Error updating leaderboard.", ephemeral: true });
                    }
                }
            });

            // Clean up buttons when done
            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(error);
            clearCooldown(message.author.id, module.exports);
            message.reply("Leaderboard error.");
        }
    }
};
