const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
// FIXED: Swapped universalFetchAll for direct high-performance database execution
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'repleaderboard',
    category: 'Reputation',
    aliases: ['replb', 'rl'],
    cooldown: 30,
    description: 'Toggle between Global and Server rankings.',

    async execute(message) {
        try {
            // =======================================================
            // 1. HIGH-PERFORMANCE DISK EVALUATION (LIMIT 100 MAXIMUM)
            // =======================================================
            // Run a single, indexed query right at the start. Never copies the whole table.
            const top100Rows = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC LIMIT 100`).all();

            // --- Global Data Setup (Limit 10) ---
            const globalRows = top100Rows.slice(0, 10);
            const globalList = globalRows.length 
                ? globalRows.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                : "No data available for this view.";

            // --- Server Data Setup ---
            const potentialIds = top100Rows.map(r => r.userid);
            
            // Single API call to screen which of the top 100 global users are in this guild
            const fetchedMembers = await message.guild.members.fetch({ user: potentialIds, cache: false }).catch(() => new Map());
            
            let serverRows = [];
            for (const row of top100Rows) {
                if (serverRows.length >= 10) break;
                if (fetchedMembers.has(row.userid)) {
                    serverRows.push(row);
                }
            }

            const serverList = serverRows.length 
                ? serverRows.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                : "No data available for this view.";

            // =======================================================
            // 2. HELPER FUNCTION TO GENERATE COLD VIEW STRUCTURES
            // =======================================================
            const createLeaderboard = (isGlobal) => {
                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Reputation` : `🏆 ${message.guild.name} Rankings`)
                    .setDescription(isGlobal ? globalList : serverList)
                    .setFooter({ text: `Requested by ${message.author.username}` }) // Updated tag syntax
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
            const response = await message.reply(createLeaderboard(false));

            // =======================================================
            // 3. COLLECTOR LOOP (COMPLETELY LOCAL & INSTANTANEOUS)
            // =======================================================
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "This isn't your menu!", ephemeral: true });
                }

                try {
                    const isGlobal = i.customId === 'lb_global';
                    // Updates instantly in memory without querying the DB again!
                    await i.update(createLeaderboard(isGlobal));

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
