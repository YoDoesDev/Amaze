const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
// 1. FIXED: Imported your matrix utility functions
const { universalFetchAll } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'repleaderboard',
    category: 'Reputation',
    aliases: ['replb', 'rl'],
    cooldown: 30,
    description: 'Toggle between Global and Server rankings.',

    async execute(message) {
        try {
            // Helper function to generate the embed and buttons dynamically
            const createLeaderboard = async (isGlobal) => {
                // 2. Fetch all reputation rows and sort in-memory (ORDER BY DESC)
                const allData = universalFetchAll("reputation") || [];
                allData.sort((a, b) => b.points - a.points);
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    // Grab the top 100 global rows to screen for guild membership
                    const potentialTopRows = allData.slice(0, 100);
                    const topIds = potentialTopRows.map(r => r.userid);
                    
                    const fetchedMembers = await message.guild.members.fetch({ user: topIds }).catch(() => new Map());
                    const guildMemberIds = Array.from(fetchedMembers.keys());
                    
                    data = potentialTopRows.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
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

            // Initial Send (Starts on Server View)
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
                    
                    // 3. Generate new content FIRST using matrix updates
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
