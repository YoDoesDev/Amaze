const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("repleaderboard")
        .setDescription("View Global or Server-wide reputation rankings"),
    category: 'Reputation',
    cooldown: 30,

    async execute(interaction) {
        const authorId = interaction.user.id;

        try {
            // =======================================================
            // 1. HIGH-PERFORMANCE DISK EVALUATION (RUNS EXACTLY ONCE)
            // =======================================================
            // SQLite filters down to the top 100 rows natively on disk.
            const top100Rows = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC LIMIT 100`).all();

            // --- Pre-compile Global View Data (Limit 10) ---
            const globalRows = top100Rows.slice(0, 10);
            const globalList = globalRows.length 
                ? globalRows.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                : "No data available for this view.";

            // --- Pre-compile Server View Data ---
            const potentialIds = top100Rows.map(r => r.userid);
            
            // Single API call to check who from the global top 100 is present in this guild
            const fetchedMembers = await interaction.guild.members.fetch({ user: potentialIds, cache: false }).catch(() => new Map());
            
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
            // Pulls directly from pre-compiled string constants in memory
            const generateView = (isGlobal) => {
                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Reputation` : `🏆 ${interaction.guild.name} Rankings`)
                    .setDescription(isGlobal ? globalList : serverList)
                    .setFooter({ text: `Requested by ${interaction.user.username}` }) // Fixed .tag deprecation
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

            // Initial Send (Starts on Server view by default)
            const response = await interaction.editReply(generateView(false));

            // =======================================================
            // 3. COLLECTOR LOOP (COMPLETELY LOCAL & INSTANTANEOUS)
            // =======================================================
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                // Ensure only the person who ran the command can flip pages
                if (i.user.id !== authorId) {
                    return i.reply({ content: "This isn't your menu! Run `/repleaderboard` to see your own.", ephemeral: true });
                }

                try {
                    const isGlobal = i.customId === 'lb_global';
                    // Updates perfectly with 0 additional database overhead!
                    await i.update(generateView(isGlobal));

                } catch (error) {
                    console.error("Leaderboard Button Error:", error);
                }
            });

            // Clean up: Remove buttons when the collector expires (1 minute)
            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error("Leaderboard Main Error:", error);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("An error occurred while loading the leaderboard.");
        }
    }
};
