const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    name: 'repleaderboard',
    aliases: ['replb', 'repboard', 'rl'],
    category: 'Reputation',
    cooldown: 30,
    description: 'View Global or Server-wide reputation rankings',

    async execute(message, args) {
        const authorId = message.author.id;
        const hasGuild = !!message.guild;

        // Since prefix commands aren't deferred by a global framework, send a quick loading placeholder
        const loadingMessage = await message.reply("Fetching reputation records...").catch(() => null);
        if (!loadingMessage) return;

        try {
            // =======================================================
            // 1. DISK DATA CAPTURE & COMPILATION
            // =======================================================
            const top100Rows = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC LIMIT 100`).all();

            // Pre-compile global strings
            const globalRows = top100Rows.slice(0, 10);
            const globalList = globalRows.length 
                ? globalRows.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                : "No data available for this view.";

            // Pre-compile server strings if executed inside a guild
            let serverList = "No data available for this view.";
            if (hasGuild) {
                const potentialIds = top100Rows.map(r => r.userid);
                const fetchedMembers = await message.guild.members.fetch({ user: potentialIds, cache: false }).catch(() => new Map());
                
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
            // 2. STATELESS RENDERING ARCHITECTURE
            // =======================================================
            const generateView = (isGlobal) => {
                const guildName = hasGuild ? message.guild.name : "Server";
                
                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Reputation` : `🏆 ${guildName} Rankings`)
                    .setDescription(isGlobal ? globalList : serverList)
                    .setFooter({ text: `Requested by ${message.author.username}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_server')
                        .setLabel('Server')
                        .setStyle(isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(!isGlobal || !hasGuild),
                    new ButtonBuilder()
                        .setCustomId('lb_global')
                        .setLabel('Global')
                        .setStyle(!isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(isGlobal)
                );

                return { content: null, embeds: [embed], components: [buttons] };
            };

            const defaultToGlobal = !hasGuild;
            await loadingMessage.edit(generateView(defaultToGlobal));

            // =======================================================
            // 3. COLLECTOR LOOP
            // =======================================================
            const collector = loadingMessage.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== authorId) {
                    return i.reply({ content: "This isn't your menu! Use the command yourself to see rankings.", ephemeral: true });
                }

                try {
                    const isGlobal = i.customId === 'lb_global';
                    await i.update(generateView(isGlobal));
                } catch (error) {
                    console.error("Reputation LB Button Error:", error);
                }
            });

            collector.on('end', () => {
                loadingMessage.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error("Reputation LB Prefix Error:", error);
            await loadingMessage.edit("An error occurred while processing the rankings dataset.").catch(() => null);
        }
    }
};