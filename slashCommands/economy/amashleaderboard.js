const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("amashleaderboard")
        .setDescription("Shows the amash leaderboard with server/global toggle")
        .setIntegrationTypes([0, 1]) // Supports both Guild and User installations
        .setContexts([0, 1, 2]),    // Accessible in Servers, Bot DMs, and Group DMs

    category: 'Economy',
    cooldown: 30,

    async execute(interaction) {
        const hasGuild = !!interaction.guild;
        const authorId = interaction.user.id;

        try {
            // =======================================================
            // 1. ONE-TIME DISK & NETWORK FETCHING (PRE-COMPILING)
            // =======================================================
            const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();

            // --- Pre-compile Global Text Stream ---
            const globalRows = allData.slice(0, 10);
            const globalList = globalRows.length
                ? globalRows.map((row, idx) => `**${idx + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`).join('\n')
                : 'No wealthy users found in this view.';

            // --- Pre-compile Server Text Stream (Safe-guard Context) ---
            let serverList = 'No wealthy users found in this view.';
            if (hasGuild) {
                const topIds = allData.map(r => r.userid);
                const fetchedMembers = await interaction.guild.members.fetch({ user: topIds }).catch(() => new Map());
                
                const serverRows = allData.filter(row => fetchedMembers.has(row.userid)).slice(0, 10);
                if (serverRows.length) {
                    serverList = serverRows.map((row, idx) => `**${idx + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`).join('\n');
                }
            }

            // =======================================================
            // 2. STATELESS RENDER UTILITIES
            // =======================================================
            const getButtons = (isGlobal) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('amash_server')
                        .setLabel('Server')
                        .setStyle(isGlobal ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(!isGlobal || !hasGuild), // Disable entirely outside of servers
                    new ButtonBuilder()
                        .setCustomId('amash_global')
                        .setLabel('Global')
                        .setStyle(!isGlobal ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(isGlobal)
                );
            };

            const renderEmbed = (isGlobal) => {
                const guildName = hasGuild ? interaction.guild.name : "Server";
                return new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Wealth Leaderboard` : `💰 ${guildName} Wealth Rankings`)
                    .setDescription(isGlobal ? globalList : serverList)
                    .setFooter({ text: `Requested By: ${interaction.user.username}` })
                    .setTimestamp();
            };

            // Automatically switch start layouts if context lacks server scope
            const defaultToGlobal = !hasGuild;
            
            const response = await interaction.editReply({ 
                embeds: [renderEmbed(defaultToGlobal)], 
                components: [getButtons(defaultToGlobal)] 
            });

            // =======================================================
            // 3. SECURE LOCAL COMPONENT COLLECTOR LOOP
            // =======================================================
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== authorId) {
                    return i.reply({ content: "This isn't your menu!", ephemeral: true });
                }

                try {
                    const showGlobal = i.customId === 'amash_global';
                    await i.update({ 
                        embeds: [renderEmbed(showGlobal)], 
                        components: [getButtons(showGlobal)] 
                    });
                } catch (err) {
                    console.error("LB Button Error:", err);
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            await interaction.editReply({ content: "The vault is currently locked due to an unexpected system exception.", embeds: [], components: [] }).catch(() => null);
        }
    }
};