const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("repleaderboard")
        .setDescription("View Global or Server-wide reputation rankings")
        .setIntegrationTypes([0, 1]) // Supports both Guild and User installs
        .setContexts([0, 1, 2]),    // Supports Guilds, Bot DMs, and Group DMs

    category: 'Reputation',
    cooldown: 30,

    async execute(interaction) {
        // 1. AVOID TIMEOUTS: Defer immediately before processing disk/network tasks
        await interaction.deferReply().catch(() => null);
        const authorId = interaction.user.id;
        const hasGuild = !!interaction.guild;

        try {
            // =======================================================
            // 2. HIGH-PERFORMANCE DISK EVALUATION
            // =======================================================
            const top100Rows = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC LIMIT 100`).all();

            // --- Pre-compile Global View Data (Limit 10) ---
            const globalRows = top100Rows.slice(0, 10);
            const globalList = globalRows.length 
                ? globalRows.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                : "No data available for this view.";

            // --- Pre-compile Server View Data (If inside a Guild context) ---
            let serverList = "No data available for this view.";
            if (hasGuild) {
                const potentialIds = top100Rows.map(r => r.userid);
                const fetchedMembers = await interaction.guild.members.fetch({ user: potentialIds, cache: false }).catch(() => new Map());
                
                let serverRows = [];
                for (const row of top100Rows) {
                    if (serverRows.length >= 10) break;
                    if (fetchedMembers.has(row.userid)) {
                        serverRows.push(row);
                    }
                }

                if (serverRows.length) {
                    serverList = serverRows.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n');
                }
            }

            // =======================================================
            // 3. HELPER FUNCTION TO GENERATE VIEW STRUCTURES
            // =======================================================
            const generateView = (isGlobal) => {
                const guildName = hasGuild ? interaction.guild.name : "Server";
                
                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Reputation` : `🏆 ${guildName} Rankings`)
                    .setDescription(isGlobal ? globalList : serverList)
                    .setFooter({ text: `Requested by ${interaction.user.username}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_server')
                        .setLabel('Server')
                        .setStyle(isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        // Disable server view button if not inside a guild
                        .setDisabled(!isGlobal || !hasGuild),
                    new ButtonBuilder()
                        .setCustomId('lb_global')
                        .setLabel('Global')
                        .setStyle(!isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(isGlobal)
                );

                return { embeds: [embed], components: [buttons] };
            };

            // If command is executed in DMs, default straight to Global view (true)
            const defaultToGlobal = !hasGuild;
            const response = await interaction.editReply(generateView(defaultToGlobal));

            // =======================================================
            // 4. COLLECTOR LOOP
            // =======================================================
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== authorId) {
                    return i.reply({ content: "This isn't your menu! Run `/repleaderboard` to see your own.", ephemeral: true });
                }

                try {
                    const isGlobal = i.customId === 'lb_global';
                    await i.update(generateView(isGlobal));
                } catch (error) {
                    console.error("Leaderboard Button Error:", error);
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error("Leaderboard Main Error:", error);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("An error occurred while loading the leaderboard.").catch(() => null);
        }
    }
};